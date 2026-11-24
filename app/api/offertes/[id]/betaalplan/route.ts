import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ensureOfferteKolommen } from '@/lib/offertes'
import { betaalplanVergrendeld } from '@/lib/utils'

// Betaalplan van een offerte: in één keer of 50/50 (50% bij start, 50% na oplevering).
// Staat los van Moneybird en van de inhoud van de offerte: ook bij een getekende offerte te wijzigen,
// zolang er nog geen factuur bij de offerte verstuurd is.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)
  if (isNaN(offerteId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (typeof body?.betaling_50_50 !== 'boolean') return NextResponse.json({ error: 'Kies een betaalplan' }, { status: 400 })

  await ensureOfferteKolommen()
  const offerte = (await sql`SELECT id, status FROM offertes WHERE id = ${offerteId}`)[0]
  if (!offerte) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  const facturen = await sql`SELECT factuurnummer, status, moneybird_id FROM facturen WHERE offerte_id = ${offerteId} ORDER BY id`
  const reden = betaalplanVergrendeld(offerte as any, facturen as any)
  if (reden) return NextResponse.json({ error: `Het betaalplan ligt vast: ${reden}.` }, { status: 409 })

  await sql`UPDATE offertes SET betaling_50_50 = ${body.betaling_50_50}, bijgewerkt_op = NOW() WHERE id = ${offerteId}`
  return NextResponse.json({ ok: true })
}
