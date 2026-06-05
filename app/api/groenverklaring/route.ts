import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { sql } from '@/lib/db'
import { put } from '@vercel/blob'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const klant_id = form.get('klant_id') as string | null
  const naam = form.get('naam') as string | null

  if (!file || !klant_id) return NextResponse.json({ error: 'Bestand en klant_id vereist' }, { status: 400 })

  const blob = await put(`groenverklaring/${klant_id}/${Date.now()}-${file.name}`, file, { access: 'public' })

  await sql`
    INSERT INTO groenverklaringen (klant_id, naam, url, aangemaakt_op)
    VALUES (${Number(klant_id)}, ${naam ?? file.name}, ${blob.url}, NOW())
  `
  return NextResponse.json({ url: blob.url })
}

export async function GET(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const klant_id = req.nextUrl.searchParams.get('klant_id')
  if (!klant_id) return NextResponse.json({ error: 'klant_id vereist' }, { status: 400 })

  const rows = await sql`SELECT * FROM groenverklaringen WHERE klant_id = ${Number(klant_id)} ORDER BY aangemaakt_op DESC`
  return NextResponse.json(rows)
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await req.json()
  await sql`DELETE FROM groenverklaringen WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
