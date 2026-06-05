import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { maakBetaalLink } from '@/lib/mollie'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const factuurId = parseInt(id)

  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam
    FROM facturen f JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${factuurId}
  `
  const factuur = rows[0]
  if (!factuur) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const regels = Array.isArray(factuur.regels) ? factuur.regels : []
  const totalen = berekenTotalen(regels, 0, factuur.btw_pct)
  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'

  try {
    const betaalUrl = await maakBetaalLink({
      bedrag: totalen.inclBtw,
      omschrijving: `Betaalnota ${factuur.factuurnummer} — ${factuur.klant_naam}`,
      redirectUrl: `${siteUrl}/betaling-ontvangen`,
      metadata: { factuurId: String(factuurId), factuurNr: factuur.factuurnummer },
    })

    await sql`UPDATE facturen SET betaal_url = ${betaalUrl}, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    return NextResponse.json({ ok: true, betaalUrl })
  } catch (err: any) {
    console.error('[mollie factuur betaallink]', err)
    return NextResponse.json({ error: err?.message ?? 'Mollie fout' }, { status: 500 })
  }
}
