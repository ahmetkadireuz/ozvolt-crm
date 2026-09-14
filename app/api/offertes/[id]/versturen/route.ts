import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { sendMail, offerteMailHtml } from '@/lib/mail'
import { genereerOffertePDF } from '@/lib/pdf-offerte'
import { factuurTenaamstelling, factuurAdresTekst, documentLabel, documentLabelKlein } from '@/lib/utils'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)

  const rows = await sql`
    SELECT o.*, kt.naam AS klant_naam, kt.email AS klant_email,
           kt.telefoon AS klant_telefoon, kt.locatie AS klant_locatie,
           kt.factuur_naam, kt.factuur_adres, kt.factuur_postcode, kt.factuur_plaats
    FROM offertes o JOIN klanten kt ON kt.id = o.klant_id
    WHERE o.id = ${offerteId}
  `
  const offerte = rows[0]
  if (!offerte) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  if (!offerte.klant_email) return NextResponse.json({ error: 'Klant heeft geen e-mailadres' }, { status: 400 })

  const token = offerte.accept_token || crypto.randomBytes(32).toString('hex')
  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const acceptUrl = `${siteUrl}/offerte/${token}`

  await sql`UPDATE offertes SET accept_token = ${token}, sent_at = NOW(), status = 'gestuurd', bijgewerkt_op = NOW() WHERE id = ${offerteId}`

  // Optioneel werkafspraken meesturen
  const body = await req.json().catch(() => ({}))
  const inclAfspraak = !!body.inclAfspraak
  const afspraakId = body.afspraakId ? parseInt(String(body.afspraakId)) : null

  let werkafspraakUrl: string | undefined
  let werkafspraakNr: string | undefined
  if (inclAfspraak && afspraakId) {
    const aRows = await sql`SELECT afspraaknummer, accept_token FROM werkafspraken WHERE id = ${afspraakId} AND offerte_id = ${offerteId}`
    if (aRows[0]?.accept_token) {
      werkafspraakUrl = `${siteUrl}/werkafspraak/${aRows[0].accept_token}`
      werkafspraakNr = `OZWA-${String(aRows[0].afspraaknummer).padStart(4,'0')}`
      await sql`UPDATE werkafspraken SET sent_at = NOW(), status = 'gestuurd', bijgewerkt_op = NOW() WHERE id = ${afspraakId}`
    }
  }

  try {
    const regels = Array.isArray(offerte.regels) ? offerte.regels : []
    const { berekenTotalen, formatEuro } = await import('@/lib/utils')
    const korting = Number(offerte.korting_pct ?? 0)
    const btwPct = Number(offerte.btw_pct ?? 21)
    const totalen = berekenTotalen(regels, korting, btwPct)
    const offerteNr = `OZVT-${String(offerte.offertenummer).padStart(4,'0')}`
    const label = documentLabel(offerte.documenttype)
    const labelKlein = documentLabelKlein(offerte.documenttype)

    const klantVelden = {
      naam: offerte.klant_naam,
      locatie: offerte.klant_locatie,
      factuur_naam: offerte.factuur_naam,
      factuur_adres: offerte.factuur_adres,
      factuur_postcode: offerte.factuur_postcode,
      factuur_plaats: offerte.factuur_plaats,
    }

    // PDF als bijlage, zodat de klant het document kan bewaren en doorsturen
    // zonder eerst een link te hoeven openen. Mislukt dit, dan gaat de mail
    // alsnog de deur uit met alleen de ondertekenlink.
    let pdf: Buffer | null = null
    try {
      pdf = await genereerOffertePDF({
        offertenummer: offerteNr,
        klantNaam: factuurTenaamstelling(klantVelden),
        klantEmail: offerte.klant_email,
        klantAdres: factuurAdresTekst(klantVelden),
        klantTelefoon: offerte.klant_telefoon,
        datum: offerte.datum,
        geldigTot: offerte.geldig_tot,
        regels,
        korting,
        btwPct,
        notities: offerte.notities,
        geaccepteerdOp: offerte.accepted_at,
        geaccepteerdDoor: offerte.accepted_name,
        documenttype: offerte.documenttype,
      })
    } catch (err) {
      console.error('[offerte versturen] PDF-bijlage mislukt, mail gaat zonder bijlage:', err)
    }

    await sendMail({
      to: offerte.klant_email,
      subject: werkafspraakNr
        ? `${label} ${offerteNr} + werkafspraken — Ozvolt Elektrotechniek`
        : `Uw ${labelKlein} ${offerteNr} — Ozvolt Elektrotechniek`,
      html: offerteMailHtml({
        klantNaam: offerte.klant_naam,
        offerteNr,
        acceptUrl,
        betaalUrl: offerte.betaal_url || undefined,
        totaal: formatEuro(totalen.inclBtw),
        werkafspraakUrl,
        werkafspraakNr,
        label,
        labelKlein,
      }),
      attachments: pdf
        ? [{ filename: `${label} ${offerteNr}.pdf`, content: pdf, contentType: 'application/pdf' }]
        : undefined,
    })
    return NextResponse.json({ ok: true, bijlage: !!pdf })
  } catch (err: any) {
    console.error('[mail/offerte versturen]', err)
    const msg = err?.message ?? String(err)
    return NextResponse.json({ error: msg, detail: 'Controleer SMTP_HOST, SMTP_USER, SMTP_PASS env vars in Vercel' }, { status: 500 })
  }
}
