// Uitgangspunten & opties op een offerte. Puur (geen database), dus bruikbaar in client en server.
// Opties zijn informatief: ze tellen nooit mee in totalen, aanbetaling, betaallinks, factuur of Moneybird.

export type UoSoort = 'uitgangspunt' | 'optie'

export interface UoItem {
  soort: UoSoort
  titel: string
  tekst: string
  meerprijs: number | null // excl. btw, alleen bij soort 'optie'
}

export interface OfferteSjabloon extends UoItem {
  id: number
  volgorde: number
}

function getal(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

/** Maakt één item veilig: onbekende velden weg, soort/meerprijs genormaliseerd. */
export function normaliseerUoItem(raw: any): UoItem {
  const soort: UoSoort = raw?.soort === 'optie' ? 'optie' : 'uitgangspunt'
  return {
    soort,
    titel: String(raw?.titel ?? '').slice(0, 300),
    tekst: String(raw?.tekst ?? '').slice(0, 10000),
    meerprijs: soort === 'optie' ? getal(raw?.meerprijs) : null,
  }
}

/** Leest uo_items uit een databaserij (JSONB of string); ontbreekt → leeg. Lege items vallen weg. */
export function parseUoItems(raw: unknown): UoItem[] {
  let arr: any[] = []
  if (Array.isArray(raw)) arr = raw
  else if (typeof raw === 'string') { try { const p = JSON.parse(raw); if (Array.isArray(p)) arr = p } catch {} }
  return arr.map(normaliseerUoItem).filter(i => i.titel.trim() || i.tekst.trim() || i.meerprijs !== null)
}

export { tekstBlokken, type TekstBlok } from './tekst'

export function meerprijsInclBtw(exclBtw: number, btwPct: number): number {
  return Math.round(exclBtw * (1 + Number(btwPct) / 100) * 100) / 100
}
