import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { sendMail, factuurMailHtml } from '@/lib/mail'
import { genereerFactuurPDF } from '@/lib/pdf-factuur'
import { zorgVoorMoneybirdFactuur } from '@/lib/moneybird-sync'
import { idealAan } from '@/lib/betalen'
import { tikkieVoorFactuur } from '@/lib/tikkie'

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

  await sql`UPDATE facturen SET status = 'verstuurd', bijgewerkt_op = NOW() WHERE id = ${factuurId}`

  // Betaallink: Tikkie (geld direct op de rekening) als die is ingesteld, anders iDEAL via
  // Moneybird als dat aanstaat. Zonder link betaalt de klant via overschrijving.
  let betaalUrl: string | null = null
  try { betaalUrl = await tikkieVoorFactuur(factuurId) } catch (err) { console.error('[tikkie bij versturen]', err) }
  if (!betaalUrl && idealAan()) betaalUrl = factuur.betaal_url ?? null

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
      }),
      attachments: pdfBuffer
        ? [{ filename: `${factuur.factuurnummer}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
        : undefined,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  // Stap 2: automatisch syncen naar Moneybird zodat bankbetalingen straks
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

  return NextResponse.json({ ok: true, moneybird: moneybirdResultaat })
}
