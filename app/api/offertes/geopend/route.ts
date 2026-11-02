import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/session'
import { stuurPushMelding } from '@/lib/melding'

// De offertepagina (publieke link én klantportaal) meldt hier dat de klant hem opent.
// Alleen de eerste opening van een verstuurde offerte telt; daarna niets meer (geen spam).
// Linkvoorbeelden van WhatsApp/iMessage tellen niet mee: die voeren geen JavaScript uit.
export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}))
  if (typeof token !== 'string' || !/^[a-f0-9]{16,128}$/i.test(token)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Ahmet zelf (ingelogd in het CRM, bijv. via 'Bekijk in klantportaal') telt niet
  const admin = await getSession()
  if (admin?.loggedIn) return NextResponse.json({ ok: true, eigen: true })

  await sql`ALTER TABLE offertes ADD COLUMN IF NOT EXISTS geopend_op TIMESTAMPTZ`

  const rows = await sql`
    UPDATE offertes o SET geopend_op = NOW()
    FROM klanten k
    WHERE o.accept_token = ${token} AND k.id = o.klant_id
      AND o.geopend_op IS NULL AND o.status = 'gestuurd' AND o.accepted_at IS NULL
    RETURNING o.id, o.offertenummer, k.naam AS klant_naam
  `
  const o = rows[0]
  if (!o) return NextResponse.json({ ok: true })

  const offerteNr = `OZVT-${String(o.offertenummer).padStart(4, '0')}`
  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const titel = `👀 ${o.klant_naam} heeft offerte ${offerteNr} geopend`

  try {
    await sql`
      INSERT INTO admin_notifications (type, titel, bericht, link)
      VALUES ('offerte_geopend', ${titel}, ${'De klant bekijkt de offerte nu.'}, ${`/offertes/${o.id}`})
    `
  } catch (err) {
    console.error('[offerte geopend notificatie]', err)
  }
  await stuurPushMelding({ titel, bericht: 'De klant bekijkt de offerte nu.', link: `${siteUrl}/offertes/${o.id}` })

  return NextResponse.json({ ok: true })
}
