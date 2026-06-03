import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { klant_id, bericht } = await req.json()
  if (!klant_id || !bericht) return NextResponse.json({ error: 'Klant en bericht verplicht' }, { status: 400 })

  const klantRows = await sql`SELECT id, naam, telefoon FROM klanten WHERE id = ${Number(klant_id)}`
  const klant = klantRows[0]
  if (!klant) return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })

  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const version = process.env.WHATSAPP_GRAPH_VERSION ?? 'v25.0'

  if (!token || !phoneId) {
    return NextResponse.json({ error: 'WhatsApp API niet geconfigureerd. Stel WHATSAPP_ACCESS_TOKEN en WHATSAPP_PHONE_NUMBER_ID in.' }, { status: 503 })
  }

  // Formateer telefoonnummer
  let tel = klant.telefoon.replace(/[^0-9]/g, '')
  if (tel.startsWith('0')) tel = '31' + tel.slice(1)

  const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: tel,
      type: 'text',
      text: { body: bericht },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message ?? 'Versturen mislukt' }, { status: 400 })
  }

  // Sla op in database
  await sql`
    INSERT INTO whatsapp_messages (klant_id, direction, body, status, to_number)
    VALUES (${Number(klant_id)}, 'outbound', ${bericht}, 'sent', ${tel})
  `

  return NextResponse.json({ ok: true })
}
