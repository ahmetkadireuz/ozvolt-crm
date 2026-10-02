import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import crypto from 'crypto'
import { ensureUoKolom } from '@/lib/offerte-sjablonen'
import { parseUoItems } from '@/lib/uitgangspunten'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)
  const body = await req.json()

  // Alleen wa_items updaten (punten editor klussenpagina)
  if (body.wa_items !== undefined && Object.keys(body).length === 1) {
    await sql`UPDATE offertes SET wa_items = ${JSON.stringify(body.wa_items)}::jsonb, bijgewerkt_op = NOW() WHERE id = ${offerteId}`
    return NextResponse.json({ ok: true })
  }

  const validStatuses = ['concept','gestuurd','geaccepteerd','verlopen','geweigerd','vervangen']

  if (body.status && validStatuses.includes(body.status)) {
    // Vervangen offerte blijft vervangen (anders kan de klant hem weer tekenen); alleen de notitie mag nog
    const cur = await sql`SELECT status FROM offertes WHERE id = ${offerteId}`
    if (cur[0]?.status === 'vervangen' && body.status !== 'vervangen') {
      return NextResponse.json({ error: 'Deze offerte is vervangen door een nieuwere versie.' }, { status: 409 })
    }
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

  const rows = await sql`SELECT * FROM offertes WHERE id = ${offerteId}`
  const huidig = rows[0]
  if (!huidig) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  const currentToken = huidig.accept_token
  const token = currentToken || crypto.randomBytes(32).toString('hex')

  const waItems = Array.isArray(body.wa_items) ? body.wa_items : []

  // Vervangen offerte: niet meer te wijzigen, de nieuwe versie is leidend
  if (huidig.status === 'vervangen') {
    return NextResponse.json({ error: 'Deze offerte is vervangen door een nieuwere versie en kan niet meer worden gewijzigd.', vervangen: true }, { status: 409 })
  }

  // Getekende offerte = vastgelegde afspraak: prijzen, regels, uitgangspunten/opties en klant liggen vast.
  // De klant van een offerte komt altijd van het project en wordt hier nooit los gewijzigd.
  // Alleen de werkafspraken mogen nog bijgewerkt worden.
  if (huidig.accepted_at) {
    if (Array.isArray(body.wa_items)) {
      await sql`UPDATE offertes SET wa_items = ${JSON.stringify(waItems)}::jsonb, bijgewerkt_op = NOW() WHERE id = ${offerteId}`
    }
    return NextResponse.json({ error: 'Deze offerte is getekend en kan niet meer worden gewijzigd. Maak een nieuwe offerte voor aanpassingen.', vergrendeld: true }, { status: 409 })
  }

  // Betaalvelden alleen wijzigen als ze worden meegestuurd — het formulier stuurt ze niet mee
  const betaalUrl = body.betaal_url !== undefined ? (body.betaal_url || null) : huidig.betaal_url ?? null
  const betaalUrl2 = body.betaal_url_2 !== undefined ? (body.betaal_url_2 || null) : huidig.betaal_url_2 ?? null
  const betaling5050 = body.betaling_50_50 !== undefined ? !!body.betaling_50_50 : !!huidig.betaling_50_50

  // korting_pct bevat een bedrag in euro's; NUMERIC(5,2) liep vast boven € 999,99
  if (korting > 999.99) {
    try { await sql`ALTER TABLE offertes ALTER COLUMN korting_pct TYPE NUMERIC(10,2)` } catch (err) {
      console.error('[offertes] korting_pct verbreden mislukt:', err)
    }
  }

  try {
    await sql`
      UPDATE offertes SET
        datum = ${body.datum},
        geldig_tot = ${body.geldig_tot || null},
        regels = ${JSON.stringify(regels)}::jsonb,
        korting_pct = ${korting},
        btw_pct = ${btw},
        notities = ${body.notities || null},
        status_notitie = ${body.status_notitie !== undefined ? (body.status_notitie || null) : huidig.status_notitie ?? null},
        betaal_url = ${betaalUrl},
        betaling_50_50 = ${betaling5050},
        betaal_url_2 = ${betaalUrl2},
        wa_items = ${JSON.stringify(waItems)}::jsonb,
        accept_token = ${token},
        bijgewerkt_op = NOW()
      WHERE id = ${offerteId}
    `
  } catch {
    await sql`
      UPDATE offertes SET
        datum = ${body.datum},
        geldig_tot = ${body.geldig_tot || null},
        regels = ${JSON.stringify(regels)}::jsonb,
        korting_pct = ${korting},
        btw_pct = ${btw},
        notities = ${body.notities || null},
        betaal_url = ${betaalUrl},
        accept_token = ${token},
        bijgewerkt_op = NOW()
      WHERE id = ${offerteId}
    `
  }

  // Uitgangspunten & opties (alleen als meegestuurd; vóór acceptatie — zie lock hierboven)
  if (body.uo_items !== undefined) {
    await ensureUoKolom()
    const uoItems = parseUoItems(Array.isArray(body.uo_items) ? body.uo_items : [])
    await sql`UPDATE offertes SET uo_items = ${JSON.stringify(uoItems)}::jsonb WHERE id = ${offerteId}`
  }

  // Opgeslagen offerte met regels = direct zichtbaar (en te tekenen) in het klantportaal
  if (regels.length > 0) {
    await sql`
      UPDATE offertes SET status = 'gestuurd', sent_at = COALESCE(sent_at, NOW())
      WHERE id = ${offerteId} AND status = 'concept' AND accepted_at IS NULL
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
