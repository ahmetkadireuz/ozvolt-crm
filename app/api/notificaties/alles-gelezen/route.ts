import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  await sql`UPDATE admin_notifications SET gelezen = TRUE WHERE gelezen = FALSE`
  return NextResponse.json({ ok: true })
}
