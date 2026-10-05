import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { vulFactuurUitOfferte } from '@/lib/facturen'

// Conceptfactuur vullen met de regels (+ korting) van een offerte uit hetzelfde project
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const offerteId = parseInt(String(body.offerte_id ?? ''))
  if (!offerteId) return NextResponse.json({ error: 'Kies een offerte' }, { status: 400 })

  try {
    await vulFactuurUitOfferte(parseInt(id), offerteId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: /niet gevonden/i.test(msg) ? 404 : 409 })
  }
}
