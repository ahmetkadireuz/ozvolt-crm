import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ensureProjectbeheerTables } from '@/lib/projectbeheer'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klusId = parseInt(id)
  if (isNaN(klusId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  await ensureProjectbeheerTables()
  const uren = await sql`SELECT * FROM project_uren WHERE klus_id = ${klusId} ORDER BY datum DESC, id DESC`
  return NextResponse.json({ uren })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klusId = parseInt(id)
  if (isNaN(klusId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  const body = await req.json()
  const uren = Number(body.uren)
  const uurloon = Number(body.uurloon) > 0 ? Number(body.uurloon) : 65
  if (!uren || uren <= 0) return NextResponse.json({ error: 'Vul het aantal uren in' }, { status: 400 })

  await ensureProjectbeheerTables()
  const rows = await sql`
    INSERT INTO project_uren (klus_id, datum, uren, uurloon, omschrijving)
    VALUES (${klusId}, ${body.datum || new Date().toISOString().slice(0, 10)}, ${uren}, ${uurloon}, ${body.omschrijving || null})
    RETURNING *
  `
  return NextResponse.json({ uur: rows[0] })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klusId = parseInt(id)
  const uurId = parseInt(new URL(req.url).searchParams.get('uur_id') ?? '')
  if (isNaN(klusId) || isNaN(uurId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  await ensureProjectbeheerTables()
  await sql`DELETE FROM project_uren WHERE id = ${uurId} AND klus_id = ${klusId}`
  return NextResponse.json({ ok: true })
}
