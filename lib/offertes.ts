import { sql } from '@/lib/db'
import { ensureUoKolom } from '@/lib/offerte-sjablonen'

/* ============================================================
   Offertes per project: één actieve offerte per project.
   Een nieuwe offerte in een project met een actieve (niet getekende,
   niet vervallen) offerte wordt een nieuwe versie: de oude krijgt
   status 'vervangen' en is niet meer te tekenen.
   ============================================================ */

/** Statussen waarin een offerte niet meer "actief" is. */
export const AFGESLOTEN_OFFERTE_STATUSSEN = ['geaccepteerd', 'verlopen', 'geweigerd', 'vervangen']

export const offerteNr = (nr: number | string) => `OZVT-${String(nr).padStart(4, '0')}`

let _ensured = false
export async function ensureOfferteKolommen(): Promise<void> {
  if (_ensured) return
  await sql`ALTER TABLE offertes ADD COLUMN IF NOT EXISTS vervangen_door_id INTEGER`
  // Kolommen die de kopie bij een nieuwe versie meeneemt (bestaan normaal al)
  await sql`ALTER TABLE offertes ADD COLUMN IF NOT EXISTS wa_items JSONB DEFAULT '[]'`
  await sql`ALTER TABLE offertes ADD COLUMN IF NOT EXISTS bijlagen JSONB DEFAULT '[]'`
  await sql`ALTER TABLE offertes ADD COLUMN IF NOT EXISTS betaling_50_50 BOOLEAN DEFAULT FALSE`
  _ensured = true
}

/** De lopende (niet getekende, niet vervallen) offerte van een project, of null. */
export async function actieveOfferte(klusId: number): Promise<{ id: number; offertenummer: number } | null> {
  const rows = await sql`
    SELECT id, offertenummer FROM offertes
    WHERE klus_id = ${klusId} AND accepted_at IS NULL
      AND status <> ALL(${AFGESLOTEN_OFFERTE_STATUSSEN}::text[])
    ORDER BY datum DESC, id DESC
    LIMIT 1
  `
  return rows[0] ? { id: rows[0].id, offertenummer: rows[0].offertenummer } : null
}

/** De getekende offerte van een project (meerwerk loopt daarna via project_meerwerk), of null. */
export async function getekendeOfferte(klusId: number): Promise<{ id: number; offertenummer: number } | null> {
  const rows = await sql`
    SELECT id, offertenummer FROM offertes
    WHERE klus_id = ${klusId} AND (accepted_at IS NOT NULL OR status = 'geaccepteerd')
    ORDER BY accepted_at DESC NULLS LAST, id DESC
    LIMIT 1
  `
  return rows[0] ? { id: rows[0].id, offertenummer: rows[0].offertenummer } : null
}

async function volgendOffertenummer(): Promise<number> {
  const maxRow = await sql`SELECT MAX(offertenummer)::int AS max_nr FROM offertes`
  return (maxRow[0]?.max_nr ?? 1000) + 1
}

/** Nieuwe, lege concept-offerte in een project; de klant komt van het project. */
export async function maakOfferteVoorProject(klusId: number): Promise<number> {
  const klus = await sql`SELECT klant_id FROM klussen WHERE id = ${klusId}`
  if (!klus[0]) throw new Error('Project niet gevonden')
  const nextNr = await volgendOffertenummer()
  const result = await sql`
    INSERT INTO offertes (offertenummer, klant_id, klus_id, status, datum, geldig_tot, regels, korting_pct, btw_pct)
    VALUES (${nextNr}, ${klus[0].klant_id}, ${klusId}, 'concept', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', '[]'::jsonb, 0, 21)
    RETURNING id
  `
  return result[0].id
}

/**
 * Maakt een nieuwe versie van een actieve offerte: de oude krijgt status 'vervangen',
 * de nieuwe is een concept-kopie (regels, korting, uitgangspunten/opties, werkafspraken).
 * Een inmiddels getekende offerte wordt nooit vervangen.
 */
export async function maakNieuweVersie(oudId: number): Promise<number> {
  await ensureOfferteKolommen()
  await ensureUoKolom()

  const oud = await sql`
    UPDATE offertes SET status = 'vervangen', bijgewerkt_op = NOW()
    WHERE id = ${oudId} AND accepted_at IS NULL AND status <> ALL(${AFGESLOTEN_OFFERTE_STATUSSEN}::text[])
    RETURNING *
  `
  const o = oud[0]
  if (!o) throw new Error('Deze offerte is niet meer actief (al getekend, vervallen of vervangen)')

  const klus = o.klus_id ? await sql`SELECT klant_id FROM klussen WHERE id = ${o.klus_id}` : []
  const klantId = klus[0]?.klant_id ?? o.klant_id
  const nextNr = await volgendOffertenummer()
  const json = (v: unknown) => JSON.stringify(Array.isArray(v) ? v : [])

  const nieuw = await sql`
    INSERT INTO offertes (offertenummer, klant_id, klus_id, status, datum, geldig_tot, regels, korting_pct, btw_pct,
                          notities, wa_items, bijlagen, uo_items, betaling_50_50)
    VALUES (${nextNr}, ${klantId}, ${o.klus_id}, 'concept', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
            ${json(o.regels)}::jsonb, ${o.korting_pct ?? 0}, ${o.btw_pct ?? 21},
            ${o.notities ?? null}, ${json(o.wa_items)}::jsonb, ${json(o.bijlagen)}::jsonb, ${json(o.uo_items)}::jsonb,
            ${!!o.betaling_50_50})
    RETURNING id
  `
  const nieuwId = nieuw[0].id
  await sql`UPDATE offertes SET vervangen_door_id = ${nieuwId} WHERE id = ${oudId}`
  return nieuwId
}
