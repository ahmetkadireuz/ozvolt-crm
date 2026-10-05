import { sql } from '@/lib/db'
import { berekenTotalen } from '@/lib/utils'

/* ============================================================
   Facturen: nummering, aanmaken vanuit offerte en 50/50-splitsing
   in een voorschotfactuur + eindfactuur.

   Nummering: F<jj><volgnummer>, bv. F26002 (minimaal 3 cijfers, na 999 gewoon F261000).
   Het volgnummer loopt per jaar door over de oude vorm OZV-F-<jaar>-<nr> heen.
   Oudere facturen (OZVT-xxxx, OZV-F-…) blijven ongewijzigd; alleen nooit
   verstuurde concepten worden eenmalig omgenummerd (zie migreerFactuurnummers).
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
    if (ok[0]?.n === 5) { _ensured = true; await migreerFactuurnummers(); return }
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
  await migreerFactuurnummers()
}

let _gemigreerd = false

/**
 * Eenmalig en idempotent: concepten die nooit de deur uit zijn gegaan (status concept, niet in
 * Moneybird, niet betaald, geen Tikkie) en nog OZV-F-<jaar>-<nr> heten, krijgen F<jj><nr>
 * met hetzelfde volgnummer (OZV-F-2026-0002 → F26002). Al het andere blijft zoals het is.
 */
async function migreerFactuurnummers(): Promise<void> {
  if (_gemigreerd) return
  try {
    const tikkie = await sql`
      SELECT COUNT(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'facturen' AND column_name IN ('tikkie_token', 'tikkie_betaald_op')
    `
    const metTikkie = tikkie[0]?.n === 2
    const kandidaten = await sql`
      SELECT f.id, f.factuurnummer FROM facturen f
      WHERE f.factuurnummer ~ '^OZV-F-[0-9]{4}-[0-9]+$'
        AND f.status = 'concept' AND f.moneybird_id IS NULL
    `
    for (const k of kandidaten) {
      const [, jaar, nr] = String(k.factuurnummer).match(/^OZV-F-(\d{4})-(\d+)$/) ?? []
      if (!jaar) continue
      const nieuw = factuurnummerVoor(Number(jaar), Number(nr))
      // Geen Tikkie (referentie = factuurnummer) en niet betaald; nooit een bestaand nummer overschrijven
      if (metTikkie) {
        await sql`
          UPDATE facturen SET factuurnummer = ${nieuw}, bijgewerkt_op = NOW()
          WHERE id = ${k.id} AND factuurnummer = ${k.factuurnummer} AND status = 'concept'
            AND moneybird_id IS NULL AND tikkie_token IS NULL AND tikkie_betaald_op IS NULL
            AND NOT EXISTS (SELECT 1 FROM facturen x WHERE x.factuurnummer = ${nieuw})
        `
      } else {
        await sql`
          UPDATE facturen SET factuurnummer = ${nieuw}, bijgewerkt_op = NOW()
          WHERE id = ${k.id} AND factuurnummer = ${k.factuurnummer} AND status = 'concept'
            AND moneybird_id IS NULL
            AND NOT EXISTS (SELECT 1 FROM facturen x WHERE x.factuurnummer = ${nieuw})
        `
      }
    }
    _gemigreerd = true
  } catch (err) {
    console.error('[facturen] factuurnummers omzetten naar F<jj><nr> mislukt:', err)
  }
}

/** F + 2-cijferig jaar + volgnummer van minimaal 3 cijfers: F26002, F261000 */
export function factuurnummerVoor(jaar: number, volgnummer: number): string {
  return `F${String(jaar).slice(-2)}${String(volgnummer).padStart(3, '0')}`
}

export async function volgendFactuurnummer(jaar = new Date().getFullYear()): Promise<string> {
  // Doorlopend over beide vormen in hetzelfde jaar: OZV-F-2026-0002 en F26002 delen de reeks
  const oud = `OZV-F-${jaar}-`
  const nieuw = `^F${String(jaar).slice(-2)}[0-9]{3,}$`
  const rows = await sql`
    SELECT COALESCE(MAX(nr), 0) AS max_nr FROM (
      SELECT CAST(split_part(factuurnummer, '-', 4) AS INTEGER) AS nr FROM facturen
      WHERE factuurnummer LIKE ${oud + '%'} AND split_part(factuurnummer, '-', 4) ~ '^[0-9]+$'
      UNION ALL
      SELECT CAST(substr(factuurnummer, 4) AS INTEGER) AS nr FROM facturen
      WHERE factuurnummer ~ ${nieuw}
    ) t
  `
  return factuurnummerVoor(jaar, Number(rows[0]?.max_nr ?? 0) + 1)
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
/** Regels uit jsonb; vangt ook een (oud) als tekst opgeslagen lijst op */
const alsLijst = (raw: unknown): Regel[] => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p } catch {} }
  return []
}

export function offerteNummer(nr: number | string) {
  return `OZVT-${String(nr).padStart(4, '0')}`
}

/**
 * Factuurgegevens uit een offerte: de regels (zonder interne velden), de offertekorting
 * (bedrag in €) als negatieve regel, en de klant. Offerte-notities zijn intern en gaan nooit mee.
 */
