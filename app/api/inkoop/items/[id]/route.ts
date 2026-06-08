import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const itemId = Number(id)
  const body = await req.json()

  // Checkbox-only update
  if (typeof body.afgevinkt === 'boolean' && Object.keys(body).length === 1) {
    await sql`UPDATE inkoop_items SET afgevinkt = ${body.afgevinkt} WHERE id = ${itemId}`
    return NextResponse.json({ ok: true })
  }

  // Haal huidig item op en merge
  const rows = await sql`SELECT * FROM inkoop_items WHERE id = ${itemId}`
  if (!rows[0]) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  const cur = rows[0]

  const omschrijving = body.omschrijving ?? cur.omschrijving
  const artikelnummer = body.artikelnummer !== undefined ? (body.artikelnummer || null) : cur.artikelnummer
  const aantal = body.aantal ?? cur.aantal
  const eenheid = body.eenheid ?? cur.eenheid
  const leverancier = body.leverancier !== undefined ? (body.leverancier || null) : cur.leverancier
  const prijs_ex_btw = body.prijs_ex_btw !== undefined ? (body.prijs_ex_btw ?? null) : cur.prijs_ex_btw
  const afgevinkt = body.afgevinkt ?? cur.afgevinkt

  await sql`
    UPDATE inkoop_items
    SET omschrijving = ${omschrijving}, artikelnummer = ${artikelnummer},
        aantal = ${aantal}, eenheid = ${eenheid}, leverancier = ${leverancier},
        prijs_ex_btw = ${prijs_ex_btw}, afgevinkt = ${afgevinkt}
    WHERE id = ${itemId}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  await sql`DELETE FROM inkoop_items WHERE id = ${Number(id)}`
  return NextResponse.json({ ok: true })
}
