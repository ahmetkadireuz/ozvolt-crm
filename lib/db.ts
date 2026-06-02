import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let _client: NeonQueryFunction<false, false> | null = null

function getClient(): NeonQueryFunction<false, false> {
  if (!_client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is niet ingesteld')
    _client = neon(process.env.DATABASE_URL)
  }
  return _client
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  return getClient()(strings, ...values)
}

export type Klant = {
  id: number
  naam: string
  email: string | null
  telefoon: string | null
  type: string
  locatie: string | null
  aangemaakt_op: string
  klus_count?: number
}

export type Klus = {
  id: number
  klant_id: number
  klant_naam?: string
  klant_email?: string
  klant_tel?: string
  klant_locatie?: string
  type_werk: string | null
  omschrijving: string | null
  status: string
  product: string | null
  bron: string
  notities: string | null
  gebeld_status: string
  gebeld_op: string | null
  aangemaakt_op: string
  bijgewerkt_op: string
}

export type RegelItem = {
  omschrijving: string
  aantal: number
  prijs: number
  btw: number
}

export type Offerte = {
  id: number
  offertenummer: number
  klant_id: number
  klant_naam?: string
  klant_email?: string
  klus_id: number | null
  status: string
  datum: string
  geldig_tot: string | null
  regels: RegelItem[]
  korting_pct: number
  btw_pct: number
  notities: string | null
  accept_token: string | null
  sent_at: string | null
  reminder_sent_at: string | null
  reminder_count: number
  accepted_at: string | null
  accepted_name: string | null
  accepted_email: string | null
  aangemaakt_op: string
}

export type Factuur = {
  id: number
  factuurnummer: string
  klant_id: number
  klant_naam?: string
  klant_email?: string
  klus_id: number | null
  offerte_id: number | null
  status: string
  factuurdatum: string
  leverdatum: string | null
  betalingstermijn: number
  regels: RegelItem[]
  btw_pct: number
  notities: string | null
  betaal_token: string | null
  mollie_payment_id: string | null
  mollie_status: string | null
  aangemaakt_op: string
}

export type AgendaItem = {
  id: number
  klant_id: number | null
  klus_id: number | null
  klant_naam?: string
  titel: string
  datum_start: string
  datum_eind: string | null
  notities: string | null
  status: string
  aangemaakt_op: string
}

export type Notificatie = {
  id: number
  type: string
  titel: string
  bericht: string | null
  link: string | null
  gelezen: boolean
  aangemaakt_op: string
}

// Helpers
export function berekenTotalen(regels: RegelItem[], kortingPct: number, btwPct: number) {
  const subtotaal = regels.reduce((s, r) => s + r.aantal * r.prijs, 0)
  const korting = subtotaal * (kortingPct / 100)
  const naTotaal = subtotaal - korting
  const btw = naTotaal * (btwPct / 100)
  const inclBtw = naTotaal + btw
  return { subtotaal, korting, naTotaal, btw, inclBtw }
}

export function formatEuro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}
