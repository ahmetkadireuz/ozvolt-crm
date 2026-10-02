import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/* ============================================================
   Bot-API (alleen-lezen) — toegang via Authorization: Bearer <sleutel>.
   BOT_API_KEY = scope crm, BOT_API_KEY_FINANCE = scope crm + Moneybird.
   De sleutels worden nooit gelogd.
   ============================================================ */

const GEEN_HEADERS = { 'Cache-Control': 'no-store' }

export type BotScope = 'crm' | 'finance'

function sleutelKlopt(gegeven: string, verwacht: string | undefined): boolean {
  if (!verwacht) return false
  // Hash beide kanten zodat de lengtes gelijk zijn en timingSafeEqual niet gooit
  const a = crypto.createHash('sha256').update(gegeven).digest()
  const b = crypto.createHash('sha256').update(verwacht).digest()
  return crypto.timingSafeEqual(a, b)
}

/**
 * Scope van de Bearer-sleutel (constant-time vergeleken):
 *   BOT_API_KEY         → 'crm'      (alle CRM-endpoints)
 *   BOT_API_KEY_FINANCE → 'finance'  (CRM + Moneybird)
 * Geen of foute sleutel → null.
 */
export function botScope(req: NextRequest): BotScope | null {
  const header = req.headers.get('authorization') ?? ''
  const m = header.match(/^Bearer\s+(.+)$/i)
  if (!m) return null
  const gegeven = m[1].trim()
  // Beide altijd vergelijken, zodat de responstijd niet verraadt welke sleutel bestaat
  const finance = sleutelKlopt(gegeven, process.env.BOT_API_KEY_FINANCE)
  const crm = sleutelKlopt(gegeven, process.env.BOT_API_KEY)
  if (finance) return 'finance'
  if (crm) return 'crm'
  return null
}

/** Geeft een foutresponse terug als de sleutel niet volstaat, anders null. */
export function botAuth(req: NextRequest, nodig: BotScope = 'crm'): NextResponse | null {
  const scope = botScope(req)
  if (!scope) return botGeenToegang()
  if (nodig === 'finance' && scope !== 'finance') return botJson({ fout: 'Geen toegang tot Moneybird' }, 403)
  return null
}

export function botJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: GEEN_HEADERS })
}

export function botGeenToegang() {
  return botJson({ fout: 'Geen toegang' }, 401)
}

/** 405 voor alles behalve GET — de bot-API is alleen-lezen. */
export function botMethodeNietToegestaan() {
  return NextResponse.json(
    { fout: 'Methode niet toegestaan' },
    { status: 405, headers: { ...GEEN_HEADERS, Allow: 'GET' } },
  )
}

export const botAlleenLezen = {
  POST: botMethodeNietToegestaan,
  PUT: botMethodeNietToegestaan,
  PATCH: botMethodeNietToegestaan,
  DELETE: botMethodeNietToegestaan,
}

/** Offertenummer zoals op de PDF: OZVT-0012 */
export function offerteNummer(n: number | string) {
  return `OZVT-${String(n).padStart(4, '0')}`
}

/** regels-kolom (JSONB of string) → array */
export function parseRegels(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p } catch {} }
  return []
}

export function rond(n: number) {
  return Math.round(n * 100) / 100
}

/** Datum (DATE/Date) → 'YYYY-MM-DD' of null */
export function datumStr(d: unknown): string | null {
  if (!d) return null
  if (d instanceof Date) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dag = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dag}`
  }
  return String(d).slice(0, 10)
}

/** Gemeenschappelijke lijst-parameters: zoek, limit (standaard 20, max 100), van/tot (YYYY-MM-DD) */
export function lijstParams(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const zoek = (sp.get('zoek') ?? '').trim().slice(0, 100)
  const limitRaw = parseInt(sp.get('limit') ?? '20')
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 100)
  const datum = (k: string) => {
    const v = (sp.get(k) ?? '').trim()
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null
  }
  const idRaw = (k: string) => {
    const v = (sp.get(k) ?? '').trim()
    return /^\d+$/.test(v) ? parseInt(v) : null
  }
  return {
    sp,
    zoek,
    limit,
    /** ILIKE-patroon met ge-escapete jokertekens, of null zonder zoekterm */
    patroon: zoek ? `%${zoek.replace(/[\\%_]/g, m => '\\' + m)}%` : null,
    van: datum('van'),
    tot: datum('tot'),
    klusId: idRaw('klus_id'),
    status: (sp.get('status') ?? '').trim().slice(0, 30) || null,
  }
}

/** Route-param id → getal, of null als het geen positief geheel getal is */
export function parseId(id: string): number | null {
  return /^\d+$/.test(id) ? parseInt(id) : null
}

/** Lege lijst bij een ontbrekende (lazy aangemaakte) tabel — de bot-API maakt nooit tabellen aan */
export const leeg = () => [] as any[]
