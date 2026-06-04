import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import crypto from 'crypto'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)
  const body = await req.json()

  const validStatuses = ['concept','gestuurd','geaccepteerd','verlopen','geweigerd']

  if (body.status && validStatuses.includes(body.status)) {
    // Probeer met status_notitie, val terug zonder als kolom nog niet bestaat
    try {
      await sql`UPDATE offertes SET status = ${body.status}, status_notitie = ${body.status_notitie ?? null}, bijgewerkt_op = NOW() WHERE id = ${offerteId}`
    } catch {
      await sql`UPDATE offertes SET status = ${body.status}, bijgewerkt_op = NOW() WHERE id = ${offerteId}`
    }
    return NextResponse.json({ ok: true })
  }

  // Volledige update
  const regels = Array.isArray(body.regels) ? body.regels : []
  const korting = Number(body.korting_pct ?? 0)
  const btw = Number(body.btw_pct ?? 21)

  const rows = await sql`SELECT accept_token FROM offertes WHERE id = ${offerteId}`
  const currentToken = rows[0]?.accept_token
  const token = currentToken || crypto.randomBytes(32).toString('hex')

  // Probeer met status_notitie, val terug zonder
  try {
    await sql`
      UPDATE offertes SET
        klant_id = ${body.klant_id},
        datum = ${body.datum},
        geldig_tot = ${body.geldig_tot || null},
        regels = ${JSON.stringify(regels)}::jsonb,
        korting_pct = ${korting},
        btw_pct = ${btw},
        notities = ${body.notities || null},
        status_notitie = ${body.status_notitie || null},
        betaal_url = ${body.betaal_url || null},
        betaling_50_50 = ${!!body.betaling_50_50},
        betaal_url_2 = ${body.betaal_url_2 || null},
        accept_token = ${token},
        bijgewerkt_op = NOW()
      WHERE id = ${offerteId}
    `
  } catch {
    await sql`
      UPDATE offertes SET
        klant_id = ${body.klant_id},
        datum = ${body.datum},
        geldig_tot = ${body.geldig_tot || null},
        regels = ${JSON.stringify(regels)}::jsonb,
        korting_pct = ${korting},
        btw_pct = ${btw},
        notities = ${body.notities || null},
        betaal_url = ${body.betaal_url || null},
        accept_token = ${token},
        bijgewerkt_op = NOW()
      WHERE id = ${offerteId}
    `
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  await sql`DELETE FROM offertes WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
