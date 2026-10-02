import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ensureFactuurKolommen } from '@/lib/facturen'
import { ensureTikkieKolommen } from '@/lib/tikkie'
import { vindOfMaakKlant } from '@/lib/klanten'
import { wijzigProjectKlant } from '@/lib/projecten'

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

  if (body.portaal_punten !== undefined) {
    try {
      await sql`ALTER TABLE klussen ADD COLUMN IF NOT EXISTS portaal_punten JSONB DEFAULT '[]'`
    } catch {}
    await sql`UPDATE klussen SET portaal_punten = ${JSON.stringify(body.portaal_punten)}::jsonb, bijgewerkt_op = NOW() WHERE id = ${klusId}`
  }

  // Koppelen: het document neemt de klant van het project over, behalve als het al vastligt
  // (getekende offerte; factuur betaald of in Moneybird) — dan alleen bij dezelfde klant.
  if (body.koppel_offerte_id || body.koppel_factuur_id) {
    const klus = await sql`SELECT klant_id FROM klussen WHERE id = ${klusId}`
    if (!klus[0]) return NextResponse.json({ error: 'Project niet gevonden' }, { status: 404 })
    const klantId = klus[0].klant_id

    if (body.koppel_offerte_id) {
      const offerteId = parseInt(body.koppel_offerte_id)
      const o = await sql`SELECT klant_id, accepted_at, status FROM offertes WHERE id = ${offerteId}`
      if (!o[0]) return NextResponse.json({ error: 'Offerte niet gevonden' }, { status: 404 })
      const vast = !!o[0].accepted_at || o[0].status === 'geaccepteerd'
      if (vast && o[0].klant_id !== klantId) {
        return NextResponse.json({ error: 'Deze offerte is getekend door een andere klant dan die van het project en kan hier niet aan gekoppeld worden.' }, { status: 409 })
      }
      await sql`UPDATE offertes SET klus_id = ${klusId}, klant_id = ${vast ? o[0].klant_id : klantId}, bijgewerkt_op = NOW() WHERE id = ${offerteId}`
    }

    if (body.koppel_factuur_id) {
      await ensureFactuurKolommen()
      await ensureTikkieKolommen()
      await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS moneybird_id VARCHAR(64) DEFAULT NULL`
      const factuurId = parseInt(body.koppel_factuur_id)
      const f = await sql`SELECT klant_id, status, moneybird_id, tikkie_betaald_op FROM facturen WHERE id = ${factuurId}`
      if (!f[0]) return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 })
      const vast = f[0].status === 'betaald' || !!f[0].moneybird_id || !!f[0].tikkie_betaald_op
      if (vast && f[0].klant_id !== klantId) {
        return NextResponse.json({ error: 'Deze factuur is betaald of staat al in Moneybird op een andere klant en kan niet aan dit project gekoppeld worden.' }, { status: 409 })
      }
      await sql`UPDATE facturen SET klus_id = ${klusId}, klant_id = ${vast ? f[0].klant_id : klantId}, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    }
  }

  // Andere klant op het project: open offertes/facturen volgen mee (zie lib/projecten.ts)
  if (body.klant_id !== undefined || body.nieuwe_klant) {
    let nieuweKlantId = parseInt(String(body.klant_id ?? '')) || 0
    if (!nieuweKlantId && body.nieuwe_klant?.naam) {
      const k = await vindOfMaakKlant({
        naam: body.nieuwe_klant.naam, email: body.nieuwe_klant.email,
        telefoon: body.nieuwe_klant.telefoon, locatie: body.nieuwe_klant.locatie,
      })
      nieuweKlantId = k.id
    }
    if (!nieuweKlantId) return NextResponse.json({ error: 'Kies een klant' }, { status: 400 })
    const bestaat = await sql`SELECT id FROM klanten WHERE id = ${nieuweKlantId}`
    if (!bestaat[0]) return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
    const resultaat = await wijzigProjectKlant(klusId, nieuweKlantId)
    return NextResponse.json({ ok: true, klant_id: nieuweKlantId, ...resultaat })
  }

  if (typeof body.type_werk === 'string' || typeof body.omschrijving === 'string' || typeof body.product === 'string') {
    try {
      // Defensief: kolom kan missen in oudere productie-db
      await sql`ALTER TABLE klussen ADD COLUMN IF NOT EXISTS product VARCHAR(255)`
    } catch {}
    try {
      if (typeof body.type_werk === 'string') {
        await sql`UPDATE klussen SET type_werk = ${body.type_werk}, bijgewerkt_op = NOW() WHERE id = ${klusId}`
      }
      if (typeof body.omschrijving === 'string') {
        await sql`UPDATE klussen SET omschrijving = ${body.omschrijving}, bijgewerkt_op = NOW() WHERE id = ${klusId}`
      }
      if (typeof body.product === 'string') {
        await sql`UPDATE klussen SET product = ${body.product}, bijgewerkt_op = NOW() WHERE id = ${klusId}`
      }
    } catch (err) {
      console.error('[klussen PATCH] aanvraagdetails update:', err)
      return NextResponse.json({ error: err instanceof Error ? err.message : 'DB-fout bij opslaan' }, { status: 500 })
    }
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
