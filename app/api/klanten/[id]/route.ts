import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klantId = parseInt(id)
  const body = await req.json()

  await sql`
    UPDATE klanten SET
      naam = ${String(body.naam ?? '').slice(0, 255)},
      email = ${body.email || null},
      telefoon = ${body.telefoon || null},
      locatie = ${body.locatie || null},
      type = ${['Particulier','Zakelijk'].includes(body.type) ? body.type : 'Particulier'},
      status_notitie = ${body.status_notitie || null}
    WHERE id = ${klantId}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  await sql`DELETE FROM klanten WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
