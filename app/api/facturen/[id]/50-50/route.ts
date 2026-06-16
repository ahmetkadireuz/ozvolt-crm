import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const factuurId = parseInt(id)
  if (isNaN(factuurId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const enabled = !!body?.enabled

  // Defensief: kolommen kunnen missen in oudere productie-db
  try {
    await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaling_50_50 BOOLEAN DEFAULT FALSE`
    await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_url_2 TEXT`
  } catch (err) {
    console.error('[facturen 50-50] ALTER TABLE:', err)
  }

  try {
    if (enabled) {
      await sql`UPDATE facturen SET betaling_50_50 = TRUE, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    } else {
      // Reset: termijn-2 link weg, terug naar enkele betaling
      await sql`UPDATE facturen SET betaling_50_50 = FALSE, betaal_url_2 = NULL, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    }
    return NextResponse.json({ ok: true, betaling_50_50: enabled })
  } catch (err) {
    console.error('[facturen 50-50] UPDATE:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB-fout' }, { status: 500 })
  }
}
