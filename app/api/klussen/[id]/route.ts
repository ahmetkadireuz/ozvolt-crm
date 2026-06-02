import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

const VALID_STATUSES = ['nieuw','in_behandeling','offerte_gestuurd','gepland','afgerond']
const VALID_BEL = ['niet_gebeld','opgenomen','niet_opgenomen','voicemail']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const klusId = parseInt(id)
  if (isNaN(klusId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  const body = await req.json()

  if (body.status && VALID_STATUSES.includes(body.status)) {
    await sql`UPDATE klussen SET status = ${body.status}, bijgewerkt_op = NOW() WHERE id = ${klusId}`
  }

  if (body.gebeld_status && VALID_BEL.includes(body.gebeld_status)) {
    if (body.gebeld_status === 'niet_gebeld') {
      await sql`UPDATE klussen SET gebeld_status = ${body.gebeld_status}, gebeld_op = NULL, bijgewerkt_op = NOW() WHERE id = ${klusId}`
    } else {
      await sql`UPDATE klussen SET gebeld_status = ${body.gebeld_status}, gebeld_op = NOW(), bijgewerkt_op = NOW() WHERE id = ${klusId}`
    }
  }

  if (typeof body.notities === 'string') {
    const notities = body.notities.slice(0, 5000)
    await sql`UPDATE klussen SET notities = ${notities}, bijgewerkt_op = NOW() WHERE id = ${klusId}`
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const klusId = parseInt(id)
  if (isNaN(klusId)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 })

  await sql`DELETE FROM klussen WHERE id = ${klusId}`
  return NextResponse.json({ ok: true })
}
