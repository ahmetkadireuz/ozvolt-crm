import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { splitsInVoorschot, maakSplitsingOngedaan } from '@/lib/facturen'

// 50/50 = voorschotfactuur (50%) + eindfactuur (rest). Twee echte facturen, elk één keer in Moneybird.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const factuurId = parseInt(id)
  if (isNaN(factuurId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const enabled = !!body?.enabled

  try {
    if (enabled) {
      const r = await splitsInVoorschot(factuurId)
      return NextResponse.json({ ok: true, ...r })
    }
    await maakSplitsingOngedaan(factuurId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fout bij splitsen' }, { status: 400 })
  }
}
