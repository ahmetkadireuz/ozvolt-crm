import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ensureFactuurKolommen, isGesplitst } from '@/lib/facturen'

const VALID_STATUSES = ['concept','verstuurd','betaald','te_laat']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const factuurId = parseInt(id)
  const body = await req.json()

  if (body.status && VALID_STATUSES.includes(body.status)) {
    await sql`UPDATE facturen SET status = ${body.status}, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    return NextResponse.json({ ok: true })
  }

  await ensureFactuurKolommen()
  const huidig = (await sql`SELECT soort FROM facturen WHERE id = ${factuurId}`)[0]
  if (!huidig) return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 })

  // Voorschot-/eindfactuur: regels en btw liggen vast (ze horen bij de andere helft van de splitsing).
  // Alleen datum, betalingstermijn en notities zijn nog te wijzigen.
  if (isGesplitst(huidig)) {
    if (body.regels !== undefined || body.btw_pct !== undefined) {
      return NextResponse.json({
        error: 'Gesplitste factuur: maak de splitsing ongedaan om regels te wijzigen. Herlaad de pagina en probeer het opnieuw.',
        gesplitst: true,
      }, { status: 409 })
    }
    const bijgewerkt = await sql`
      UPDATE facturen SET
        factuurdatum = ${body.factuurdatum},
        betalingstermijn = ${body.betalingstermijn ?? 14},
        notities = ${body.notities || null},
        bijgewerkt_op = NOW()
      WHERE id = ${factuurId}
      RETURNING regels, btw_pct
    `
    // Voorschotfactuur: opslaan = open en zichtbaar voor de klant (zoals een gewone factuur).
    // De eindfactuur blijft concept tot hij na oplevering bewust wordt verstuurd.
    if (huidig.soort === 'voorschot' && berekenTotalen(bijgewerkt[0]?.regels ?? [], 0, Number(bijgewerkt[0]?.btw_pct ?? 21)).inclBtw > 0) {
      await sql`UPDATE facturen SET status = 'verstuurd' WHERE id = ${factuurId} AND status = 'concept'`
    }
    return NextResponse.json({ ok: true })
  }

  const regels = Array.isArray(body.regels) ? body.regels : []
  const btw = Number(body.btw_pct ?? 21)

  // De klant van een factuur komt van het project en wordt hier niet los gewijzigd.
  // soort = 'normaal' in de WHERE: een gelijktijdige splitsing kan niet alsnog overschreven worden.
  await sql`
    UPDATE facturen SET
      factuurdatum = ${body.factuurdatum},
      betalingstermijn = ${body.betalingstermijn ?? 14},
      regels = ${JSON.stringify(regels)}::jsonb,
      btw_pct = ${btw},
      notities = ${body.notities || null},
      bijgewerkt_op = NOW()
    WHERE id = ${factuurId} AND soort = 'normaal'
  `
  // Opgeslagen factuur met een bedrag = open en direct zichtbaar in het klantportaal
  // (geen handmatige stap 'verstuurd' meer nodig)
  if (berekenTotalen(regels, 0, btw).inclBtw > 0) {
    await sql`UPDATE facturen SET status = 'verstuurd' WHERE id = ${factuurId} AND status = 'concept' AND soort = 'normaal'`
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  await sql`DELETE FROM facturen WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
