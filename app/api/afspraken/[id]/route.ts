import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const rows = await sql`
    SELECT w.*, k.naam AS klant_naam, k.email AS klant_email
    FROM werkafspraken w JOIN klanten k ON k.id = w.klant_id
    WHERE w.id = ${parseInt(id)}
  `
  if (!rows[0]) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  if (body.status) {
    await sql`UPDATE werkafspraken SET status = ${body.status}, bijgewerkt_op = NOW() WHERE id = ${parseInt(id)}`
    return NextResponse.json({ ok: true })
  }

  const afspraken = Array.isArray(body.afspraken) ? body.afspraken : []
  await sql`
    UPDATE werkafspraken SET
      klant_id = ${body.klant_id},
      klus_id = ${body.klus_id || null},
      datum = ${body.datum},
      titel = ${body.titel || null},
      afspraken = ${JSON.stringify(afspraken)}::jsonb,
      notities = ${body.notities || null},
      bijgewerkt_op = NOW()
    WHERE id = ${parseInt(id)}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  await sql`DELETE FROM werkafspraken WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
