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

  // Zorg dat de tabel bestaat
  await sql`
    CREATE TABLE IF NOT EXISTS groenverklaringen (
      id            SERIAL PRIMARY KEY,
      klant_id      INTEGER NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
      naam          VARCHAR(255) NOT NULL,
      url           TEXT NOT NULL,
      aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
    )
  `

  let blobUrl: string
  try {
    const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '_')
    const blob = await put(`groenverklaring/${klant_id}/${Date.now()}-${safeName}`, file, { access: 'public' })
    blobUrl = blob.url
  } catch (err: any) {
    console.error('[groenverklaring upload]', err)
    return NextResponse.json({ error: 'Bestandsupload mislukt: ' + (err?.message ?? 'Vercel Blob fout') }, { status: 500 })
  }

  try {
    await sql`
      INSERT INTO groenverklaringen (klant_id, naam, url, aangemaakt_op)
      VALUES (${Number(klant_id)}, ${naam || file.name}, ${blobUrl}, NOW())
    `
  } catch (err: any) {
    console.error('[groenverklaring db]', err)
    return NextResponse.json({ error: 'Opslaan in database mislukt: ' + (err?.message ?? 'DB fout') }, { status: 500 })
  }

  return NextResponse.json({ url: blobUrl })
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
