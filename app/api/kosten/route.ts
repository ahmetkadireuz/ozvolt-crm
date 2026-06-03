import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { datum, categorie, leverancier, omschrijving, bedrag, klant_id, klus_id } = await req.json()
  if (!omschrijving || !bedrag) return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })

  const rows = await sql`
    INSERT INTO kosten (datum, categorie, leverancier, omschrijving, bedrag, klant_id, klus_id)
    VALUES (${datum}, ${categorie}, ${leverancier || null}, ${omschrijving}, ${bedrag}, ${klant_id || null}, ${klus_id || null})
    RETURNING *
  `
  return NextResponse.json({ kost: rows[0] })
}
