import { mbLijst } from '@/lib/moneybird'

/* ============================================================
   Jaarcijfers uit Moneybird voor de fiscale module (alleen lezen).
   Omzet  = verkoopfacturen (excl. btw, factuurdatum in het jaar)
   Kosten = inkoopfacturen + bonnetjes op kosten-grootboekrekeningen
   Investeringen = regels op grootboekrekeningen van het type vaste activa
   ============================================================ */

type LedgerAccount = { id: string; name: string; account_type: string }

export type Boeking = {
  docId: string
  docType: 'inkoopfactuur' | 'bon'
  datum: string
  leverancier: string
  omschrijving: string
  bedrag: number
  grootboek: string | null
  grootboekType: string | null
  heeftBijlage: boolean
}

export type GrootboekTotaal = { id: string | null; naam: string; type: string | null; bedrag: number; aantal: number }

export type JaarCijfers = {
  jaar: number
  omzet: number
  aantalVerkoopfacturen: number
  conceptFacturen: number
  kosten: number
  investeringen: Boeking[]
  totaalInvesteringen: number
  kostenPerGrootboek: GrootboekTotaal[]
  mogelijkeInvesteringen: Boeking[]
  zonderBijlage: Boeking[]
  zonderGrootboek: Boeking[]
  aantalDocumenten: number
  /** Leverancier + omschrijving + grootboek per regel, lowercase — voor het zoeken naar kostensoorten */
  teksten: string[]
  opgehaaldOp: string
}

const KOSTEN_TYPES = new Set(['expenses', 'direct_costs', 'other_income_expenses'])
const ACTIVA_TYPES = new Set(['non_current_assets'])

// Woorden die wijzen op een bedrijfsmiddel (gaat meerdere jaren mee)
const INVESTERING_WOORDEN = [
  'gereedschap', 'boormachine', 'boorhamer', 'breekhamer', 'accu', 'makita', 'hilti', 'dewalt', 'milwaukee',
  'festool', 'metabo', 'fluke', 'metrel', 'benning', 'gossen', 'installatietester', 'isolatiemeter', 'tester',
  'meetapparat', 'multimeter', 'laptop', 'macbook', 'computer', 'ipad', 'tablet', 'iphone', 'samsung', 'telefoon',
  'printer', 'ladder', 'steiger', 'trap', 'aanhanger', 'bestelauto', 'bestelbus', 'kabelhaspel', 'zaag', 'freesmachine',
  'slijpmachine', 'camera', 'thermografie', 'warmtebeeld', 'inrichting', 'kastinrichting', 'bedrijfswageninrichting',
  'sortimo', 'bott', 'stofzuiger', 'sleuvenfrees', 'perstang', 'krimptang', 'kabeltrekker',
]

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Bedrag excl. btw van één regel, zo nauwkeurig als Moneybird het aanlevert */
function regelExcl(doc: any, d: any): number {
  if (d.total_price_excl_tax_with_discount != null) return num(d.total_price_excl_tax_with_discount)
  const bruto = num(d.price) * (num(d.amount) || 1)
  if (!doc.prices_are_incl_tax) return bruto
  const incl = num(doc.total_price_incl_tax)
  const excl = num(doc.total_price_excl_tax)
  return incl > 0 ? bruto * (excl / incl) : bruto
}

export function lijktInvestering(tekst: string) {
  const t = tekst.toLowerCase()
  return INVESTERING_WOORDEN.some(w => t.includes(w))
}

