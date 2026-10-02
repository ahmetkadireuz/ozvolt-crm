import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

// Na handmatig versturen (bijv. via WhatsApp): status 'gestuurd' + sent_at.
// Een al getekende of vervangen offerte houdt zijn status.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)

  const rows = await sql`
    UPDATE offertes SET
      status = CASE WHEN accepted_at IS NOT NULL OR status = 'vervangen' THEN status ELSE 'gestuurd' END,
      sent_at = NOW(), bijgewerkt_op = NOW()
    WHERE id = ${offerteId} RETURNING id
  `
  if (!rows[0]) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
