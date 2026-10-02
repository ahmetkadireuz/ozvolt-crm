import { mbLijst } from '@/lib/moneybird'
import { rond } from '@/lib/bot-auth'

/* ============================================================
   Moneybird-lezen voor de bot-API (finance-scope).
   Alleen GET via mbLijst — nooit iets aanmaken of wijzigen.
   De Moneybird-token blijft in het CRM; antwoorden bevatten geen
   URL's, tokens of betaallinks.
   ============================================================ */

export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const ymd = (d: string) => d.replace(/-/g, '')

/** Moneybird period-filter uit van/tot (YYYY-MM-DD); zonder → het lopende jaar */
export function periodeFilter(van: string | null, tot: string | null) {
  const jaar = new Date().getFullYear()
  const v = van ?? `${tot ? tot.slice(0, 4) : jaar}-01-01`
  const t = tot ?? `${van ? van.slice(0, 4) : jaar}-12-31`
  return { van: v, tot: t, filter: `period:${ymd(v)}..${ymd(t)}` }
}

/** '2026-Q3' → van/tot; ongeldig of leeg → het lopende kwartaal */
export function kwartaalPeriode(raw: string | null) {
  const m = (raw ?? '').trim().toUpperCase().match(/^(\d{4})-?Q([1-4])$/)
  const nu = new Date()
  const jaar = m ? parseInt(m[1]) : nu.getFullYear()
  const q = m ? parseInt(m[2]) : Math.floor(nu.getMonth() / 3) + 1
  const startMaand = (q - 1) * 3 + 1
  const eindMaand = startMaand + 2
  const laatsteDag = new Date(jaar, eindMaand, 0).getDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  const van = `${jaar}-${pad(startMaand)}-01`
  const tot = `${jaar}-${pad(eindMaand)}-${pad(laatsteDag)}`
  return { kwartaal: `${jaar}-Q${q}`, van, tot, filter: `period:${ymd(van)}..${ymd(tot)}` }
}

export function contactNaam(c: any): string {
  return c?.company_name || [c?.firstname, c?.lastname].filter(Boolean).join(' ') || 'Onbekend'
}

// Open posten: verstuurd maar nog niet (volledig) betaald
export const OPEN_STATES = new Set(['open', 'late', 'reminded', 'pending_payment'])

/** Moneybird-status → CRM-status (zelfde mapping als de webhook / refresh-status) */
export function crmStatusVoor(mbState: string | undefined): string | null {
  if (mbState === 'paid') return 'betaald'
  if (mbState === 'late') return 'te_laat'
  if (mbState === 'draft') return 'concept'
  if (mbState && OPEN_STATES.has(mbState)) return 'verstuurd'
  return null
}

export function verkoopFactuur(f: any) {
  const excl = num(f.total_price_excl_tax)
  const incl = num(f.total_price_incl_tax)
  return {
    id: String(f.id),
    factuurnummer: f.invoice_id ?? null,
    referentie: f.reference || null,
    status: f.state,
    open_post: OPEN_STATES.has(f.state),
    klant: contactNaam(f.contact),
    factuurdatum: f.invoice_date ?? null,
    vervaldatum: f.due_date ?? null,
    betaald_op: f.paid_at ?? null,
    totaal_ex_btw: rond(excl),
    btw: rond(incl - excl),
    totaal_incl_btw: rond(incl),
    openstaand: rond(num(f.total_unpaid)),
  }
}

export type GrootboekMap = Map<string, { naam: string; type: string }>

export async function haalGrootboeken(): Promise<GrootboekMap> {
  const lijst = await mbLijst<any>('/ledger_accounts', 5)
  return new Map(lijst.map(l => [String(l.id), { naam: l.name, type: l.account_type }]))
}

export function inkoopDocument(doc: any, soort: 'inkoopfactuur' | 'bon', grootboek: GrootboekMap) {
  const excl = num(doc.total_price_excl_tax)
  const incl = num(doc.total_price_incl_tax)
  return {
    id: String(doc.id),
    soort,
    leverancier: contactNaam(doc.contact),
    referentie: doc.reference || null,
    datum: doc.date ?? null,
    vervaldatum: doc.due_date ?? null,
    status: doc.state ?? null,
    totaal_ex_btw: rond(excl),
    btw: rond(incl - excl),
    totaal_incl_btw: rond(incl),
    heeft_bijlage: Array.isArray(doc.attachments) && doc.attachments.length > 0,
    regels: (doc.details ?? []).map((d: any) => {
      const gb = d.ledger_account_id ? grootboek.get(String(d.ledger_account_id)) : undefined
      return {
        omschrijving: d.description || '',
        aantal: d.amount ?? null,
        prijs: num(d.price),
        totaal_ex_btw: d.total_price_excl_tax_with_discount != null ? rond(num(d.total_price_excl_tax_with_discount)) : null,
        grootboek: gb?.naam ?? null,
        grootboek_type: gb?.type ?? null,
      }
    }),
  }
}

/** Foutmelding van de Moneybird-koppeling als JSON-veilige tekst (bevat nooit de token) */
export function mbFout(err: unknown) {
  return err instanceof Error ? err.message : 'Moneybird ophalen mislukt'
}
