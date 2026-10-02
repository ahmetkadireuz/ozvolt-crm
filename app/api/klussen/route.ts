import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { maakProject } from '@/lib/projecten'

// Nieuw project voor een bestaande klant (o.a. om een losse offerte/factuur te koppelen)
export async function POST(req: NextRequest) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const klantId = parseInt(String(body?.klant_id ?? ''))
  if (!klantId) return NextResponse.json({ error: 'Klant ontbreekt' }, { status: 400 })
  const klant = await sql`SELECT id FROM klanten WHERE id = ${klantId}`
  if (!klant[0]) return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })

  const id = await maakProject({
    klant_id: klantId,
    type_werk: typeof body.type_werk === 'string' ? body.type_werk.slice(0, 255) : null,
    omschrijving: typeof body.omschrijving === 'string' ? body.omschrijving.slice(0, 5000) : null,
  })
  return NextResponse.json({ ok: true, id })
}
