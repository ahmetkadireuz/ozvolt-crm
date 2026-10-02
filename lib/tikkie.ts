import { sql, berekenTotalen } from '@/lib/db'
import { offerteNummer } from '@/lib/facturen'

/* ============================================================
   Tikkie Zakelijk (ABN AMRO Tikkie API v2)

   Per (deel)factuur maakt het CRM een betaalverzoek aan. De klant
   betaalt met één tik; het geld staat direct op de ABN-rekening.
   De betaling komt via de bankkoppeling ABN → Moneybird in de
   boekhouding: hier registreren we dus GEEN betaling in Moneybird.

   Env: TIKKIE_API_KEY, TIKKIE_APP_TOKEN, TIKKIE_OMGEVING=sandbox|productie
   ============================================================ */

const BASIS = {
  productie: 'https://api.abnamro.com/v2/tikkie',
  sandbox: 'https://api-sandbox.abnamro.com/v2/tikkie',
}

export function tikkieOmgeving(): 'sandbox' | 'productie' {
  return (process.env.TIKKIE_OMGEVING ?? '').toLowerCase() === 'sandbox' ? 'sandbox' : 'productie'
}

export function tikkieAan() {
  return !!(process.env.TIKKIE_API_KEY && process.env.TIKKIE_APP_TOKEN)
}

export class TikkieFout extends Error {
  status: number
  code: string | null
  constructor(melding: string, status: number, code: string | null = null) {
    super(melding)
    this.status = status
    this.code = code
  }
}

/** Vertaalt een foutantwoord van ABN naar gewone taal. Bevat nooit de sleutels zelf. */
function vertaalFout(status: number, body: any): TikkieFout {
  const fouten: any[] = Array.isArray(body?.errors) ? body.errors : []
  const code: string | null = fouten[0]?.code ?? null
  const bericht: string = fouten.map(f => f?.message).filter(Boolean).join('; ') || body?.message || ''
  const tekst = `${code ?? ''} ${bericht}`.toLowerCase()

  if (/app[\s_-]?token/.test(tekst)) return new TikkieFout('App-token klopt niet (of is uitgeschakeld in Tikkie Zakelijk)', status, code)
  if (/api[\s_-]?key|apikey/.test(tekst)) return new TikkieFout('API-key klopt niet', status, code)
  if (status === 401) return new TikkieFout(`Inloggen bij Tikkie mislukt — controleer API-key en app-token${bericht ? ` (${bericht})` : ''}`, status, code)
  if (status === 403) return new TikkieFout(`Geen toegang tot Tikkie${bericht ? `: ${bericht}` : ''}`, status, code)
  if (status === 404) return new TikkieFout('Tikkie niet gevonden', status, code)
  if (status === 429) return new TikkieFout('Te veel verzoeken naar Tikkie; probeer het over een minuut opnieuw', status, code)
  if (status >= 500) return new TikkieFout(`Tikkie is tijdelijk niet bereikbaar (HTTP ${status})`, status, code)
  return new TikkieFout(bericht || `Tikkie gaf een fout (HTTP ${status})`, status, code)
}

