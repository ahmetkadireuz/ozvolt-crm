import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, naam, email } = body

  if (!token || !naam) return NextResponse.json({ error: 'Token en naam zijn verplicht' }, { status: 400 })

  const rows = await sql`SELECT id, accepted_at FROM werkafspraken WHERE accept_token = ${token}`
  const w = rows[0]
  if (!w) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  if (w.accepted_at) return NextResponse.json({ error: 'Al bevestigd' }, { status: 409 })

  const ip = req.headers.get('x-forwarded-for') ?? ''
  await sql`
    UPDATE werkafspraken SET
      status = 'geaccepteerd',
      accepted_at = NOW(),
      accepted_name = ${naam},
      accepted_email = ${email ?? null},
      accepted_ip = ${ip},
      bijgewerkt_op = NOW()
    WHERE accept_token = ${token}
  `
  return NextResponse.json({ ok: true })
}
