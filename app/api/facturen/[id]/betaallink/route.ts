import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { zorgVoorMoneybirdFactuur } from '@/lib/moneybird-sync'
import { ensureFactuurKolommen } from '@/lib/facturen'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const factuurId = parseInt(id)

  await ensureFactuurKolommen()

  try {
    // Eén factuur in Moneybird: de betaallink hoort bij dezelfde factuur die in de boekhouding staat
    const { betaalUrl } = await zorgVoorMoneybirdFactuur(factuurId)
    if (!betaalUrl) {
      return NextResponse.json({ error: 'Moneybird gaf geen betaallink terug — staat online betalen aan in Moneybird?' }, { status: 502 })
    }
    await sql`UPDATE facturen SET betaal_url = ${betaalUrl}, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    return NextResponse.json({ ok: true, betaalUrl })
  } catch (err: any) {
    console.error('[moneybird factuur betaallink]', err)
    return NextResponse.json({ error: err?.message ?? 'Moneybird fout' }, { status: 500 })
  }
}
