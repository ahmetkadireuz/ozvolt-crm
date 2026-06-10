import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getKlantSessieFromReq } from '@/lib/klant-sessie'
import { ensureProjectbeheerTables } from '@/lib/projectbeheer'

export async function POST(req: NextRequest) {
  const klantId = await getKlantSessieFromReq(req)
  if (!klantId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { rapport_id, handtekening } = await req.json()
  const rapportId = parseInt(rapport_id)
  if (isNaN(rapportId)) return NextResponse.json({ error: 'Ongeldig rapport' }, { status: 400 })
  if (typeof handtekening !== 'string' || !handtekening.startsWith('data:image/png;base64,')) {
    return NextResponse.json({ error: 'Plaats uw handtekening in het tekenvak' }, { status: 400 })
  }

  await ensureProjectbeheerTables()

  // Alleen het eigen rapport, en alleen als er nog niet getekend is
  const rows = await sql`
    SELECT id, handtekening_klant FROM opleveringsrapporten
    WHERE id = ${rapportId} AND klant_id = ${klantId}
  `
  if (!rows[0]) return NextResponse.json({ error: 'Rapport niet gevonden' }, { status: 404 })
  if (rows[0].handtekening_klant) return NextResponse.json({ error: 'Dit rapport is al ondertekend' }, { status: 409 })

  await sql`
    UPDATE opleveringsrapporten
    SET handtekening_klant = ${handtekening}, getekend_op = NOW(), bijgewerkt_op = NOW()
    WHERE id = ${rapportId} AND klant_id = ${klantId}
  `
  return NextResponse.json({ ok: true })
}
