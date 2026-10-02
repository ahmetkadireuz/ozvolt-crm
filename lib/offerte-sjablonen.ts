import { sql } from '@/lib/db'

let _uoKolom = false
/** Lazy: kolom uo_items op offertes (Uitgangspunten & opties). */
export async function ensureUoKolom(): Promise<void> {
  if (_uoKolom) return
  await sql`ALTER TABLE offertes ADD COLUMN IF NOT EXISTS uo_items JSONB DEFAULT '[]'`
  _uoKolom = true
}

let _sjablonen = false
/** Lazy: tabel offerte_sjablonen. Er wordt niets automatisch gevuld. */
export async function ensureSjablonenTabel(): Promise<void> {
  if (_sjablonen) return
  await sql`
    CREATE TABLE IF NOT EXISTS offerte_sjablonen (
      id SERIAL PRIMARY KEY,
      soort TEXT NOT NULL DEFAULT 'uitgangspunt',
      titel TEXT NOT NULL DEFAULT '',
      tekst TEXT NOT NULL DEFAULT '',
      meerprijs NUMERIC(10,2),
      volgorde INTEGER NOT NULL DEFAULT 0,
      aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  _sjablonen = true
}

export function sjabloonUitRij(r: any) {
  return {
    id: Number(r.id),
    soort: r.soort === 'optie' ? 'optie' : 'uitgangspunt',
    titel: r.titel ?? '',
    tekst: r.tekst ?? '',
    meerprijs: r.meerprijs === null || r.meerprijs === undefined ? null : Number(r.meerprijs),
    volgorde: Number(r.volgorde ?? 0),
  }
}
