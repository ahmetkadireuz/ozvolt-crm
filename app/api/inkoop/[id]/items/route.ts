import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const { omschrijving, artikelnummer, aantal, eenheid, leverancier, prijs_ex_btw } = await req.json()

  const rows = await sql`
    INSERT INTO inkoop_items (lijst_id, omschrijving, artikelnummer, aantal, eenheid, leverancier, prijs_ex_btw)
    VALUES (
      ${Number(id)},
      ${omschrijving},
      ${artikelnummer || null},
      ${aantal},
      ${eenheid},
      ${leverancier || null},
      ${prijs_ex_btw ?? null}
    )
    RETURNING *
  `
  return NextResponse.json({ item: rows[0] })
}
