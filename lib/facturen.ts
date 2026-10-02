import { sql } from '@/lib/db'

/* ============================================================
   Facturen: nummering, aanmaken vanuit offerte en 50/50-splitsing
   in een voorschotfactuur + eindfactuur.

   Nummering: OZV-F-<jaar>-<volgnummer>, per jaar doorlopend.
   Oudere facturen (OZVT-xxxx) blijven ongewijzigd.
   ============================================================ */

type Regel = { omschrijving: string; beschrijving?: string; aantal: number; prijs: number; btw: number }

let _ensured = false

export async function ensureFactuurKolommen(): Promise<void> {
  if (_ensured) return
  // Snelle check: kolommen al aanwezig? Eén query i.p.v. zes DDL-rondes na een koude start.
  try {
    const ok = await sql`
      SELECT COUNT(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'facturen'
        AND column_name IN ('betaal_url', 'betaal_url_2', 'betaling_50_50', 'soort', 'gekoppelde_factuur_id')
    `
    if (ok[0]?.n === 5) { _ensured = true; return }
  } catch { /* val terug op de volledige migratie */ }
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_url TEXT`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_url_2 TEXT`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaling_50_50 BOOLEAN DEFAULT FALSE`
  // soort: 'normaal' | 'voorschot' | 'eind'; gekoppelde_factuur_id wijst naar de andere helft
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS soort VARCHAR(20) NOT NULL DEFAULT 'normaal'`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS gekoppelde_factuur_id INTEGER`
  // Uniek factuurnummer (wettelijk verplicht). Faalt stil als er al dubbele nummers bestaan.
  try {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS ux_facturen_factuurnummer ON facturen(factuurnummer)`
  } catch (err) {
    console.error('[facturen] unieke index op factuurnummer niet aangemaakt (dubbele nummers aanwezig?):', err)
  }
  _ensured = true
}

export async function volgendFactuurnummer(jaar = new Date().getFullYear()): Promise<string> {
  const prefix = `OZV-F-${jaar}-`
  const rows = await sql`
    SELECT COALESCE(MAX(CAST(split_part(factuurnummer, '-', 4) AS INTEGER)), 0) AS max_nr
    FROM facturen
    WHERE factuurnummer LIKE ${prefix + '%'} AND split_part(factuurnummer, '-', 4) ~ '^[0-9]+$'
  `
  const volgend = Number(rows[0]?.max_nr ?? 0) + 1
  return `${prefix}${String(volgend).padStart(4, '0')}`
}

export type NieuweFactuur = {
  klant_id: number
  klus_id: number | null
  offerte_id?: number | null
  betalingstermijn?: number
  regels: Regel[]
  btw_pct: number
  notities?: string | null
  soort?: 'normaal' | 'voorschot' | 'eind'
  gekoppelde_factuur_id?: number | null
}

/** Maakt een concept-factuur met het volgende nummer; probeert opnieuw bij een nummerbotsing. */
export async function maakFactuur(f: NieuweFactuur): Promise<{ id: number; factuurnummer: string }> {
  await ensureFactuurKolommen()
  for (let poging = 0; poging < 3; poging++) {
    const nummer = await volgendFactuurnummer()
    try {
      const rows = await sql`
        INSERT INTO facturen (factuurnummer, klant_id, klus_id, offerte_id, status, factuurdatum, betalingstermijn,
                              regels, btw_pct, notities, soort, gekoppelde_factuur_id)
        VALUES (${nummer}, ${f.klant_id}, ${f.klus_id}, ${f.offerte_id ?? null}, 'concept', CURRENT_DATE,
                ${f.betalingstermijn ?? 14}, ${JSON.stringify(f.regels)}::jsonb, ${f.btw_pct}, ${f.notities ?? null},
                ${f.soort ?? 'normaal'}, ${f.gekoppelde_factuur_id ?? null})
        RETURNING id, factuurnummer
      `
      return { id: rows[0].id, factuurnummer: rows[0].factuurnummer }
    } catch (err: any) {
      if (err?.code !== '23505' || poging === 2) throw err
    }
  }
  throw new Error('Kon geen uniek factuurnummer bepalen')
}

const r2 = (n: number) => Math.round(n * 100) / 100
const subtotaal = (regels: Regel[]) => regels.reduce((s, r) => s + Number(r.aantal) * Number(r.prijs), 0)

export function offerteNummer(nr: number | string) {
  return `OZVT-${String(nr).padStart(4, '0')}`
}

