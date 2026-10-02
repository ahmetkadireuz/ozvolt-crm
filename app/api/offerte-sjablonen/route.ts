import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ensureSjablonenTabel, sjabloonUitRij } from '@/lib/offerte-sjablonen'
import { normaliseerUoItem } from '@/lib/uitgangspunten'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  await ensureSjablonenTabel()
  const rows = await sql`SELECT * FROM offerte_sjablonen ORDER BY volgorde, id`
  return NextResponse.json({ sjablonen: rows.map(sjabloonUitRij) })
}

export async function POST(req: NextRequest) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  await ensureSjablonenTabel()
  const item = normaliseerUoItem(await req.json().catch(() => ({})))
  if (!item.titel.trim()) return NextResponse.json({ error: 'Geef het sjabloon een titel' }, { status: 400 })
  const rows = await sql`
    INSERT INTO offerte_sjablonen (soort, titel, tekst, meerprijs, volgorde)
    VALUES (${item.soort}, ${item.titel}, ${item.tekst}, ${item.meerprijs},
            (SELECT COALESCE(MAX(volgorde), 0) + 1 FROM offerte_sjablonen))
    RETURNING *
  `
  return NextResponse.json({ sjabloon: sjabloonUitRij(rows[0]) })
}
