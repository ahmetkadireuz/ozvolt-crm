import QRCode from 'qrcode'
import { sql, berekenTotalen } from '@/lib/db'
import { verwerkBetaling } from '@/lib/betaling-verwerken'

/* ============================================================
   Tikkie Zakelijk (ABN AMRO) — betaallink per factuur.
   De klant betaalt met iDEAL | Wero en het geld staat direct op
   de ABN AMRO-rekening. Een betaalde Tikkie zet de factuur op
   'betaald' (via de webhook, met de cron en het openen van de
   factuur als vangnet).

   Instellen in Vercel:
     TIKKIE_API_KEY    — API-key van het ABN AMRO developer portal
     TIKKIE_APP_TOKEN  — app-token uit Tikkie Zakelijk (instellingen → API)
     TIKKIE_SANDBOX=1  — optioneel: tegen de testomgeving
   ============================================================ */

const BASIS = process.env.TIKKIE_SANDBOX === '1'
  ? 'https://api-sandbox.abnamro.com/v2/tikkie/'
  : 'https://api.abnamro.com/v2/tikkie/'

export function tikkieAan() {
  return !!process.env.TIKKIE_API_KEY && !!process.env.TIKKIE_APP_TOKEN
}

type TikkieVerzoek = {
  paymentRequestToken: string
  url: string
  amountInCents?: number
  referenceId?: string
  expiryDate?: string
  status?: string
  numberOfPayments?: number
  totalAmountPaidInCents?: number
}

