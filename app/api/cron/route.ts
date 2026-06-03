import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Vercel Cron Job — dagelijks uitvoeren
// Voeg in vercel.json toe: { "crons": [{ "path": "/api/cron", "schedule": "0 8 * * *" }] }

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
  }

  const resultaten: string[] = []

  // 1. Facturen te laat
  const teLaat = await sql`
    SELECT f.id, f.factuurnummer, k.naam AS klant_naam
    FROM facturen f
    JOIN klanten k ON k.id = f.klant_id
    WHERE f.status = 'verstuurd'
    AND f.factuurdatum + (f.betalingstermijn || ' days')::interval < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM admin_notifications
      WHERE type = 'factuur_te_laat' AND link = '/facturen/' || f.id::text
      AND aangemaakt_op > NOW() - INTERVAL '7 days'
    )
  `
  for (const f of teLaat) {
    await sql`
      INSERT INTO admin_notifications (type, titel, bericht, link)
      VALUES ('factuur_te_laat', ${`Factuur ${f.factuurnummer} te laat`},
        ${`${f.klant_naam} heeft factuur ${f.factuurnummer} nog niet betaald.`},
        ${`/facturen/${f.id}`})
    `
    resultaten.push(`factuur_te_laat: ${f.factuurnummer}`)
  }

  // 2. Klussen stilstand (7+ dagen geen update)
  const stilstand = await sql`
    SELECT k.id, k.type_werk, kt.naam AS klant_naam
    FROM klussen k
    JOIN klanten kt ON kt.id = k.klant_id
    WHERE k.status NOT IN ('afgerond')
    AND k.bijgewerkt_op < NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM admin_notifications
      WHERE type = 'klus_stilstand' AND link = '/klussen/' || k.id::text
      AND aangemaakt_op > NOW() - INTERVAL '7 days'
    )
  `
  for (const k of stilstand) {
    await sql`
      INSERT INTO admin_notifications (type, titel, bericht, link)
      VALUES ('klus_stilstand', ${`Klus staat 7 dagen stil`},
        ${`${k.klant_naam} — ${k.type_werk || 'Klus'} heeft al 7 dagen geen update.`},
        ${`/klussen/${k.id}`})
    `
    resultaten.push(`klus_stilstand: ${k.id}`)
  }

  // 3. Offertes verlopen
  const verlopen = await sql`
    SELECT o.id, o.offertenummer, k.naam AS klant_naam
    FROM offertes o
    JOIN klanten k ON k.id = o.klant_id
    WHERE o.status = 'gestuurd'
    AND o.geldig_tot < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM admin_notifications
      WHERE type = 'offerte_verlopen' AND link = '/offertes/' || o.id::text
      AND aangemaakt_op > NOW() - INTERVAL '3 days'
    )
  `
  for (const o of verlopen) {
    await sql`
      INSERT INTO admin_notifications (type, titel, bericht, link)
      VALUES ('offerte_verlopen', ${`Offerte AM-${o.offertenummer} verlopen`},
        ${`${o.klant_naam} heeft offerte AM-${o.offertenummer} niet geaccepteerd voor de deadline.`},
        ${`/offertes/${o.id}`})
    `
    // Update offerte status naar verlopen
    await sql`UPDATE offertes SET status = 'verlopen' WHERE id = ${o.id}`
    resultaten.push(`offerte_verlopen: ${o.offertenummer}`)
  }

  // 4. Afspraken morgen
  const morgen = await sql`
    SELECT a.id, a.titel, k.naam AS klant_naam
    FROM agenda_items a
    LEFT JOIN klanten k ON k.id = a.klant_id
    WHERE a.status = 'gepland'
    AND a.datum_start::date = CURRENT_DATE + INTERVAL '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM admin_notifications
      WHERE type = 'afspraak_morgen' AND link = '/agenda'
      AND aangemaakt_op::date = CURRENT_DATE
    )
  `
  for (const a of morgen) {
    await sql`
      INSERT INTO admin_notifications (type, titel, bericht, link)
      VALUES ('afspraak_morgen', ${`Afspraak morgen: ${a.titel}`},
        ${a.klant_naam ? `Met ${a.klant_naam}` : 'Zie agenda voor details.'},
        '/agenda')
    `
    resultaten.push(`afspraak_morgen: ${a.titel}`)
  }

  return NextResponse.json({ ok: true, resultaten })
}
