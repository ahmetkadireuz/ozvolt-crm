import { NextRequest, NextResponse } from 'next/server'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql } from '@/lib/db'

export async function PUT(req: NextRequest) {
  const klantId = await getKlantSessie()
  if (!klantId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { naam, email, telefoon, locatie } = await req.json()

  // Basis validatie
  if (!naam?.trim()) return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ongeldig e-mailadres' }, { status: 400 })
  }

  await sql`
    UPDATE klanten
    SET naam = ${naam.trim()},
        email = ${email?.trim() || null},
        telefoon = ${telefoon?.trim() || null},
        locatie = ${locatie?.trim() || null}
    WHERE id = ${klantId}
  `

  return NextResponse.json({ ok: true })
}
