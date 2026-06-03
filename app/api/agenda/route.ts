import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { titel, datum_start, datum_eind, notities, klant_id, klus_id } = await req.json()
  if (!titel || !datum_start) return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })

  const rows = await sql`
    INSERT INTO agenda_items (titel, datum_start, datum_eind, notities, klant_id, klus_id)
    VALUES (${titel}, ${datum_start}, ${datum_eind || null}, ${notities || null}, ${klant_id || null}, ${klus_id || null})
    RETURNING *
  `
  return NextResponse.json({ item: rows[0] })
}
