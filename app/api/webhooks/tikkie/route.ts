import { NextRequest, NextResponse } from 'next/server'
import { verwerkTikkieBetaling } from '@/lib/tikkie'

// Tikkie stuurt hier een melding bij elke betaling op een betaalverzoek.
// Aanmelden via Instellingen → Boekhouding (eenmalig). De betaalstatus wordt
// altijd bij Tikkie zelf opgevraagd, dus een vervalst bericht doet niets.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (body?.notificationType === 'PAYMENT' && typeof body.paymentRequestToken === 'string') {
    try {
      await verwerkTikkieBetaling(body.paymentRequestToken)
    } catch (err) {
      console.error('[tikkie webhook]', err)
    }
  }
  return NextResponse.json({ ok: true })
}
