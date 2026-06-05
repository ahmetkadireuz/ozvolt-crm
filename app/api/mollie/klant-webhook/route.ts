import { NextRequest, NextResponse } from 'next/server'
import { createMollieClient } from '@mollie/api-client'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const paymentId = params.get('id')
  if (!paymentId) return NextResponse.json({ ok: false }, { status: 400 })

  const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY! })
  const payment = await mollie.payments.get(paymentId)
  const meta = payment.metadata as Record<string, string> | null
  const factuurId = meta?.factuurId

  if (!factuurId) return NextResponse.json({ ok: false })

  if (payment.status === 'paid') {
    await sql`
      UPDATE facturen
      SET mollie_status = 'paid',
          mollie_payment_id = ${paymentId},
          mollie_paid_at = NOW(),
          status = 'betaald',
          bijgewerkt_op = NOW()
      WHERE id = ${parseInt(factuurId)}
    `
  } else {
    await sql`
      UPDATE facturen
      SET mollie_status = ${payment.status}, bijgewerkt_op = NOW()
      WHERE id = ${parseInt(factuurId)}
    `
  }

  return NextResponse.json({ ok: true })
}