/** Factuur op basis van een offerte; de offertekorting (bedrag in €) wordt een negatieve regel. */
export async function maakFactuurVanOfferte(offerteId: number) {
  const rows = await sql`SELECT * FROM offertes WHERE id = ${offerteId}`
  const o = rows[0]
  if (!o) throw new Error('Offerte niet gevonden')

  const regels: Regel[] = Array.isArray(o.regels) ? [...o.regels] : []
  const korting = Math.min(Number(o.korting_pct ?? 0), subtotaal(regels))
  if (korting > 0) {
    regels.push({ omschrijving: 'Korting', aantal: 1, prijs: -r2(korting), btw: Number(o.btw_pct ?? 21) })
  }

  return maakFactuur({
    klant_id: o.klant_id,
    klus_id: o.klus_id,
    offerte_id: offerteId,
    regels,
    btw_pct: Number(o.btw_pct ?? 21),
    notities: null, // offerte-notities zijn intern en horen niet op de factuur (pdf/Moneybird)
  })
}

/**
 * Splitst een factuur (nog niet in Moneybird, niet betaald) in een voorschotfactuur (50%, deze factuur)
 * en een nieuwe eindfactuur (alle regels minus het voorschot).
 * Elke factuur gaat apart naar Moneybird, dus de omzet telt precies één keer.
 */
export async function splitsInVoorschot(factuurId: number) {
  await ensureFactuurKolommen()
  const rows = await sql`SELECT * FROM facturen WHERE id = ${factuurId}`
  const f = rows[0]
  if (!f) throw new Error('Factuur niet gevonden')
  if (f.soort === 'voorschot' || f.soort === 'eind') return { voorschotId: f.soort === 'voorschot' ? f.id : f.gekoppelde_factuur_id }
  if (f.moneybird_id) throw new Error('Splitsen kan niet meer: deze factuur staat al in Moneybird')
  if (f.status === 'betaald' || f.tikkie_betaald_op) throw new Error('Splitsen kan niet meer: deze factuur is al betaald')

  const regels: Regel[] = Array.isArray(f.regels) ? f.regels : []
  const netto = subtotaal(regels)
  if (netto <= 0) throw new Error('Vul eerst de factuurregels in')
  const voorschot = r2(netto / 2)
  const btw = Number(f.btw_pct ?? 21)

  let bron = 'de werkzaamheden'
  if (f.offerte_id) {
    const o = await sql`SELECT offertenummer FROM offertes WHERE id = ${f.offerte_id}`
    if (o[0]) bron = `offerte ${offerteNummer(o[0].offertenummer)}`
  }

  const eind = await maakFactuur({
    klant_id: f.klant_id,
    klus_id: f.klus_id,
    offerte_id: f.offerte_id,
    betalingstermijn: f.betalingstermijn ?? 14,
    regels: [...regels, { omschrijving: `Af: voorschotfactuur ${f.factuurnummer}`, aantal: 1, prijs: -voorschot, btw }],
    btw_pct: btw,
    notities: f.notities,
    soort: 'eind',
    gekoppelde_factuur_id: f.id,
  })

  await sql`
    UPDATE facturen SET
      regels = ${JSON.stringify([{ omschrijving: `Voorschot 50% op ${bron}`, beschrijving: `Restant volgt op eindfactuur ${eind.factuurnummer}`, aantal: 1, prijs: voorschot, btw }])}::jsonb,
      soort = 'voorschot',
      gekoppelde_factuur_id = ${eind.id},
      betaling_50_50 = FALSE,
      bijgewerkt_op = NOW()
    WHERE id = ${factuurId}
  `
  return { voorschotId: factuurId, eindId: eind.id, eindNummer: eind.factuurnummer }
}

/** Draait een splitsing terug zolang beide facturen niet in Moneybird staan en niet betaald zijn. */
export async function maakSplitsingOngedaan(factuurId: number) {
  await ensureFactuurKolommen()
  const rows = await sql`SELECT * FROM facturen WHERE id = ${factuurId}`
  const f = rows[0]
  if (!f || f.soort === 'normaal') return
  const voorschotId = f.soort === 'voorschot' ? f.id : f.gekoppelde_factuur_id
  const eindId = f.soort === 'eind' ? f.id : f.gekoppelde_factuur_id

  const paar = await sql`SELECT * FROM facturen WHERE id IN (${voorschotId}, ${eindId})`
  if (paar.some((x: any) => x.moneybird_id || x.status === 'betaald' || x.tikkie_betaald_op)) {
    throw new Error('Terugdraaien kan niet meer: een van beide facturen staat al in Moneybird of is betaald')
  }
  const eind = paar.find((x: any) => x.id === eindId)
  const regels: Regel[] = (Array.isArray(eind?.regels) ? eind.regels : [])
    .filter((r: Regel) => !(Number(r.prijs) < 0 && String(r.omschrijving).startsWith('Af: voorschotfactuur')))

  await sql`
    UPDATE facturen SET regels = ${JSON.stringify(regels)}::jsonb, soort = 'normaal',
      gekoppelde_factuur_id = NULL, bijgewerkt_op = NOW()
    WHERE id = ${voorschotId}
  `
  await sql`DELETE FROM facturen WHERE id = ${eindId}`
}
