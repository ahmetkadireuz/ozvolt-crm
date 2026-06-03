import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { gelezen } = await req.json()
  await sql`UPDATE admin_notifications SET gelezen = ${gelezen} WHERE id = ${Number(params.id)}`
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  await sql`DELETE FROM admin_notifications WHERE id = ${Number(params.id)}`
  return NextResponse.json({ ok: true })
}
