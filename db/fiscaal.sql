-- ============================================================
-- Fiscale module: profiel per jaar (loondienst + keuzes).
-- Wordt ook automatisch aangemaakt via lib/fiscaal/profiel.ts —
-- dit bestand is documentatie / handmatige import.
-- ============================================================

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
);
