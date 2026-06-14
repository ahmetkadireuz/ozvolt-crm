import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { mbHaalFactuur } from '@/lib/moneybird'

export async function POST(req: NextRequest) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { factuurId } = await req.json()
  if (!factuurId) return NextResponse.json({ error: 'factuurId verplicht' }, { status: 400 })

  const rows = await sql`
    SELECT id, status, moneybird_id FROM facturen WHERE id = ${Number(factuurId)}
  `
  const factuur = rows[0]
  if (!factuur) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
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
