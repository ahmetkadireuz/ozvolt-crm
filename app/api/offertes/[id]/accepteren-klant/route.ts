import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import { sendMail, offerteBevestigingMailHtml } from '@/lib/mail'
import { getKlantSessie } from '@/lib/klant-sessie'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const klantId = await getKlantSessie()
  if (!klantId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const offerteId = parseInt(id)
  if (!offerteId) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const naam = String(body?.naam ?? '').trim()
  if (!naam) return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })

  // Offerte ophalen — alleen van eigen klant en alleen als verstuurd (geen concept)
  const rows = await sql`
    SELECT o.id, o.status, o.accepted_at, o.klant_id, o.offertenummer, o.regels,
           o.korting_pct, o.btw_pct,
           k.naam AS klant_naam, k.email AS klant_email
    FROM offertes o JOIN klanten k ON k.id = o.klant_id
    WHERE o.id = ${offerteId} AND o.klant_id = ${klantId}
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
      accepted_email = ${offerte.klant_email ?? null},
      accepted_ip = ${ip},
      bijgewerkt_op = NOW()
    WHERE id = ${offerteId}
  `

  const regels = Array.isArray(offerte.regels) ? offerte.regels : JSON.parse(offerte.regels ?? '[]')
  const totalen = berekenTotalen(regels, Number(offerte.korting_pct ?? 0), Number(offerte.btw_pct ?? 21))
  const offerteNr = `OZVT-${String(offerte.offertenummer).padStart(4, '0')}`
  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'

  await sql`
    INSERT INTO admin_notifications (type, titel, bericht, link)
    VALUES (
      'offerte_geaccepteerd',
      ${`✅ ${offerte.klant_naam} heeft offerte ${offerteNr} geaccepteerd`},
      ${`Ondertekend via klantportaal door: ${naam}`},
      ${`/offertes/${offerte.id}`}
    )
  `

  // Bevestiging naar Ozvolt
  try {
    const notifEmail = process.env.NOTIF_EMAIL ?? 'financien@ozvoltelektro.nl'
    await sendMail({
      to: notifEmail,
      subject: `✅ ${offerte.klant_naam} heeft offerte ${offerteNr} getekend!`,
      html: offerteBevestigingMailHtml({
        klantNaam: offerte.klant_naam,
        offerteNr,
        acceptedName: naam,
        acceptUrl: `${siteUrl}/offertes/${offerte.id}`,
        totaal: formatEuro(totalen.inclBtw),
      }),
    })
  } catch (err) {
    console.error('[bevestiging mail]', err)
  }

  // Bevestiging naar klant (zelfde info, klant-vriendelijk)
  if (offerte.klant_email) {
    try {
      await sendMail({
        to: offerte.klant_email,
        subject: `Bevestiging — offerte ${offerteNr} geaccepteerd`,
        html: klantBevestigingHtml({
          klantNaam: offerte.klant_naam,
          offerteNr,
          totaal: formatEuro(totalen.inclBtw),
          portaalUrl: `${siteUrl}/klant/dashboard`,
        }),
      })
    } catch (err) {
      console.error('[klant bevestiging mail]', err)
    }
  }

  return NextResponse.json({ ok: true })
}

function klantBevestigingHtml(params: { klantNaam: string; offerteNr: string; totaal: string; portaalUrl: string }) {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0d1b3e;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#0d1b3e;">Bedankt, ${params.klantNaam}!</h2>
    <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 18px;">
      Wij hebben uw akkoord op offerte <strong>${params.offerteNr}</strong> in goede orde ontvangen.
      De totale waarde bedraagt <strong>${params.totaal}</strong> incl. BTW.
    </p>
    <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 18px;">
      Wij nemen op korte termijn contact met u op om de werkzaamheden in te plannen.
      U kunt het overzicht van uw projecten, offertes en facturen altijd terugzien in uw klantportaal.
    </p>
    <a href="${params.portaalUrl}" style="display:inline-block;background:#0d1b3e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">Open klantportaal</a>
    <p style="margin-top:32px;font-size:12px;color:#94a3b8;">
      Met vriendelijke groet,<br>
      Ozvolt Elektrotechniek
    </p>
  </div>
  `
}
