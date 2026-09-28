import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ensureFactuurKolommen, maakFactuurVanOfferte, splitsInVoorschot } from '@/lib/facturen'
import { zorgVoorMoneybirdFactuur } from '@/lib/moneybird-sync'

/**
 * Betaallink bij een offerte. Maakt (of hergebruikt) de CRM-factuur voor deze offerte en
 * gebruikt de betaallink van díe factuur in Moneybird — geen losse Moneybird-facturen meer.
 * 50/50: alleen de voorschotfactuur gaat nu naar Moneybird; de eindfactuur blijft concept
 * tot na oplevering.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)
  const body = await req.json().catch(() => ({}))
  let split = !!body.betaling_50_50

  const rows = await sql`SELECT id FROM offertes WHERE id = ${offerteId}`
  if (!rows[0]) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  try {
    await ensureFactuurKolommen()

    // Bestaande factuur voor deze offerte hergebruiken (bij 50/50 de voorschotfactuur)
    const bestaand = await sql`
      SELECT id, soort, status, moneybird_id FROM facturen
      WHERE offerte_id = ${offerteId} AND soort IN ('normaal', 'voorschot')
      ORDER BY (soort = 'voorschot') DESC, id
      LIMIT 1
    `
    if (bestaand[0]?.soort === 'voorschot') split = true
    let factuurId: number = bestaand[0]?.id ?? (await maakFactuurVanOfferte(offerteId)).id

    if (split && bestaand[0]?.soort !== 'voorschot') {
      const f = bestaand[0]
      if (f && (f.status !== 'concept' || f.moneybird_id)) {
        return NextResponse.json({ error: 'Er is al een volledige factuur verstuurd voor deze offerte — 50/50 kan niet meer' }, { status: 409 })
      }
      factuurId = (await splitsInVoorschot(factuurId)).voorschotId
    }

    const { betaalUrl } = await zorgVoorMoneybirdFactuur(factuurId)
    if (!betaalUrl) {
      return NextResponse.json({ error: 'Moneybird gaf geen betaallink terug — staat online betalen aan in Moneybird?' }, { status: 502 })
    }

    // De factuur staat nu open in Moneybird en de klant krijgt de link: ook in het CRM 'verstuurd'
    await sql`UPDATE facturen SET betaal_url = ${betaalUrl}, status = CASE WHEN status = 'concept' THEN 'verstuurd' ELSE status END, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    await sql`
      UPDATE offertes SET betaling_50_50 = ${split}, betaal_url = ${betaalUrl}, betaal_url_2 = NULL, bijgewerkt_op = NOW()
      WHERE id = ${offerteId}
    `
    return NextResponse.json({ ok: true, betaal_url: betaalUrl, factuurId })
  } catch (err: any) {
    console.error('[moneybird betaallinks offerte]', err)
    return NextResponse.json({ error: err?.message ?? 'Moneybird fout' }, { status: 500 })
  }
}
