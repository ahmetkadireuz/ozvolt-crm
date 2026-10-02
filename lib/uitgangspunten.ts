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

export type TekstBlok = { type: 'lijst'; items: string[] } | { type: 'alinea'; regels: string[] }

/** Regels die met * of - beginnen worden een opsomming; overige regels alinea's (regelafbrekingen behouden). */
export function tekstBlokken(tekst: string): TekstBlok[] {
  const blokken: TekstBlok[] = []
  for (const ruw of tekst.replace(/\r\n?/g, '\n').split('\n')) {
    const regel = ruw.trimEnd()
    const m = regel.match(/^\s*[*-]\s*(.*)$/)
    const laatste = blokken[blokken.length - 1]
    if (m) {
      if (laatste?.type === 'lijst') laatste.items.push(m[1])
      else blokken.push({ type: 'lijst', items: [m[1]] })
    } else if (!regel.trim()) {
      blokken.push({ type: 'alinea', regels: [] }) // lege regel sluit het blok af
    } else if (laatste?.type === 'alinea' && laatste.regels.length > 0) {
      laatste.regels.push(regel)
    } else {
      blokken.push({ type: 'alinea', regels: [regel] })
    }
  }
  return blokken.filter(b => (b.type === 'lijst' ? b.items.length > 0 : b.regels.length > 0))
}

export function meerprijsInclBtw(exclBtw: number, btwPct: number): number {
  return Math.round(exclBtw * (1 + Number(btwPct) / 100) * 100) / 100
}
