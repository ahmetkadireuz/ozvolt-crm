import { sql } from '@/lib/db'
import { mbApi, mbLijst } from '@/lib/moneybird'

/* ============================================================
   Bonnen-controle: inkoopfacturen en bonnetjes uit Moneybird,
   met per document een AI-analyse en een categorievoorstel.
   Moneybird wordt alleen gewijzigd na expliciet akkoord.
   ============================================================ */

export type DocSoort = 'purchase_invoices' | 'receipts'
export const DOC_BODY_KEY: Record<DocSoort, string> = { purchase_invoices: 'purchase_invoice', receipts: 'receipt' }

export type Grootboek = { id: string; naam: string; type: string }

export type Regelvoorstel = {
  detail_id: string
  omschrijving: string
  bedrag_excl: number
  huidig_grootboek_id: string | null
  voorgesteld_grootboek_id: string | null
  reden: string
}

export type Aandachtspunt = { niveau: 'actie' | 'let_op' | 'info'; tekst: string }

export type BonAnalyse = {
  soort_document: 'inkoopfactuur' | 'bon' | 'geen_bon'
  leverancier: string
  datum: string | null
  factuurnummer: string | null
  totaal_incl: number | null
  btw_bedrag: number | null
  btw_aftrekbaar: 'ja' | 'deels' | 'nee'
  btw_toelichting: string
  is_investering: boolean
  samenvatting: string
  aandachtspunten: Aandachtspunt[]
  regels: Regelvoorstel[]
}

export type AnalyseRij = {
  doc_id: string
  doc_soort: DocSoort
  status: 'geanalyseerd' | 'toegepast' | 'genegeerd' | 'fout'
  analyse: BonAnalyse | null
  fout: string | null
  bijgewerkt_op: string
}

let _ensured = false

export async function ensureBonnenTabel() {
  if (_ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS bon_analyses (
      doc_id        VARCHAR(40) PRIMARY KEY,
      doc_soort     VARCHAR(30) NOT NULL,
      status        VARCHAR(20) NOT NULL DEFAULT 'geanalyseerd',
      analyse       JSONB,
      fout          TEXT,
      aangemaakt_op TIMESTAMPTZ DEFAULT NOW(),
      bijgewerkt_op TIMESTAMPTZ DEFAULT NOW()
    )
  `
  _ensured = true
}

export async function haalAnalyses(): Promise<Map<string, AnalyseRij>> {
  await ensureBonnenTabel()
  const rows = await sql`SELECT doc_id, doc_soort, status, analyse, fout, bijgewerkt_op FROM bon_analyses`
  return new Map(rows.map((r: any) => [String(r.doc_id), r as AnalyseRij]))
}

export async function bewaarAnalyse(docId: string, soort: DocSoort, status: AnalyseRij['status'], analyse: BonAnalyse | null, fout: string | null) {
  await ensureBonnenTabel()
  await sql`
    INSERT INTO bon_analyses (doc_id, doc_soort, status, analyse, fout, bijgewerkt_op)
    VALUES (${docId}, ${soort}, ${status}, ${analyse ? JSON.stringify(analyse) : null}::jsonb, ${fout}, NOW())
    ON CONFLICT (doc_id) DO UPDATE SET
      doc_soort = EXCLUDED.doc_soort, status = EXCLUDED.status, analyse = EXCLUDED.analyse,
      fout = EXCLUDED.fout, bijgewerkt_op = NOW()
  `
}

export async function zetStatus(docId: string, status: AnalyseRij['status']) {
  await ensureBonnenTabel()
  await sql`UPDATE bon_analyses SET status = ${status}, bijgewerkt_op = NOW() WHERE doc_id = ${docId}`
}

export async function haalGrootboeken(): Promise<Grootboek[]> {
  const rows = await mbLijst<any>('/ledger_accounts', 5)
  return rows
    .filter(r => ['expenses', 'direct_costs', 'other_income_expenses', 'non_current_assets'].includes(r.account_type))
    .map(r => ({ id: String(r.id), naam: String(r.name), type: String(r.account_type) }))
    .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
}

/** Recente inkoopfacturen en bonnen (standaard: laatste 3 maanden), nieuwste eerst */
export async function haalRecenteDocumenten(maanden = 3) {
  const nu = new Date()
  const van = new Date(nu.getFullYear(), nu.getMonth() - (maanden - 1), 1)
  const ym = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  const periode = `period:${ym(van)}..${ym(nu)}`
  const [inkoop, bonnen] = await Promise.all([
    mbLijst<any>(`/documents/purchase_invoices?filter=${periode}`, 10),
    mbLijst<any>(`/documents/receipts?filter=${periode}`, 10),
  ])
  const alles = [
    ...inkoop.map(d => ({ ...d, _soort: 'purchase_invoices' as DocSoort })),
    ...bonnen.map(d => ({ ...d, _soort: 'receipts' as DocSoort })),
  ]
  return alles.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
}

/** Ongesorteerde documenten in het Moneybird-postvak (binnengekomen via het inbox-mailadres) */
export async function haalPostvak(): Promise<any[]> {
  try {
    return await mbLijst<any>('/documents/typeless_documents', 3)
  } catch {
    return []
  }
}

export async function haalDocument(soort: DocSoort, id: string) {
  return mbApi(`/documents/${soort}/${id}`)
}

/** Past de grootboekrekening per regel aan in Moneybird (alleen na akkoord van de gebruiker). */
export async function wijzigCategorieen(soort: DocSoort, id: string, wijzigingen: { detail_id: string; ledger_account_id: string }[]) {
  const body = {
    [DOC_BODY_KEY[soort]]: {
      details_attributes: wijzigingen.map(w => ({ id: w.detail_id, ledger_account_id: w.ledger_account_id })),
    },
  }
  return mbApi(`/documents/${soort}/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export function leverancierNaam(doc: any) {
  return doc?.contact?.company_name
    || [doc?.contact?.firstname, doc?.contact?.lastname].filter(Boolean).join(' ')
    || 'Onbekende leverancier'
}
