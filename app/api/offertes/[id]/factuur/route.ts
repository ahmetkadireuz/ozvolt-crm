import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)

  const rows = await sql`SELECT * FROM offertes WHERE id = ${offerteId}`
  const offerte = rows[0]
  if (!offerte) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  // Volgende factuurnummer
  const maxRow = await sql`SELECT MAX(CAST(REGEXP_REPLACE(factuurnummer, '[^0-9]', '', 'g') AS INTEGER)) AS max_nr FROM facturen`
  const nextNr = (maxRow[0]?.max_nr ?? 1000) + 1
  const factuurNr = `OZ-${nextNr}`

  const result = await sql`
    INSERT INTO facturen (factuurnummer, klant_id, klus_id, offerte_id, status, factuurdatum, betalingstermijn, regels, btw_pct, notities)
    VALUES (${factuurNr}, ${offerte.klant_id}, ${offerte.klus_id}, ${offerteId}, 'concept', CURRENT_DATE, 14, ${JSON.stringify(offerte.regels)}::jsonb, ${offerte.btw_pct}, ${offerte.notities})
    RETURNING id
  `
  return NextResponse.json({ factuurId: result[0].id })
}
