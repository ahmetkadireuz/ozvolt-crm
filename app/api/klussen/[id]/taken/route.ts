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
  const taken = await sql`SELECT * FROM project_taken WHERE klus_id = ${klusId} ORDER BY volgorde, id`
  return NextResponse.json({ taken })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klusId = parseInt(id)
  if (isNaN(klusId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  const body = await req.json()
  const omschrijving = String(body.omschrijving ?? '').trim()
  if (!omschrijving) return NextResponse.json({ error: 'Vul een omschrijving in' }, { status: 400 })
  const totaal = Number(body.aantal_totaal) > 0 ? Number(body.aantal_totaal) : 1

  await ensureProjectbeheerTables()
  const rows = await sql`
    INSERT INTO project_taken (klus_id, omschrijving, aantal_totaal, toelichting, volgorde)
    VALUES (${klusId}, ${omschrijving}, ${totaal}, ${body.toelichting || null},
            (SELECT COALESCE(MAX(volgorde), 0) + 1 FROM project_taken WHERE klus_id = ${klusId}))
    RETURNING *
  `
  return NextResponse.json({ taak: rows[0] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klusId = parseInt(id)
  if (isNaN(klusId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  const body = await req.json()
  const taakId = parseInt(body.taak_id)
  if (isNaN(taakId)) return NextResponse.json({ error: 'Ongeldig taak-ID' }, { status: 400 })

  await ensureProjectbeheerTables()

  if (body.gereed !== undefined) {
    await sql`
      UPDATE project_taken
      SET gereed = ${!!body.gereed},
          gereed_op = CASE WHEN ${!!body.gereed} THEN COALESCE(gereed_op, NOW()) ELSE NULL END,
          aantal_klaar = CASE WHEN ${!!body.gereed} THEN aantal_totaal ELSE aantal_klaar END
      WHERE id = ${taakId} AND klus_id = ${klusId}
    `
  }

  if (body.aantal_klaar !== undefined) {
    const klaar = Math.max(0, Number(body.aantal_klaar) || 0)
    // Aantallen en gereed-status consistent houden (zoals syncTaakGereedAantallen in het PHP-pakket)
    await sql`
      UPDATE project_taken
      SET aantal_klaar = LEAST(${klaar}, aantal_totaal),
          gereed = (${klaar} >= aantal_totaal),
          gereed_op = CASE WHEN ${klaar} >= aantal_totaal THEN COALESCE(gereed_op, NOW()) ELSE NULL END
      WHERE id = ${taakId} AND klus_id = ${klusId}
    `
  }

  if (typeof body.omschrijving === 'string' && body.omschrijving.trim()) {
    await sql`UPDATE project_taken SET omschrijving = ${body.omschrijving.trim()} WHERE id = ${taakId} AND klus_id = ${klusId}`
  }

  if (body.foto_url) {
    await sql`
      UPDATE project_taken SET fotos = fotos || ${JSON.stringify([String(body.foto_url)])}::jsonb
      WHERE id = ${taakId} AND klus_id = ${klusId}
    `
  }

  const rows = await sql`SELECT * FROM project_taken WHERE id = ${taakId} AND klus_id = ${klusId}`
  return NextResponse.json({ taak: rows[0] ?? null })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klusId = parseInt(id)
  const taakId = parseInt(new URL(req.url).searchParams.get('taak_id') ?? '')
  if (isNaN(klusId) || isNaN(taakId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  await ensureProjectbeheerTables()
  await sql`DELETE FROM project_taken WHERE id = ${taakId} AND klus_id = ${klusId}`
  return NextResponse.json({ ok: true })
}