async function tikkieFetch(pad: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const apiKey = process.env.TIKKIE_API_KEY
  const appToken = process.env.TIKKIE_APP_TOKEN
  if (!apiKey || !appToken) throw new TikkieFout('Tikkie is niet ingesteld (TIKKIE_API_KEY / TIKKIE_APP_TOKEN ontbreken)', 0)

  let res: Response
  try {
    res = await fetch(BASIS[tikkieOmgeving()] + pad, {
      method: init.method ?? 'GET',
      headers: {
        'API-Key': apiKey,
        'X-App-Token': appToken,
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    })
  } catch (err) {
    throw new TikkieFout(`Tikkie is niet bereikbaar: ${err instanceof Error ? err.message : String(err)}`, 0)
  }

  const tekst = await res.text()
  let body: any = null
  try { body = tekst ? JSON.parse(tekst) : null } catch { body = null }
  if (!res.ok) throw vertaalFout(res.status, body)
  return body
}

/* ── API-aanroepen ─────────────────────────────────────────────────────── */

export async function maakTikkie(p: {
  bedragCenten: number
  omschrijving: string
  referentie: string
  vervaldatum: string // YYYY-MM-DD
}): Promise<{ url: string; paymentRequestToken: string }> {
  if (!Number.isInteger(p.bedragCenten) || p.bedragCenten <= 0) throw new TikkieFout('Bedrag moet groter dan € 0 zijn', 0)
  const data = await tikkieFetch('/paymentrequests', {
    method: 'POST',
    body: {
      amountInCents: p.bedragCenten,
      description: p.omschrijving.slice(0, 35),
      referenceId: p.referentie.slice(0, 35),
      expiryDate: p.vervaldatum,
    },
  })
  if (!data?.url || !data?.paymentRequestToken) throw new TikkieFout('Tikkie gaf geen betaallink terug', 502)
  return { url: data.url, paymentRequestToken: data.paymentRequestToken }
}

export type TikkieBetaling = {
  paymentToken: string
  amountInCents: number
  counterPartyName?: string
  createdDateTime?: string
  refunds?: Array<{ amountInCents: number; status?: string }>
}

export async function haalTikkieBetalingen(token: string): Promise<TikkieBetaling[]> {
  const alle: TikkieBetaling[] = []
  for (let pagina = 0; pagina < 10; pagina++) {
    const data = await tikkieFetch(`/paymentrequests/${encodeURIComponent(token)}/payments?pageNumber=${pagina}&pageSize=50`)
    const lijst: TikkieBetaling[] = Array.isArray(data?.payments) ? data.payments : []
    alle.push(...lijst)
    const totaal = Number(data?.totalElementCount ?? lijst.length)
    if (lijst.length < 50 || alle.length >= totaal) break
  }
  return alle
}

export async function haalTikkie(token: string): Promise<{ referenceId?: string; amountInCents?: number; status?: string } | null> {
  return tikkieFetch(`/paymentrequests/${encodeURIComponent(token)}`)
}

/** Totaal betaald in centen, minus terugbetalingen */
export function nettoBetaaldCenten(betalingen: TikkieBetaling[]) {
  return betalingen.reduce((s, b) => {
    const terug = (b.refunds ?? [])
      .filter(r => !r.status || String(r.status).toUpperCase() !== 'FAILED')
      .reduce((t, r) => t + Number(r.amountInCents ?? 0), 0)
    return s + Number(b.amountInCents ?? 0) - terug
  }, 0)
}

/** Onschuldige test-aanroep voor de testknop */
export async function testTikkieKoppeling(): Promise<{ ok: boolean; melding: string }> {
  if (!process.env.TIKKIE_API_KEY) return { ok: false, melding: '✗ TIKKIE_API_KEY ontbreekt' }
  if (!process.env.TIKKIE_APP_TOKEN) return { ok: false, melding: '✗ TIKKIE_APP_TOKEN ontbreekt' }
  try {
    await tikkieFetch('/paymentrequests?pageNumber=0&pageSize=1')
    return { ok: true, melding: '✓ Gekoppeld' }
  } catch (err) {
    return { ok: false, melding: '✗ ' + (err instanceof Error ? err.message : String(err)) }
  }
}

export async function abonneerTikkieWebhook(url: string): Promise<{ subscriptionId: string | null }> {
  const data = await tikkieFetch('/paymentrequestssubscription', { method: 'POST', body: { url } })
  return { subscriptionId: data?.subscriptionId ?? null }
}

/* ── Database ──────────────────────────────────────────────────────────── */

let _ensured = false

export async function ensureTikkieKolommen(): Promise<void> {
  if (_ensured) return
  try {
    const ok = await sql`
      SELECT COUNT(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'facturen'
        AND column_name IN ('tikkie_token', 'tikkie_url', 'tikkie_aangemaakt_op', 'tikkie_betaald_op', 'tikkie_bedrag_centen', 'tikkie_verloopt_op')
    `
    if (ok[0]?.n === 6) { _ensured = true; return }
  } catch { /* val terug op de volledige migratie */ }
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS tikkie_token TEXT`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS tikkie_url TEXT`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS tikkie_aangemaakt_op TIMESTAMPTZ`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS tikkie_betaald_op TIMESTAMPTZ`
  // Bedrag en vervaldatum waarvoor de Tikkie is gemaakt: zo zien we of hij nog klopt
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS tikkie_bedrag_centen INTEGER`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS tikkie_verloopt_op DATE`
  _ensured = true
}

/* ── Factuur-logica ────────────────────────────────────────────────────── */

const ymd = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })

/** Factuurbedrag incl. btw in centen (zelfde berekening als pdf/mail) */
export function factuurBedragCenten(f: { regels?: any; btw_pct?: any }) {
  const regels = Array.isArray(f.regels) ? f.regels : typeof f.regels === 'string' ? JSON.parse(f.regels) : []
  return Math.round(berekenTotalen(regels, 0, Number(f.btw_pct ?? 21)).inclBtw * 100)
}

