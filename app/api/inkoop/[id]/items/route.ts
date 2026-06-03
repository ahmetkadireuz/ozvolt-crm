import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { omschrijving, aantal, eenheid, leverancier } = await req.json()
  const rows = await sql`
    INSERT INTO inkoop_items (lijst_id, omschrijving, aantal, eenheid, leverancier)
    VALUES (${Number(params.id)}, ${omschrijving}, ${aantal}, ${eenheid}, ${leverancier || null})
    RETURNING *
  `
  return NextResponse.json({ item: rows[0] })
}