export async function haalJaarCijfers(jaar: number): Promise<JaarCijfers> {
  const periode = `period:${jaar}01..${jaar}12`
  const [ledgers, verkoop, inkoop, bonnen] = await Promise.all([
    mbLijst<LedgerAccount>('/ledger_accounts', 5),
    mbLijst<any>(`/sales_invoices?filter=${periode}`),
    mbLijst<any>(`/documents/purchase_invoices?filter=${periode}`),
    mbLijst<any>(`/documents/receipts?filter=${periode}`),
  ])

  const grootboek = new Map(ledgers.map(l => [String(l.id), l]))

  const definitief = verkoop.filter(f => f.state !== 'draft')
  const omzet = definitief.reduce((s, f) => s + num(f.total_price_excl_tax), 0)

  const boekingen: Boeking[] = []
  const verwerk = (docs: any[], docType: Boeking['docType']) => {
    for (const doc of docs) {
      const leverancier = doc.contact?.company_name || [doc.contact?.firstname, doc.contact?.lastname].filter(Boolean).join(' ') || 'Onbekend'
      const heeftBijlage = Array.isArray(doc.attachments) && doc.attachments.length > 0
      for (const d of doc.details ?? []) {
        const lb = d.ledger_account_id ? grootboek.get(String(d.ledger_account_id)) : undefined
        boekingen.push({
          docId: String(doc.id),
          docType,
          datum: doc.date ?? '',
          leverancier,
          omschrijving: d.description || doc.reference || '',
          bedrag: regelExcl(doc, d),
          grootboek: lb?.name ?? null,
          grootboekType: lb?.account_type ?? null,
          heeftBijlage,
        })
      }
    }
  }
  verwerk(inkoop, 'inkoopfactuur')
  verwerk(bonnen, 'bon')

  const kostenBoekingen = boekingen.filter(b => b.grootboekType && KOSTEN_TYPES.has(b.grootboekType))
  const investeringen = boekingen.filter(b => b.grootboekType && ACTIVA_TYPES.has(b.grootboekType))
  const zonderGrootboek = boekingen.filter(b => !b.grootboekType)

  const perGrootboek = new Map<string, GrootboekTotaal>()
  for (const b of boekingen) {
    const key = b.grootboek ?? '(geen categorie)'
    const cur = perGrootboek.get(key) ?? { id: null, naam: key, type: b.grootboekType, bedrag: 0, aantal: 0 }
    cur.bedrag += b.bedrag
    cur.aantal += 1
    perGrootboek.set(key, cur)
  }

  const mogelijkeInvesteringen = kostenBoekingen.filter(
    b => b.bedrag >= 450 && lijktInvestering(`${b.omschrijving} ${b.leverancier}`),
  )

  const zonderBijlageDocs = new Map<string, Boeking>()
  for (const b of boekingen) if (!b.heeftBijlage && !zonderBijlageDocs.has(b.docId)) zonderBijlageDocs.set(b.docId, b)

  return {
    jaar,
    omzet,
    aantalVerkoopfacturen: definitief.length,
    conceptFacturen: verkoop.length - definitief.length,
    kosten: kostenBoekingen.reduce((s, b) => s + b.bedrag, 0),
    investeringen,
    totaalInvesteringen: investeringen.reduce((s, b) => s + b.bedrag, 0),
    kostenPerGrootboek: Array.from(perGrootboek.values()).sort((a, b) => b.bedrag - a.bedrag),
    mogelijkeInvesteringen,
    zonderBijlage: Array.from(zonderBijlageDocs.values()),
    zonderGrootboek,
    aantalDocumenten: inkoop.length + bonnen.length,
    teksten: boekingen.map(b => `${b.leverancier} ${b.omschrijving} ${b.grootboek ?? ''}`.toLowerCase()),
    opgehaaldOp: new Date().toISOString(),
  }
}

/**
 * Geschatte afschrijving: lineair 20% per jaar (5 jaar, restwaarde 0),
 * naar rato vanaf de maand van aanschaf. Alleen een schatting — de
 * werkelijke afschrijving boek je in Moneybird via Bezittingen.
 */
export function schatAfschrijving(investeringen: Boeking[], jaar: number) {
  return investeringen.reduce((s, b) => {
    const d = new Date(b.datum)
    if (Number.isNaN(d.getTime()) || d.getFullYear() !== jaar) return s
    const maanden = 12 - d.getMonth()
    return s + b.bedrag * 0.2 * (maanden / 12)
  }, 0)
}

export function moneybirdDocUrl(docId: string) {
  return `https://moneybird.com/${process.env.MONEYBIRD_ADMIN_ID ?? ''}/documents/${docId}`
}
