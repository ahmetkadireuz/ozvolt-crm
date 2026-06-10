import { sql } from '@/lib/db'

/* ============================================================
   Projectbeheer — uren, taken, meerwerk (overgenomen uit het
   losse PHP-pakket "Ozvolt CRM — Projecten & Oplevering").
   Tabellen worden lazy aangemaakt, net als elders in dit CRM.
   ============================================================ */

let _ensured = false

export async function ensureProjectbeheerTables(): Promise<void> {
  if (_ensured) return

  await sql`
    CREATE TABLE IF NOT EXISTS project_uren (
      id            SERIAL PRIMARY KEY,
      klus_id       INTEGER NOT NULL REFERENCES klussen(id) ON DELETE CASCADE,
      datum         DATE NOT NULL DEFAULT CURRENT_DATE,
      uren          NUMERIC(5,2) NOT NULL DEFAULT 0,
      uurloon       NUMERIC(6,2) NOT NULL DEFAULT 65,
      omschrijving  VARCHAR(255),
      aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_project_uren_klus ON project_uren(klus_id)`

  await sql`
    CREATE TABLE IF NOT EXISTS project_taken (
      id            SERIAL PRIMARY KEY,
      klus_id       INTEGER NOT NULL REFERENCES klussen(id) ON DELETE CASCADE,
      omschrijving  VARCHAR(255) NOT NULL,
      gereed        BOOLEAN NOT NULL DEFAULT FALSE,
      aantal_totaal NUMERIC(8,2) NOT NULL DEFAULT 1,
      aantal_klaar  NUMERIC(8,2) NOT NULL DEFAULT 0,
      toelichting   TEXT,
      fotos         JSONB NOT NULL DEFAULT '[]',
      volgorde      INTEGER NOT NULL DEFAULT 0,
      gereed_op     TIMESTAMPTZ,
      aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_project_taken_klus ON project_taken(klus_id)`

  await sql`
    CREATE TABLE IF NOT EXISTS project_meerwerk (
      id            SERIAL PRIMARY KEY,
      klus_id       INTEGER NOT NULL REFERENCES klussen(id) ON DELETE CASCADE,
      omschrijving  VARCHAR(255) NOT NULL,
      bedrag        NUMERIC(10,2) NOT NULL DEFAULT 0,
      status        VARCHAR(20) NOT NULL DEFAULT 'voorgesteld',
      accepted_at   TIMESTAMPTZ,
      accepted_name VARCHAR(160),
      aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_project_meerwerk_klus ON project_meerwerk(klus_id)`

  // Opleveringsrapporten uitbreiden met checklist + handtekeningen
  await sql`ALTER TABLE opleveringsrapporten ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'vrij'`
  await sql`ALTER TABLE opleveringsrapporten ADD COLUMN IF NOT EXISTS inhoud JSONB`
  await sql`ALTER TABLE opleveringsrapporten ADD COLUMN IF NOT EXISTS handtekening_monteur TEXT`
  await sql`ALTER TABLE opleveringsrapporten ADD COLUMN IF NOT EXISTS handtekening_klant TEXT`
  await sql`ALTER TABLE opleveringsrapporten ADD COLUMN IF NOT EXISTS getekend_op TIMESTAMPTZ`

  _ensured = true
}

export type ProjectUur = {
  id: number
  klus_id: number
  datum: string
  uren: number
  uurloon: number
  omschrijving: string | null
}

export type ProjectTaak = {
  id: number
  klus_id: number
  omschrijving: string
  gereed: boolean
  aantal_totaal: number
  aantal_klaar: number
  toelichting: string | null
  fotos: string[]
  volgorde: number
}

export type Meerwerk = {
  id: number
  klus_id: number
  omschrijving: string
  bedrag: number
  status: 'voorgesteld' | 'geaccepteerd' | 'geweigerd'
  accepted_at: string | null
  accepted_name: string | null
}

export type RapportRij = { punt: string; waarde: '' | 'ja' | 'nee' | 'nvt'; opmerking: string }
export type RapportSectie = { titel: string; rijen: RapportRij[] }
export type RapportInhoud = { type: string; datum: string; secties: RapportSectie[]; aanvullend: string }

/** Voortgang van een klus: elke taak telt even zwaar, deelvoortgang via aantallen. */
export function berekenVoortgang(taken: Pick<ProjectTaak, 'gereed' | 'aantal_totaal' | 'aantal_klaar'>[]) {
  const totaal = taken.length
  if (totaal === 0) return { totaal: 0, klaar: 0, pct: 0 }
  let klaar = 0
  let som = 0
  for (const t of taken) {
    const tot = Number(t.aantal_totaal) || 1
    const kl = Number(t.aantal_klaar) || 0
    const fractie = t.gereed ? 1 : Math.min(kl / tot, 1)
    if (fractie >= 1) klaar++
    som += fractie
  }
  return { totaal, klaar, pct: Math.round((som / totaal) * 100) }
}
