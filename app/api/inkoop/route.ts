import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { titel, klant_id, klus_id } = await req.json()
  if (!titel) return NextResponse.json({ error: 'Titel verplicht' }, { status: 400 })
  const rows = await sql`
    INSERT INTO inkoop_lijsten (titel, klant_id, klus_id)
    VALUES (${titel}, ${klant_id || null}, ${klus_id || null})
    RETURNING *
  `
  return NextResponse.json({ lijst: rows[0] })
}
