import { NextRequest, NextResponse } from 'next/server'
import { tikkieAan, verwerkTikkieBetaling } from '@/lib/tikkie'

// Tikkie stuurt een notificatie bij elke betaling op een betaalverzoek.
// Activeren: Instellingen → Boekhouding → "Tikkie-webhook activeren".
// De payload wordt niet vertrouwd: we halen de betalingen zelf op bij Tikkie
// en zetten de factuur pas op betaald als het betaalde bedrag ≥ factuurbedrag.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = typeof body?.paymentRequestToken === 'string' ? body.paymentRequestToken : null
  if (!token || !/^[A-Za-z0-9_-]{1,100}$/.test(token)) return NextResponse.json({ ok: true, skip: 'geen betaalverzoek' })
  if (!tikkieAan()) return NextResponse.json({ ok: true, skip: 'tikkie niet ingesteld' })

  try {
    const r = await verwerkTikkieBetaling(token)
    return NextResponse.json({ ok: true, betaald: r.betaald })
  } catch (err) {
    console.error('[tikkie webhook]', err instanceof Error ? err.message : err)
    // 500 zodat Tikkie het later opnieuw probeert; de cron is het vangnet
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
