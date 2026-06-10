import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { sql } from '@/lib/db'
import { ensureProjectbeheerTables } from '@/lib/projectbeheer'

function veiligeHandtekening(sig: unknown): string | null {
  return typeof sig === 'string' && sig.startsWith('data:image/') ? sig : null
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { klus_id, klant_id, titel, notities, fotos, type, inhoud, handtekening_monteur, handtekening_klant } = await req.json()
  if (!klus_id || !klant_id) return NextResponse.json({ error: 'klus_id en klant_id vereist' }, { status: 400 })

  await ensureProjectbeheerTables()
  const rows = await sql`
    INSERT INTO opleveringsrapporten (klus_id, klant_id, titel, notities, fotos, type, inhoud, handtekening_monteur, handtekening_klant)
    VALUES (${klus_id}, ${klant_id}, ${titel ?? 'Opleveringsrapport'}, ${notities ?? ''}, ${JSON.stringify(fotos ?? [])},
            ${type ?? 'vrij'}, ${inhoud ? JSON.stringify(inhoud) : null},
            ${veiligeHandtekening(handtekening_monteur)}, ${veiligeHandtekening(handtekening_klant)})
    RETURNING id
  `
  return NextResponse.json({ id: rows[0].id })
}