/** Tikkie hoort bij deze factuur, voor het huidige bedrag, en is nog niet verlopen */
export function tikkieGeldig(f: any) {
  if (!f?.tikkie_url || !f?.tikkie_token) return false
  if (f.tikkie_bedrag_centen != null && Number(f.tikkie_bedrag_centen) !== factuurBedragCenten(f)) return false
  if (f.tikkie_verloopt_op && ymd(new Date(f.tikkie_verloopt_op)) < ymd(new Date())) return false
  return true
}

/** Link die de klant mag zien: alleen als de factuur open staat en de Tikkie geldig is */
export function tikkieLinkVoorKlant(f: any): string | null {
  if (f?.status === 'betaald' || f?.status === 'concept') return null
  return tikkieGeldig(f) ? f.tikkie_url : null
}

/** Maakt een Tikkie voor deze (deel)factuur als er nog geen geldige is (of altijd, met forceer). */
export async function zorgVoorTikkie(factuurId: number, opts: { forceer?: boolean } = {}): Promise<{ url: string; nieuw: boolean }> {
  await ensureTikkieKolommen()
  const rows = await sql`
    SELECT f.*, o.offertenummer
    FROM facturen f LEFT JOIN offertes o ON o.id = f.offerte_id
    WHERE f.id = ${factuurId}
  `
  const f = rows[0]
  if (!f) throw new TikkieFout('Factuur niet gevonden', 404)
  if (f.status === 'betaald') throw new TikkieFout('Deze factuur is al betaald', 400)
  if (f.betaling_50_50 && (f.soort ?? 'normaal') === 'normaal') {
    throw new TikkieFout('Oude 50/50-factuur (twee termijnen op één factuur): hiervoor wordt geen Tikkie gemaakt', 400)
  }
  if (!opts.forceer && tikkieGeldig(f)) return { url: f.tikkie_url, nieuw: false }

  const bedragCenten = factuurBedragCenten(f)
  if (bedragCenten <= 0) throw new TikkieFout('Factuurbedrag is € 0; geen Tikkie nodig', 400)

  // Vervaldatum = vervaldatum factuur, minimaal morgen
  const verval = new Date(f.factuurdatum)
  verval.setDate(verval.getDate() + (Number(f.betalingstermijn) || 14))
  const morgen = new Date(Date.now() + 24 * 3600_000)
  const vervaldatum = ymd(verval) > ymd(morgen) ? ymd(verval) : ymd(morgen)

  const ref = f.offertenummer ? offerteNummer(f.offertenummer) : f.factuurnummer
  const omschrijving =
    f.soort === 'voorschot' ? `Voorschot ${ref}` :
    f.soort === 'eind' ? `Eindfactuur ${ref}` :
    `Factuur ${f.factuurnummer}`

  const t = await maakTikkie({ bedragCenten, omschrijving, referentie: f.factuurnummer, vervaldatum })
  await sql`
    UPDATE facturen SET
      tikkie_token = ${t.paymentRequestToken}, tikkie_url = ${t.url}, tikkie_aangemaakt_op = NOW(),
      tikkie_bedrag_centen = ${bedragCenten}, tikkie_verloopt_op = ${vervaldatum}, tikkie_betaald_op = NULL
    WHERE id = ${factuurId}
  `
  return { url: t.url, nieuw: true }
}

/**
 * Controleert bij Tikkie (niet op basis van een webhook-payload) of er voor dit
 * betaalverzoek genoeg is betaald, en zet de factuur dan op betaald.
 * Werkt ook voor een oudere Tikkie van dezelfde factuur (via referenceId = factuurnummer).
 */
