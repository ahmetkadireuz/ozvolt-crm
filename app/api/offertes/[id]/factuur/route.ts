import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { maakFactuurVanOfferte } from '@/lib/facturen'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params

  try {
    // Offertekorting gaat mee als negatieve regel; nummer volgens F<jj><nr>
    const factuur = await maakFactuurVanOfferte(parseInt(id))
    return NextResponse.json({ factuurId: factuur.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: msg === 'Offerte niet gevonden' ? 404 : 500 })
  }
}
