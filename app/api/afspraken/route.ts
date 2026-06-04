import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import crypto from 'crypto'

export async function GET() {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const rows = await sql`
    SELECT w.*, k.naam AS klant_naam
    FROM werkafspraken w JOIN klanten k ON k.id = w.klant_id
    ORDER BY w.aangemaakt_op DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const body = await req.json()

  const nrRow = await sql`SELECT COALESCE(MAX(afspraaknummer),0)+1 AS nr FROM werkafspraken`
  const afspraaknummer = nrRow[0].nr

  const token = crypto.randomBytes(32).toString('hex')
  const afspraken = Array.isArray(body.afspraken) ? body.afspraken : []

  const rows = await sql`
    INSERT INTO werkafspraken (afspraaknummer, klant_id, klus_id, offerte_id, datum, titel, afspraken, notities, accept_token, bijgewerkt_op)
    VALUES (${afspraaknummer}, ${body.klant_id}, ${body.klus_id || null}, ${body.offerte_id || null},
            ${body.datum}, ${body.titel || null}, ${JSON.stringify(afspraken)}::jsonb,
            ${body.notities || null}, ${token}, NOW())
    RETURNING id
  `
  return NextResponse.json({ id: rows[0].id })
}
