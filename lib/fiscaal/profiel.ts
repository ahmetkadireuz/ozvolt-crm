import { sql } from '@/lib/db'

/* ============================================================
   Fiscaal profiel per jaar: loondienstgegevens + keuzes.
   Tabel wordt lazy aangemaakt, net als elders in dit CRM.
   ============================================================ */

let _ensured = false

export async function ensureFiscaalTables(): Promise<void> {
  if (_ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS fiscaal_profiel (
      jaar                     INTEGER PRIMARY KEY,
      loon_cumulatief          NUMERIC(12,2) NOT NULL DEFAULT 0,
      loonheffing_cumulatief   NUMERIC(12,2) NOT NULL DEFAULT 0,
      loon_tm_maand            INTEGER NOT NULL DEFAULT 0,
      extra_loon               NUMERIC(12,2) NOT NULL DEFAULT 0,
      start_datum              DATE,
      uren_loondienst_per_week NUMERIC(5,2) NOT NULL DEFAULT 40,
      urencriterium            BOOLEAN NOT NULL DEFAULT FALSE,
      starter                  BOOLEAN NOT NULL DEFAULT TRUE,
      reserve_apart            NUMERIC(12,2) NOT NULL DEFAULT 0,
      bijgewerkt_op            TIMESTAMPTZ DEFAULT NOW()
    )
  `
  _ensured = true
}

export type FiscaalProfiel = {
  jaar: number
  loon_cumulatief: number
  loonheffing_cumulatief: number
  loon_tm_maand: number
  extra_loon: number
  start_datum: string | null
  uren_loondienst_per_week: number
  urencriterium: boolean
  starter: boolean
  reserve_apart: number
  bijgewerkt_op: string | null
}

export function standaardProfiel(jaar: number): FiscaalProfiel {
  return {
    jaar,
    loon_cumulatief: 0,
    loonheffing_cumulatief: 0,
    loon_tm_maand: 0,
    extra_loon: 0,
    start_datum: jaar === 2026 ? '2026-02-01' : `${jaar}-01-01`,
    uren_loondienst_per_week: 40,
    urencriterium: false,
    starter: true,
    reserve_apart: 0,
    bijgewerkt_op: null,
  }
}

export async function haalProfiel(jaar: number): Promise<FiscaalProfiel> {
  await ensureFiscaalTables()
  const rows = await sql`SELECT * FROM fiscaal_profiel WHERE jaar = ${jaar}`
  if (!rows[0]) return standaardProfiel(jaar)
  const r: any = rows[0]
  return {
    jaar: r.jaar,
    loon_cumulatief: Number(r.loon_cumulatief),
    loonheffing_cumulatief: Number(r.loonheffing_cumulatief),
    loon_tm_maand: Number(r.loon_tm_maand),
    extra_loon: Number(r.extra_loon),
    start_datum: r.start_datum ? new Date(r.start_datum).toISOString().slice(0, 10) : null,
    uren_loondienst_per_week: Number(r.uren_loondienst_per_week),
    urencriterium: !!r.urencriterium,
    starter: !!r.starter,
    reserve_apart: Number(r.reserve_apart),
    bijgewerkt_op: r.bijgewerkt_op,
  }
}

export async function bewaarProfiel(p: FiscaalProfiel) {
  await ensureFiscaalTables()
  await sql`
    INSERT INTO fiscaal_profiel (jaar, loon_cumulatief, loonheffing_cumulatief, loon_tm_maand, extra_loon,
      start_datum, uren_loondienst_per_week, urencriterium, starter, reserve_apart, bijgewerkt_op)
    VALUES (${p.jaar}, ${p.loon_cumulatief}, ${p.loonheffing_cumulatief}, ${p.loon_tm_maand}, ${p.extra_loon},
      ${p.start_datum}, ${p.uren_loondienst_per_week}, ${p.urencriterium}, ${p.starter}, ${p.reserve_apart}, NOW())
    ON CONFLICT (jaar) DO UPDATE SET
      loon_cumulatief = EXCLUDED.loon_cumulatief,
      loonheffing_cumulatief = EXCLUDED.loonheffing_cumulatief,
      loon_tm_maand = EXCLUDED.loon_tm_maand,
      extra_loon = EXCLUDED.extra_loon,
      start_datum = EXCLUDED.start_datum,
      uren_loondienst_per_week = EXCLUDED.uren_loondienst_per_week,
      urencriterium = EXCLUDED.urencriterium,
      starter = EXCLUDED.starter,
      reserve_apart = EXCLUDED.reserve_apart,
      bijgewerkt_op = NOW()
  `
}

/** Verwacht jaarloon + loonheffing, doorgetrokken vanaf de cumulatieven op de loonstrook */
export function verwachtLoon(p: FiscaalProfiel) {
  if (p.loon_tm_maand <= 0 || p.loon_cumulatief <= 0) return null
  const factor = 12 / Math.min(12, p.loon_tm_maand)
  const loon = p.loon_cumulatief * factor + p.extra_loon
  const lhPct = p.loonheffing_cumulatief / p.loon_cumulatief
  const loonheffing = p.loonheffing_cumulatief * factor + p.extra_loon * lhPct
  return { loon, loonheffing }
}
