import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ensureProjectbeheerTables } from '@/lib/projectbeheer'

const VALID_STATUS = ['voorgesteld', 'geaccepteerd', 'geweigerd']

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klusId = parseInt(id)
  if (isNaN(klusId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  await ensureProjectbeheerTables()
  const meerwerk = await sql`SELECT * FROM project_meerwerk WHERE klus_id = ${klusId} ORDER BY aangemaakt_op, id`
  return NextResponse.json({ meerwerk })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klusId = parseInt(id)
  if (isNaN(klusId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  const body = await req.json()
  const omschrijving = String(body.omschrijving ?? '').trim()
  const bedrag = Number(body.bedrag)
  if (!omschrijving || !bedrag || bedrag <= 0) {
    return NextResponse.json({ error: 'Vul omschrijving en bedrag in' }, { status: 400 })
  }

  await ensureProjectbeheerTables()
  const rows = await sql`
    INSERT INTO project_meerwerk (klus_id, omschrijving, bedrag)
    VALUES (${klusId}, ${omschrijving}, ${bedrag})
    RETURNING *
  `
  return NextResponse.json({ meerwerk: rows[0] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klusId = parseInt(id)
  if (isNaN(klusId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  const body = await req.json()
  const meerwerkId = parseInt(body.meerwerk_id)
  if (isNaN(meerwerkId) || !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  }

  await ensureProjectbeheerTables()
  await sql`
    UPDATE project_meerwerk
    SET status = ${body.status},
        accepted_at = CASE WHEN ${body.status} = 'geaccepteerd' THEN NOW() ELSE NULL END,
        accepted_name = CASE WHEN ${body.status} = 'geaccepteerd' THEN ${body.accepted_name || 'Ozvolt (handmatig)'} ELSE NULL END
    WHERE id = ${meerwerkId} AND klus_id = ${klusId}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klusId = parseInt(id)
  const meerwerkId = parseInt(new URL(req.url).searchParams.get('meerwerk_id') ?? '')
  if (isNaN(klusId) || isNaN(meerwerkId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  await ensureProjectbeheerTables()
  await sql`DELETE FROM project_meerwerk WHERE id = ${meerwerkId} AND klus_id = ${klusId}`
  return NextResponse.json({ ok: true })
}
