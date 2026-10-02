import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { abonneerTikkieWebhook, tikkieAan } from '@/lib/tikkie'

const TIKKIE_WEBHOOK_PATH = '/api/webhooks/tikkie'

// Eenmalig: Tikkie laten weten waar betaalnotificaties heen moeten
export async function POST() {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  if (!tikkieAan()) return NextResponse.json({ ok: false, melding: '✗ Tikkie is niet ingesteld' }, { status: 400 })
  const url = (process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl').replace(/\/$/, '') + TIKKIE_WEBHOOK_PATH
  try {
    await abonneerTikkieWebhook(url)
    return NextResponse.json({ ok: true, melding: `✓ Webhook actief: ${url}` })
  } catch (err) {
    return NextResponse.json({ ok: false, melding: '✗ ' + (err instanceof Error ? err.message : String(err)) }, { status: 502 })
  }
}
