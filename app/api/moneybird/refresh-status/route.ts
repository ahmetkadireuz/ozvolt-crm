import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { mbHaalFactuur } from '@/lib/moneybird'
import { ensureTikkieKolommen, tikkieAan, verwerkTikkieBetaling } from '@/lib/tikkie'

export async function POST(req: NextRequest) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { factuurId } = await req.json()
  if (!factuurId) return NextResponse.json({ error: 'factuurId verplicht' }, { status: 400 })

  await ensureTikkieKolommen()
  const rows = await sql`
    SELECT id, status, moneybird_id, tikkie_token, tikkie_betaald_op FROM facturen WHERE id = ${Number(factuurId)}
  `
  const factuur = rows[0]
  if (!factuur) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  // Eerst Tikkie: is er via Tikkie betaald, dan is de factuur betaald, wat Moneybird ook zegt
  if (factuur.tikkie_token && !factuur.tikkie_betaald_op && tikkieAan()) {
    try {
      const t = await verwerkTikkieBetaling(factuur.tikkie_token)
      if (t.betaald) {
        return NextResponse.json({ ok: true, nieuweStatus: 'betaald', statusVeranderd: factuur.status !== 'betaald', bron: 'tikkie' })
      }
    } catch (err) {
      console.error('[refresh-status tikkie]', err instanceof Error ? err.message : err)
    }
  }
  if (factuur.tikkie_betaald_op) {
    return NextResponse.json({ ok: true, nieuweStatus: factuur.status, statusVeranderd: false, bron: 'tikkie' })
  }
  if (!factuur.moneybird_id) {
    return NextResponse.json({ error: 'Deze factuur staat nog niet in Moneybird' }, { status: 400 })
  }

  try {
    const mb = await mbHaalFactuur(factuur.moneybird_id)
    const mbStatus = mb?.state as string | undefined

    let nieuweStatus: string | null = null
    if (mbStatus === 'paid') nieuweStatus = 'betaald'
    else if (mbStatus === 'late') nieuweStatus = 'te_laat'
    else if (mbStatus === 'open') nieuweStatus = 'verstuurd'

    const statusVeranderd = nieuweStatus !== null && nieuweStatus !== factuur.status

    if (statusVeranderd) {
      await sql`UPDATE facturen SET status = ${nieuweStatus}, bijgewerkt_op = NOW() WHERE id = ${factuur.id}`
    }

    return NextResponse.json({
      ok: true,
      moneybirdStatus: mbStatus,
      nieuweStatus: nieuweStatus ?? factuur.status,
      statusVeranderd,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
