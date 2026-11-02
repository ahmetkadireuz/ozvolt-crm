import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { bewaarAbonnement, verwijderAbonnement, vapidSleutels, stuurPushMelding } from '@/lib/melding'

// Publieke VAPID-sleutel voor de browser
export async function GET() {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { publicKey } = await vapidSleutels()
  return NextResponse.json({ publicKey })
}

// Dit apparaat aanmelden voor pushmeldingen (en een testmelding sturen)
export async function POST(req: NextRequest) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { subscription, test } = await req.json().catch(() => ({}))
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Ongeldig abonnement' }, { status: 400 })
  }
  const apparaat = (req.headers.get('user-agent') ?? '').slice(0, 255) || null
  await bewaarAbonnement(subscription, apparaat)
  if (test) await stuurPushMelding({ titel: '🔔 Meldingen staan aan', bericht: 'Je krijgt nu een melding als een klant een offerte opent.', link: '/notificaties' })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { endpoint } = await req.json().catch(() => ({}))
  if (typeof endpoint === 'string') await verwijderAbonnement(endpoint)
  return NextResponse.json({ ok: true })
}