async function tikkie<T>(methode: 'GET' | 'POST', pad: string, body?: unknown): Promise<T> {
  const res = await fetch(BASIS + pad, {
    method: methode,
    headers: {
      'API-Key': process.env.TIKKIE_API_KEY ?? '',
      'X-App-Token': process.env.TIKKIE_APP_TOKEN ?? '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const fout = Array.isArray(data?.errors) ? data.errors.map((e: any) => e.message ?? e.code).join(', ') : ''
    throw new Error(`Tikkie ${res.status}${fout ? `: ${fout}` : ''}`)
  }
  return data as T
}

let _ensured = false
async function ensureTikkieKolommen() {
  if (_ensured) return
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS tikkie_token TEXT`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS tikkie_url TEXT`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS tikkie_bedrag_cent INTEGER`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS tikkie_verloopt DATE`
  _ensured = true
}

function bedragCent(f: { regels: unknown; btw_pct: unknown }) {
  const regels = Array.isArray(f.regels) ? f.regels : []
  return Math.round(berekenTotalen(regels, 0, Number(f.btw_pct ?? 21)).inclBtw * 100)
}

/**
 * Geeft de Tikkie-betaallink voor een factuur: de bestaande als die nog geldig is
 * en over hetzelfde bedrag gaat, anders een nieuwe. null als Tikkie uit staat of
 * de factuur niet (meer) betaald hoeft te worden.
 */
export async function tikkieVoorFactuur(factuurId: number): Promise<string | null> {
  if (!tikkieAan()) return null
  await ensureTikkieKolommen()
  const rows = await sql`
    SELECT id, factuurnummer, status, regels, btw_pct, betaling_50_50,
           tikkie_url, tikkie_bedrag_cent, tikkie_verloopt
    FROM facturen WHERE id = ${factuurId}
  `
  const f: any = rows[0]
  // Oude 50/50-facturen (twee termijnen op één factuur) blijven via overschrijving
  if (!f || f.status === 'betaald' || f.status === 'concept' || f.betaling_50_50) return null

  const cent = bedragCent(f)
  if (cent <= 0) return null

  const vandaag = new Date().toISOString().slice(0, 10)
  const verloopt = f.tikkie_verloopt ? new Date(f.tikkie_verloopt).toISOString().slice(0, 10) : null
  if (f.tikkie_url && f.tikkie_bedrag_cent === cent && verloopt && verloopt > vandaag) return f.tikkie_url

  const nieuw = await tikkie<TikkieVerzoek>('POST', 'paymentrequests', {
    description: `Factuur ${f.factuurnummer}`.slice(0, 35),
    amountInCents: cent,
    referenceId: String(f.factuurnummer).slice(0, 35),
  })
  await sql`
    UPDATE facturen SET
      tikkie_token = ${nieuw.paymentRequestToken},
      tikkie_url = ${nieuw.url},
      tikkie_bedrag_cent = ${cent},
      tikkie_verloopt = ${nieuw.expiryDate ?? null}
    WHERE id = ${factuurId}
  `
  return nieuw.url
}

/**
 * Vraagt bij Tikkie na of een betaalverzoek betaald is en zet de bijbehorende factuur
 * dan op 'betaald'. De status komt altijd van Tikkie zelf, dus een vervalst
 * webhook-bericht kan geen factuur op betaald zetten.
 */
export async function verwerkTikkieBetaling(paymentRequestToken: string): Promise<'betaald' | 'open' | 'onbekend'> {
  if (!tikkieAan() || !/^[A-Za-z0-9_-]{1,100}$/.test(paymentRequestToken)) return 'onbekend'
  await ensureTikkieKolommen()
  const verzoek = await tikkie<TikkieVerzoek>('GET', `paymentrequests/${paymentRequestToken}`)

  // Ook een oudere Tikkie van dezelfde factuur telt: zoek op token én op factuurnummer
  const rows = await sql`
    SELECT id, factuurnummer, status, regels, btw_pct FROM facturen
    WHERE tikkie_token = ${paymentRequestToken}
       OR (${verzoek.referenceId ?? null}::text IS NOT NULL AND factuurnummer = ${verzoek.referenceId ?? null})
    LIMIT 1
  `
  const f: any = rows[0]
  if (!f) return 'onbekend'
  if (f.status === 'betaald') return 'betaald'

  if ((verzoek.totalAmountPaidInCents ?? 0) < bedragCent(f)) return 'open'

  await verwerkBetaling(f.id, 'tikkie')
  return 'betaald'
}

/** Vangnet: controleer de Tikkie van één factuur (bij openen in portaal/CRM). */
export async function controleerTikkieFactuur(factuurId: number): Promise<boolean> {
  if (!tikkieAan()) return false
  await ensureTikkieKolommen()
  const rows = await sql`SELECT tikkie_token, status FROM facturen WHERE id = ${factuurId}`
  const f: any = rows[0]
  if (!f?.tikkie_token || f.status === 'betaald') return f?.status === 'betaald'
  try {
    return (await verwerkTikkieBetaling(f.tikkie_token)) === 'betaald'
  } catch (err) {
    console.error('[tikkie controle]', err)
    return false
  }
}

/** Vangnet voor de dagelijkse cron: alle openstaande facturen met een Tikkie. */
export async function controleerOpenTikkies(): Promise<string[]> {
  if (!tikkieAan()) return []
  await ensureTikkieKolommen()
  const rows = await sql`
    SELECT id, factuurnummer, tikkie_token FROM facturen
    WHERE tikkie_token IS NOT NULL AND status IN ('verstuurd', 'te_laat')
  `
  const betaald: string[] = []
  for (const r of rows as any[]) {
    try {
      if ((await verwerkTikkieBetaling(r.tikkie_token)) === 'betaald') betaald.push(r.factuurnummer)
    } catch (err) {
      console.error('[tikkie cron]', r.factuurnummer, err)
    }
  }
  return betaald
}

/** Meld de webhook-URL aan bij Tikkie (eenmalig, via Instellingen → Boekhouding). */
export async function abonneerTikkieMeldingen(url: string): Promise<string> {
  const res = await tikkie<{ subscriptionId: string }>('POST', 'paymentrequestssubscription', { url })
  return res.subscriptionId
}

/** QR-code met de Tikkie-link: te scannen met de gewone telefooncamera. */
export async function tikkieQrSvg(url: string) {
  return QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, width: 180 })
}