export async function verwerkTikkieBetaling(token: string): Promise<{ factuurId: number | null; betaald: boolean; betaaldCenten: number }> {
  await ensureTikkieKolommen()
  let rows = await sql`SELECT id, factuurnummer, status, regels, btw_pct, tikkie_betaald_op FROM facturen WHERE tikkie_token = ${token}`
  if (!rows[0]) {
    const verzoek = await haalTikkie(token).catch(() => null)
    if (verzoek?.referenceId) {
      rows = await sql`SELECT id, factuurnummer, status, regels, btw_pct, tikkie_betaald_op FROM facturen WHERE factuurnummer = ${verzoek.referenceId}`
    }
  }
  const f = rows[0]
  if (!f) return { factuurId: null, betaald: false, betaaldCenten: 0 }

  const betaaldCenten = nettoBetaaldCenten(await haalTikkieBetalingen(token))
  const nodig = factuurBedragCenten(f)

  if (betaaldCenten > 0 && betaaldCenten >= nodig) {
    if (!f.tikkie_betaald_op) {
      // WHERE tikkie_betaald_op IS NULL: bij twee gelijktijdige webhooks maar één melding
      const bijgewerkt = await sql`
        UPDATE facturen SET status = 'betaald', tikkie_betaald_op = NOW(), bijgewerkt_op = NOW()
        WHERE id = ${f.id} AND tikkie_betaald_op IS NULL
        RETURNING id
      `
      if (bijgewerkt[0] && f.status !== 'betaald') {
        await sql`
          INSERT INTO admin_notifications (type, titel, bericht, link)
          VALUES ('offerte_akkoord', 'Factuur betaald via Tikkie',
            ${`Factuur ${f.factuurnummer} is betaald via Tikkie en bijgewerkt in het CRM.`},
            ${`/facturen/${f.id}`})
        `
      }
    }
    return { factuurId: f.id, betaald: true, betaaldCenten }
  }

  if (betaaldCenten > 0 && f.status !== 'betaald') {
    // Deelbetaling: één melding per week is genoeg
    const al = await sql`
      SELECT 1 FROM admin_notifications
      WHERE type = 'tikkie_deelbetaling' AND link = ${`/facturen/${f.id}`} AND aangemaakt_op > NOW() - INTERVAL '7 days'
    `
    if (!al[0]) {
      await sql`
        INSERT INTO admin_notifications (type, titel, bericht, link)
        VALUES ('tikkie_deelbetaling', ${`Deelbetaling via Tikkie: ${f.factuurnummer}`},
          ${`Er is € ${(betaaldCenten / 100).toFixed(2).replace('.', ',')} van € ${(nodig / 100).toFixed(2).replace('.', ',')} binnen via Tikkie. De factuur blijft open.`},
          ${`/facturen/${f.id}`})
      `
    }
  }
  return { factuurId: f.id, betaald: false, betaaldCenten }
}

/**
 * Voor portaal en PDF: geeft een geldige Tikkie-link voor een openstaande factuur,
 * en maakt er een aan als die er nog niet is (bv. factuur via WhatsApp/portaallink
 * gestuurd in plaats van per mail). Faalt stil: dan alleen IBAN/QR.
 */
export async function tikkieLinkMetAanmaken(f: any): Promise<string | null> {
  const bestaand = tikkieLinkVoorKlant(f)
  if (bestaand) return bestaand
  if (!tikkieAan() || f?.status === 'betaald' || f?.status === 'concept') return null
  if (f?.betaling_50_50 && (f?.soort ?? 'normaal') === 'normaal') return null
  if (factuurBedragCenten(f) <= 0) return null
  try {
    return (await zorgVoorTikkie(Number(f.id))).url
  } catch (err) {
    const reden = err instanceof Error ? err.message : String(err)
    console.error('[tikkie automatisch]', f?.factuurnummer, reden)
    // Zichtbaar maken in het CRM (max. één melding per factuur per dag)
    try {
      const al = await sql`
        SELECT 1 FROM admin_notifications
        WHERE type = 'tikkie_fout' AND link = ${`/facturen/${f.id}`} AND aangemaakt_op > NOW() - INTERVAL '1 day'
      `
      if (!al[0]) {
        await sql`
          INSERT INTO admin_notifications (type, titel, bericht, link)
          VALUES ('tikkie_fout', ${`Tikkie niet aangemaakt: ${f.factuurnummer}`},
            ${`De klant ziet alleen IBAN/QR. Reden: ${reden}`}, ${`/facturen/${f.id}`})
        `
      }
    } catch { /* melding is bijzaak */ }
    return null
  }
}

/** Vangnet (cron/refresh): alle openstaande facturen met een Tikkie nalopen */
export async function controleerOpenstaandeTikkies(max = 50): Promise<string[]> {
  if (!tikkieAan()) return []
  await ensureTikkieKolommen()
  const open = await sql`
    SELECT id, factuurnummer, tikkie_token FROM facturen
    WHERE tikkie_token IS NOT NULL AND tikkie_betaald_op IS NULL AND status IN ('verstuurd', 'te_laat')
    ORDER BY tikkie_aangemaakt_op DESC NULLS LAST
    LIMIT ${max}
  `
  const resultaten: string[] = []
  for (const f of open) {
    try {
      const r = await verwerkTikkieBetaling(f.tikkie_token)
      if (r.betaald) resultaten.push(`tikkie_betaald: ${f.factuurnummer}`)
    } catch (err) {
      console.error('[tikkie controle]', f.factuurnummer, err instanceof Error ? err.message : err)
    }
  }
  return resultaten
}
