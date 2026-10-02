import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ensureSjablonenTabel, sjabloonUitRij } from '@/lib/offerte-sjablonen'
import { normaliseerUoItem } from '@/lib/uitgangspunten'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  await ensureSjablonenTabel()
  const { id } = await params
  const item = normaliseerUoItem(await req.json().catch(() => ({})))
  if (!item.titel.trim()) return NextResponse.json({ error: 'Geef het sjabloon een titel' }, { status: 400 })
  const rows = await sql`
    UPDATE offerte_sjablonen SET soort = ${item.soort}, titel = ${item.titel}, tekst = ${item.tekst}, meerprijs = ${item.meerprijs}
    WHERE id = ${parseInt(id)} RETURNING *
  `
  if (!rows[0]) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  return NextResponse.json({ sjabloon: sjabloonUitRij(rows[0]) })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  await ensureSjablonenTabel()
  const { id } = await params
  await sql`DELETE FROM offerte_sjablonen WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
