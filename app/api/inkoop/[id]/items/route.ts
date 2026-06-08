import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { omschrijving, artikelnummer, aantal, eenheid, leverancier, prijs_ex_btw } = body

    if (!omschrijving?.trim()) {
      return NextResponse.json({ error: 'Omschrijving is verplicht' }, { status: 400 })
    }

    // Zorg dat alle kolommen bestaan
    await sql`ALTER TABLE inkoop_items ADD COLUMN IF NOT EXISTS artikelnummer VARCHAR(100)`
    await sql`ALTER TABLE inkoop_items ADD COLUMN IF NOT EXISTS prijs_ex_btw NUMERIC`
    await sql`ALTER TABLE inkoop_items ADD COLUMN IF NOT EXISTS leverancier TEXT`

    const rows = await sql`
      INSERT INTO inkoop_items (lijst_id, omschrijving, artikelnummer, aantal, eenheid, leverancier, prijs_ex_btw)
      VALUES (
        ${Number(id)},
        ${omschrijving.trim()},
        ${artikelnummer?.trim() || null},
        ${Number(aantal) || 1},
        ${eenheid || 'stuk'},
        ${leverancier?.trim() || null},
        ${prijs_ex_btw != null && prijs_ex_btw !== '' ? Number(prijs_ex_btw) : null}
      )
      RETURNING *
    `
    return NextResponse.json({ item: rows[0] })
  } catch (err: any) {
    console.error('[inkoop items POST]', err)
    return NextResponse.json({ error: err.message ?? 'Onbekende fout' }, { status: 500 })
  }
}
