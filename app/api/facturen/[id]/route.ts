import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

const VALID_STATUSES = ['concept','verstuurd','betaald','te_laat']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const factuurId = parseInt(id)
  const body = await req.json()

  if (body.status && VALID_STATUSES.includes(body.status)) {
    await sql`UPDATE facturen SET status = ${body.status}, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    return NextResponse.json({ ok: true })
  }

  const regels = Array.isArray(body.regels) ? body.regels : []
  const btw = Number(body.btw_pct ?? 21)

  await sql`
    UPDATE facturen SET
      klant_id = ${body.klant_id},
      factuurdatum = ${body.factuurdatum},
      betalingstermijn = ${body.betalingstermijn ?? 14},
      regels = ${JSON.stringify(regels)}::jsonb,
      btw_pct = ${btw},
      notities = ${body.notities || null},
      bijgewerkt_op = NOW()
    WHERE id = ${factuurId}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  await sql`DELETE FROM facturen WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
