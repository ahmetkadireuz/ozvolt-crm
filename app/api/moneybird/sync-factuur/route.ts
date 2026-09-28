import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { zorgVoorMoneybirdFactuur } from '@/lib/moneybird-sync'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  if (!process.env.MONEYBIRD_API_TOKEN || !process.env.MONEYBIRD_ADMIN_ID) {
    return NextResponse.json({ error: 'Moneybird niet geconfigureerd' }, { status: 503 })
  }

  const { factuurId } = await req.json()
  if (!factuurId) return NextResponse.json({ error: 'factuurId verplicht' }, { status: 400 })

  // Haal factuur op
  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_tel, k.type AS klant_type
    FROM facturen f
    JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${Number(factuurId)}
  `
  const factuur = rows[0]
  if (!factuur) return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 })

  if (factuur.moneybird_id) {
    return NextResponse.json({ error: 'Factuur staat al in Moneybird', moneybird_id: factuur.moneybird_id }, { status: 409 })
  }

  try {
    const mb = await zorgVoorMoneybirdFactuur(Number(factuurId))
    const opgeslagen = await sql`SELECT moneybird_url FROM facturen WHERE id = ${Number(factuurId)}`
    return NextResponse.json({
      ok: true,
      moneybird_id: mb.moneybirdId,
      moneybird_url: opgeslagen[0]?.moneybird_url ?? null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[moneybird sync-factuur]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
