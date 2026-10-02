import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { tikkieAan, tikkieVoorFactuur } from '@/lib/tikkie'

// Tikkie-betaallink voor deze factuur ophalen of aanmaken (vanuit het CRM)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  if (!tikkieAan()) return NextResponse.json({ error: 'Tikkie is nog niet ingesteld (TIKKIE_API_KEY / TIKKIE_APP_TOKEN)' }, { status: 400 })
  const { id } = await params
  try {
    const url = await tikkieVoorFactuur(parseInt(id))
    if (!url) return NextResponse.json({ error: 'Geen betaallink nodig: factuur is concept, betaald of een oude 50/50-factuur' }, { status: 400 })
    return NextResponse.json({ url })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 })
  }
}