async function factuurUitOfferte(offerteId: number) {
  const rows = await sql`SELECT * FROM offertes WHERE id = ${offerteId}`
  const o = rows[0]
  if (!o) throw new Error('Offerte niet gevonden')
  // Project is leidend: de factuur komt in hetzelfde project en krijgt de klant van het project
  if (!o.klus_id) throw new Error('Koppel de offerte eerst aan een project')
  if (o.status === 'vervangen') throw new Error('Deze offerte is vervangen; maak de factuur vanuit de nieuwe versie')
  const klus = await sql`SELECT klant_id FROM klussen WHERE id = ${o.klus_id}`

  const btwPct = Number(o.btw_pct ?? 21)
  const regels: Regel[] = alsLijst(o.regels).map(r => ({
    omschrijving: r.omschrijving ?? '',
    ...(r.beschrijving ? { beschrijving: r.beschrijving } : {}),
    aantal: Number(r.aantal ?? 0),
    prijs: Number(r.prijs ?? 0),
    btw: r.btw !== undefined && r.btw !== null && (r.btw as unknown) !== '' ? Number(r.btw) : btwPct,
  }))
  if (regels.length === 0) throw new Error('Deze offerte heeft nog geen regels')
  const korting = Math.min(Number(o.korting_pct ?? 0), subtotaal(regels))
  if (korting > 0) {
    regels.push({ omschrijving: 'Korting', aantal: 1, prijs: -r2(korting), btw: btwPct })
  }

  return {
    // Getekende offerte: klant ligt vast op de offerte; anders de klant van het project
    klant_id: o.accepted_at ? o.klant_id : (klus[0]?.klant_id ?? o.klant_id),
    klus_id: o.klus_id as number,
    regels,
    btw_pct: btwPct,
  }
}

/** Factuur op basis van een offerte; de offertekorting (bedrag in €) wordt een negatieve regel. */
export async function maakFactuurVanOfferte(offerteId: number) {
  const f = await factuurUitOfferte(offerteId)
  return maakFactuur({
    ...f,
    offerte_id: offerteId,
    notities: null, // offerte-notities zijn intern en horen niet op de factuur (pdf/Moneybird)
  })
}

/** Waarom een factuur niet (meer) uit een offerte gevuld mag worden, of null als het kan. */
export function vullenGeblokkeerd(f: any): string | null {
  if (f.moneybird_id) return 'deze factuur staat al in Moneybird'
  if (f.status === 'betaald' || f.tikkie_betaald_op) return 'deze factuur is al betaald'
  if (f.status !== 'concept') return 'deze factuur is al verstuurd'
  if (f.soort === 'voorschot' || f.soort === 'eind') return 'deze factuur is gesplitst in voorschot en eind'
  return null
}

/** Vervangt de regels van een conceptfactuur door die van een offerte uit hetzelfde project. */
export async function vulFactuurUitOfferte(factuurId: number, offerteId: number) {
  await ensureFactuurKolommen()
  const rows = await sql`SELECT * FROM facturen WHERE id = ${factuurId}`
  const factuur = rows[0]
  if (!factuur) throw new Error('Factuur niet gevonden')
  const blokkade = vullenGeblokkeerd(factuur)
  if (blokkade) throw new Error(`Overnemen kan niet: ${blokkade}`)
  const o = await factuurUitOfferte(offerteId)
  if (factuur.klus_id !== o.klus_id) throw new Error('Deze offerte hoort bij een ander project')

  await sql`
    UPDATE facturen SET regels = ${JSON.stringify(o.regels)}::jsonb, btw_pct = ${o.btw_pct},
      klant_id = ${o.klant_id}, offerte_id = ${offerteId}, bijgewerkt_op = NOW()
    WHERE id = ${factuurId} AND status = 'concept' AND moneybird_id IS NULL
  `
}

export type ProjectOfferte = { id: number; offertenummer: number; status: string; geaccepteerd: boolean; inclBtw: number }

/** Offertes van een project waaruit gefactureerd kan worden (niet vervangen), nieuwste eerst. */
export async function offertesVoorFactuur(klusId: number): Promise<ProjectOfferte[]> {
  const rows = await sql`
    SELECT id, offertenummer, status, accepted_at, regels, korting_pct, btw_pct FROM offertes
    WHERE klus_id = ${klusId} AND status <> 'vervangen'
    ORDER BY datum DESC, id DESC
  `
  return rows.filter((o: any) => alsLijst(o.regels).length > 0).map((o: any) => ({
    id: o.id,
    offertenummer: o.offertenummer,
    status: o.status,
    geaccepteerd: !!o.accepted_at || o.status === 'geaccepteerd',
    inclBtw: r2(berekenTotalen(alsLijst(o.regels), Number(o.korting_pct ?? 0), Number(o.btw_pct ?? 21)).inclBtw),
  }))
}

/** Standaardkeuze: de nieuwste geaccepteerde offerte, anders de nieuwste. */
export function standaardOfferte(offertes: ProjectOfferte[]): ProjectOfferte | null {
  return offertes.find(o => o.geaccepteerd) ?? offertes[0] ?? null
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

  const regels: Regel[] = alsLijst(f.regels)
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
