import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Zorg dat btw_pct kolom bestaat
  try {
    await sql`ALTER TABLE inkoop_lijsten ADD COLUMN IF NOT EXISTS btw_pct INTEGER NOT NULL DEFAULT 21`
  } catch {}

  const { titel, klant_id, klus_id, btw_pct } = await req.json()
  if (!titel) return NextResponse.json({ error: 'Titel verplicht' }, { status: 400 })

  const rows = await sql`
    INSERT INTO inkoop_lijsten (titel, klant_id, klus_id, btw_pct)
    VALUES (${titel}, ${klant_id || null}, ${klus_id || null}, ${btw_pct ?? 21})
    RETURNING *
  `
  return NextResponse.json({ lijst: rows[0] })
}
