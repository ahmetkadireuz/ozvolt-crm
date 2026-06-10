import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getKlantSessieFromReq } from '@/lib/klant-sessie'
import { ensureProjectbeheerTables } from '@/lib/projectbeheer'

export async function POST(req: NextRequest) {
  const klantId = await getKlantSessieFromReq(req)
  if (!klantId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { meerwerk_id, naam } = await req.json()
  const meerwerkId = parseInt(meerwerk_id)
  if (isNaN(meerwerkId)) return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })

  await ensureProjectbeheerTables()

  // Alleen meerwerk op een klus van deze klant, en alleen vanuit status 'voorgesteld'
  const rows = await sql`
    SELECT m.id FROM project_meerwerk m
    JOIN klussen k ON k.id = m.klus_id
    WHERE m.id = ${meerwerkId} AND k.klant_id = ${klantId} AND m.status = 'voorgesteld'
  `
  if (!rows[0]) return NextResponse.json({ error: 'Meerwerk niet gevonden of al verwerkt' }, { status: 404 })

  const klantNaam = typeof naam === 'string' && naam.trim()
    ? naam.trim().slice(0, 160)
    : (await sql`SELECT naam FROM klanten WHERE id = ${klantId}`)[0]?.naam ?? 'Klant'

  await sql`
    UPDATE project_meerwerk
    SET status = 'geaccepteerd', accepted_at = NOW(), accepted_name = ${klantNaam}
    WHERE id = ${meerwerkId}
  `
  return NextResponse.json({ ok: true })
}
