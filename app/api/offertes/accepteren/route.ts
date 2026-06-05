import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import { sendMail, offerteBevestigingMailHtml } from '@/lib/mail'
import { maakBetaalLink } from '@/lib/mollie'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, naam, email } = body

  if (!token || !naam) {
    return NextResponse.json({ error: 'Token en naam zijn verplicht' }, { status: 400 })
  }

  const rows = await sql`
    SELECT o.id, o.status, o.accepted_at, o.klant_id, o.offertenummer, o.regels, o.korting_pct, o.btw_pct, o.accept_token,
           o.betaling_50_50, o.datum,
           k.naam AS klant_naam, k.email AS klant_email, k.telefoon AS klant_telefoon, k.type AS klant_type
    FROM offertes o JOIN klanten k ON k.id = o.klant_id
    WHERE o.accept_token = ${token}
  `
  const offerte = rows[0]
  if (!offerte) return NextResponse.json({ error: 'Offerte niet gevonden' }, { status: 404 })
  if (offerte.accepted_at) return NextResponse.json({ error: 'Al geaccepteerd' }, { status: 409 })

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? ''

  await sql`
    UPDATE offertes SET
      status = 'geaccepteerd',
      accepted_at = NOW(),
      accepted_name = ${naam},
      accepted_email = ${email ?? null},
      accepted_ip = ${ip},
      bijgewerkt_op = NOW()
    WHERE accept_token = ${token}
  `

  const regels = Array.isArray(offerte.regels) ? offerte.regels : JSON.parse(offerte.regels ?? '[]')
  const totalen = berekenTotalen(regels, Number(offerte.korting_pct ?? 0), Number(offerte.btw_pct ?? 21))
  const offerteNr = `OZVT-${String(offerte.offertenummer).padStart(4, '0')}`
  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'

  // Notificatie aanmaken zodat admin direct ziet dat offerte getekend is
  await sql`
    INSERT INTO admin_notifications (type, titel, bericht, link)
    VALUES (
      'offerte_geaccepteerd',
      ${`✅ ${offerte.klant_naam} heeft offerte ${offerteNr} geaccepteerd`},
      ${`Ondertekend door: ${naam}${email ? ` (${email})` : ''}`},
      ${`/offertes/${offerte.id}`}
    )
  `

  // Maak automatisch Mollie betaallink(s) aan na ondertekening
  let betaalUrl: string | null = null
  let betaalUrl2: string | null = null
  if (process.env.MOLLIE_API_KEY) {
    try {
      const webhookUrl = `${siteUrl}/api/mollie/webhook`

      if (offerte.betaling_50_50) {
        const halveBedrag = totalen.inclBtw / 2
        const [url1, url2] = await Promise.all([
          maakBetaalLink({
            bedrag: halveBedrag,
            omschrijving: `${offerteNr} — eerste termijn (50%) — ${offerte.klant_naam}`,
            redirectUrl: `${siteUrl}/betaling-ontvangen`,
            webhookUrl,
            metadata: { offerteId: String(offerte.id), termijn: '1', offerteNr },
          }),
          maakBetaalLink({
            bedrag: halveBedrag,
            omschrijving: `${offerteNr} — tweede termijn (50%) — ${offerte.klant_naam}`,
            redirectUrl: `${siteUrl}/betaling-ontvangen`,
            webhookUrl,
            metadata: { offerteId: String(offerte.id), termijn: '2', offerteNr },
          }),
        ])
        betaalUrl = url1
        betaalUrl2 = url2
        await sql`UPDATE offertes SET betaal_url = ${betaalUrl}, betaal_url_2 = ${betaalUrl2}, bijgewerkt_op = NOW() WHERE id = ${offerte.id}`
      } else {
        betaalUrl = await maakBetaalLink({
          bedrag: totalen.inclBtw,
          omschrijving: `${offerteNr} — ${offerte.klant_naam}`,
          redirectUrl: `${siteUrl}/betaling-ontvangen`,
          webhookUrl,
          metadata: { offerteId: String(offerte.id), offerteNr },
        })
        await sql`UPDATE offertes SET betaal_url = ${betaalUrl}, bijgewerkt_op = NOW() WHERE id = ${offerte.id}`
      }
    } catch (err) {
      console.error('[mollie betaallink na acceptatie]', err)
      // Niet fataal — betaallink kan later handmatig aangemaakt worden
    }
  }

  // Stuur bevestigingsemail naar Ozvolt
  try {
    const notifEmail = process.env.NOTIF_EMAIL ?? 'financien@ozvoltelektro.nl'
    const crmUrl = `${siteUrl}/offertes/${offerte.id}`
    await sendMail({
      to: notifEmail,
      subject: `✅ ${offerte.klant_naam} heeft offerte ${offerteNr} getekend!`,
      html: offerteBevestigingMailHtml({
        klantNaam: offerte.klant_naam,
        offerteNr,
        acceptedName: naam,
        acceptUrl: crmUrl,
        totaal: formatEuro(totalen.inclBtw),
      }),
    })
  } catch (err) {
    console.error('[bevestiging mail]', err)
  }

  return NextResponse.json({
    ok: true,
    betaal_url: betaalUrl,
    betaal_url_2: betaalUrl2,
    betaling_50_50: !!offerte.betaling_50_50,
  })
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Geen token' }, { status: 400 })

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email
    FROM offertes o JOIN klanten k ON k.id = o.klant_id
    WHERE o.accept_token = ${token}
  `
  const o = rows[0]
  if (!o) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  return NextResponse.json({
    id: o.id,
    offertenummer: o.offertenummer,
    status: o.status,
    datum: o.datum,
    klant_naam: o.klant_naam,
    klant_email: o.klant_email,
    accepted_at: o.accepted_at,
    accepted_name: o.accepted_name,
  })
}
