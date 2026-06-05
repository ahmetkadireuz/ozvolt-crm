import { NextRequest, NextResponse } from 'next/server'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  const klantId = await getKlantSessie()
  if (!klantId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const rows = await sql`SELECT id, naam, url, aangemaakt_op FROM groenverklaringen WHERE klant_id = ${klantId} ORDER BY aangemaakt_op DESC`
  return NextResponse.json(rows)
}
