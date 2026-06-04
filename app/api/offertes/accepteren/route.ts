import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, naam, email } = body

  if (!token || !naam) {
    return NextResponse.json({ error: 'Token en naam zijn verplicht' }, { status: 400 })
  }

  const rows = await sql`
    SELECT o.id, o.status, o.accepted_at, o.klant_id
    FROM offertes o WHERE o.accept_token = ${token}
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

  return NextResponse.json({ ok: true })
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
