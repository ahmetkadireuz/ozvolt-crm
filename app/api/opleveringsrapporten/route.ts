import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { klus_id, klant_id, titel, notities, fotos } = await req.json()
  if (!klus_id || !klant_id) return NextResponse.json({ error: 'klus_id en klant_id vereist' }, { status: 400 })

  const rows = await sql`
    INSERT INTO opleveringsrapporten (klus_id, klant_id, titel, notities, fotos)
    VALUES (${klus_id}, ${klant_id}, ${titel ?? 'Opleveringsrapport'}, ${notities ?? ''}, ${JSON.stringify(fotos ?? [])})
    RETURNING id
  `
  return NextResponse.json({ id: rows[0].id })
}
