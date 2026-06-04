import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Geen bestand' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const filename = `offertes/${offerteId}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, '_')}`

  const blob = await put(filename, file, { access: 'public', contentType: file.type || 'application/pdf' })

  // Bijlage opslaan in DB
  const rows = await sql`SELECT bijlagen FROM offertes WHERE id = ${offerteId}`
  const bestaand: any[] = Array.isArray(rows[0]?.bijlagen) ? rows[0].bijlagen : []
  const nieuw = [...bestaand, { naam: file.name, url: blob.url, type: ext, grootte: file.size }]
  await sql`UPDATE offertes SET bijlagen = ${JSON.stringify(nieuw)}::jsonb, bijgewerkt_op = NOW() WHERE id = ${offerteId}`

  return NextResponse.json({ ok: true, bijlage: { naam: file.name, url: blob.url, type: ext, grootte: file.size } })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)
  const { url } = await req.json()

  const rows = await sql`SELECT bijlagen FROM offertes WHERE id = ${offerteId}`
  const bestaand: any[] = Array.isArray(rows[0]?.bijlagen) ? rows[0].bijlagen : []
  const gefilterd = bestaand.filter((b: any) => b.url !== url)
  await sql`UPDATE offertes SET bijlagen = ${JSON.stringify(gefilterd)}::jsonb, bijgewerkt_op = NOW() WHERE id = ${offerteId}`

  return NextResponse.json({ ok: true })
}
