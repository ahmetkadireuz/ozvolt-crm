import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { sendMail, factuurMailHtml } from '@/lib/mail'
import { genereerFactuurPDF } from '@/lib/pdf-factuur'
import { zorgVoorMoneybirdFactuur } from '@/lib/moneybird-sync'
import { idealAan } from '@/lib/betalen'
import { tikkieAan, zorgVoorTikkie } from '@/lib/tikkie'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const factuurId = parseInt(id)

  const rows = await sql`
    SELECT f.*, kt.naam AS klant_naam, kt.email AS klant_email,
           kt.telefoon AS klant_telefoon, kt.locatie AS klant_adres,
           kt.type AS klant_type
    FROM facturen f JOIN klanten kt ON kt.id = f.klant_id
    WHERE f.id = ${factuurId}
  `
  const factuur = rows[0]
  if (!factuur) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  if (!factuur.klant_email) return NextResponse.json({ error: 'Geen e-mailadres' }, { status: 400 })

  const regels = Array.isArray(factuur.regels) ? factuur.regels : []
  const totalen = berekenTotalen(regels, 0, factuur.btw_pct)
  const vervalDatum = new Date(factuur.factuurdatum)
  vervalDatum.setDate(vervalDatum.getDate() + (factuur.betalingstermijn ?? 14))

  // iDEAL-link alleen meesturen als iDEAL aanstaat; standaard betaalt de klant direct via overschrijving
  const betaalUrl: string | null = idealAan() ? (factuur.betaal_url ?? null) : null

  await sql`UPDATE facturen SET status = 'verstuurd', bijgewerkt_op = NOW() WHERE id = ${factuurId}`

  // Tikkie voor het bedrag van déze (deel)factuur. Mislukt het, dan versturen we zonder Tikkie.
  let tikkieUrl: string | null = null
  let tikkieFout: string | null = null
  const oudeStijl5050 = !!factuur.betaling_50_50 && (factuur.soort ?? 'normaal') === 'normaal'
  if (tikkieAan() && !oudeStijl5050 && totalen.inclBtw > 0) {
    try {
      tikkieUrl = (await zorgVoorTikkie(factuurId)).url
    } catch (err) {
      tikkieFout = err instanceof Error ? err.message : String(err)
      console.error('[tikkie bij versturen]', tikkieFout)
      await sql`
        INSERT INTO admin_notifications (type, titel, bericht, link)
        VALUES ('tikkie_fout', ${`Tikkie niet aangemaakt: ${factuur.factuurnummer}`},
          ${`De factuur is verstuurd zonder Tikkie-link (${tikkieFout}). Maak hem eventueel opnieuw aan op het factuurscherm.`},
          ${`/facturen/${factuurId}`})
      `.catch(() => {})
    }
  }

  // Genereer PDF bijlage
  let pdfBuffer: Buffer | null = null
  try {
    pdfBuffer = await genereerFactuurPDF({
      factuurnummer: factuur.factuurnummer,
      klantNaam: factuur.klant_naam,
      klantEmail: factuur.klant_email,
      klantAdres: factuur.klant_adres,
      klantTelefoon: factuur.klant_telefoon,
      factuurdatum: factuur.factuurdatum,
      betalingstermijn: factuur.betalingstermijn ?? 14,
      regels,
      btwPct: Number(factuur.btw_pct ?? 21),
      notities: factuur.notities,
      status: 'verstuurd',
      betaalUrl,
      tikkieUrl,
    })
  } catch (e) {
    console.error('[pdf genereren]', e)
  }

  try {
    await sendMail({
      to: factuur.klant_email,
      subject: `Betaalnota ${factuur.factuurnummer} — Ozvolt Elektrotechniek`,
      html: factuurMailHtml({
        klantNaam: factuur.klant_naam,
        factuurNr: factuur.factuurnummer,
        bedrag: formatEuro(totalen.inclBtw),
        vervaldatum: vervalDatum.toLocaleDateString('nl-NL'),
        betaalUrl: betaalUrl ?? undefined,
        tikkieUrl: tikkieUrl ?? undefined,
      }),
      attachments: pdfBuffer
        ? [{ filename: `${factuur.factuurnummer}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
        : undefined,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  // Stap 2: automatisch syncen naar Moneybird zodat bankbetalingen (ABN AMRO) straks
  // gematcht kunnen worden. Niet-blokkerend: factuur in CRM staat al op verstuurd.
  let moneybirdResultaat: { synced: boolean; error?: string; moneybird_id?: string } = { synced: false }
  if (process.env.MONEYBIRD_API_TOKEN && process.env.MONEYBIRD_ADMIN_ID) {
    try {
      const mb = await zorgVoorMoneybirdFactuur(factuurId)
      moneybirdResultaat = { synced: true, moneybird_id: mb.moneybirdId }
    } catch (err) {
      console.error('[moneybird auto-sync na versturen]', err)
      moneybirdResultaat = { synced: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  return NextResponse.json({ ok: true, moneybird: moneybirdResultaat, tikkie: { url: tikkieUrl, fout: tikkieFout } })
}
