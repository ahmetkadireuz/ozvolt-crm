import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { sql } from '@/lib/db'
import { ensureProjectbeheerTables } from '@/lib/projectbeheer'

function veiligeHandtekening(sig: unknown): string | null {
  return typeof sig === 'string' && sig.startsWith('data:image/') ? sig : null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const rapportId = parseInt(id)
  if (isNaN(rapportId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  await ensureProjectbeheerTables()
  const rows = await sql`SELECT * FROM opleveringsrapporten WHERE id = ${rapportId}`
  if (!rows[0]) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  return NextResponse.json({ rapport: rows[0] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const rapportId = parseInt(id)
  if (isNaN(rapportId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  const body = await req.json()
  await ensureProjectbeheerTables()

  if (body.inhoud !== undefined) {
    await sql`UPDATE opleveringsrapporten SET inhoud = ${JSON.stringify(body.inhoud)}::jsonb, bijgewerkt_op = NOW() WHERE id = ${rapportId}`
  }
  if (typeof body.titel === 'string' && body.titel.trim()) {
    await sql`UPDATE opleveringsrapporten SET titel = ${body.titel.trim()}, bijgewerkt_op = NOW() WHERE id = ${rapportId}`
  }
  if (typeof body.notities === 'string') {
    await sql`UPDATE opleveringsrapporten SET notities = ${body.notities}, bijgewerkt_op = NOW() WHERE id = ${rapportId}`
  }
  if (body.handtekening_monteur !== undefined) {
    await sql`UPDATE opleveringsrapporten SET handtekening_monteur = ${veiligeHandtekening(body.handtekening_monteur)}, bijgewerkt_op = NOW() WHERE id = ${rapportId}`
  }
  if (body.handtekening_klant !== undefined) {
    const sig = veiligeHandtekening(body.handtekening_klant)
    await sql`
      UPDATE opleveringsrapporten
      SET handtekening_klant = ${sig},
          getekend_op = CASE WHEN ${sig !== null} THEN NOW() ELSE NULL END,
          bijgewerkt_op = NOW()
      WHERE id = ${rapportId}
    `
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const rapportId = parseInt(id)
  if (isNaN(rapportId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  await ensureProjectbeheerTables()
  await sql`DELETE FROM opleveringsrapporten WHERE id = ${rapportId}`
  return NextResponse.json({ ok: true })
}
