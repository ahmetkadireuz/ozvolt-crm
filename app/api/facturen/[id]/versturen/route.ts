import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { sendMail, factuurMailHtml } from '@/lib/mail'
import { maakBetaalLink } from '@/lib/mollie'
import { genereerFactuurPDF } from '@/lib/pdf-factuur'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const factuurId = parseInt(id)

  const rows = await sql`
    SELECT f.*, kt.naam AS klant_naam, kt.email AS klant_email,
           kt.telefoon AS klant_telefoon, kt.locatie AS klant_adres
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

  // Zorg dat er een Mollie betaallink is
  let betaalUrl: string | null = factuur.betaal_url ?? null
  if (!betaalUrl && process.env.MOLLIE_API_KEY) {
    try {
      const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
      betaalUrl = await maakBetaalLink({
        bedrag: totalen.inclBtw,
        omschrijving: `Betaalnota ${factuur.factuurnummer} — ${factuur.klant_naam}`,
        redirectUrl: `${siteUrl}/betaling-ontvangen`,
        webhookUrl: `${siteUrl}/api/mollie/webhook`,
        metadata: { factuurId: String(factuurId), factuurNr: factuur.factuurnummer },
      })
      await sql`UPDATE facturen SET betaal_url = ${betaalUrl} WHERE id = ${factuurId}`
    } catch (e) {
      console.error('[mollie betaallink factuur]', e)
    }
  }

  await sql`UPDATE facturen SET status = 'verstuurd', bijgewerkt_op = NOW() WHERE id = ${factuurId}`

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
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
