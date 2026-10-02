import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/* ============================================================
   Bot-API (alleen-lezen) — toegang via Authorization: Bearer <BOT_API_KEY>.
   De sleutel wordt nooit gelogd.
   ============================================================ */

const GEEN_HEADERS = { 'Cache-Control': 'no-store' }

/** Constant-time vergelijking van de Bearer-sleutel met BOT_API_KEY. */
export function botSleutelGeldig(req: NextRequest): boolean {
  const verwacht = process.env.BOT_API_KEY
  if (!verwacht) return false
  const header = req.headers.get('authorization') ?? ''
  const m = header.match(/^Bearer\s+(.+)$/i)
  if (!m) return false
  // Hash beide kanten zodat de lengtes gelijk zijn en timingSafeEqual niet gooit
  const a = crypto.createHash('sha256').update(m[1].trim()).digest()
  const b = crypto.createHash('sha256').update(verwacht).digest()
  return crypto.timingSafeEqual(a, b)
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
