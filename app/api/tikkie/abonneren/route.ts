import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { abonneerTikkieMeldingen, tikkieAan } from '@/lib/tikkie'

// Eenmalig: Tikkie laten melden wanneer er betaald is
export async function POST() {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  if (!tikkieAan()) return NextResponse.json({ error: 'Tikkie is nog niet ingesteld' }, { status: 400 })
  const site = (process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl').replace(/\/$/, '')
  try {
    const subscriptionId = await abonneerTikkieMeldingen(`${site}/api/webhooks/tikkie`)
    return NextResponse.json({ ok: true, subscriptionId })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 })
  }
}
