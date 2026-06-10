-- ============================================================
-- Projectbeheer: uren, taken/voortgang, meerwerk + uitgebreide
-- opleveringsrapporten (checklist + handtekeningen).
-- Wordt ook automatisch aangemaakt via lib/projectbeheer.ts —
-- dit bestand is documentatie / handmatige import.
-- ============================================================

CREATE TABLE IF NOT EXISTS project_uren (
  id            SERIAL PRIMARY KEY,
  klus_id       INTEGER NOT NULL REFERENCES klussen(id) ON DELETE CASCADE,
  datum         DATE NOT NULL DEFAULT CURRENT_DATE,
  uren          NUMERIC(5,2) NOT NULL DEFAULT 0,
  uurloon       NUMERIC(6,2) NOT NULL DEFAULT 65,
  omschrijving  VARCHAR(255),
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_uren_klus ON project_uren(klus_id);

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
);
CREATE INDEX IF NOT EXISTS idx_project_taken_klus ON project_taken(klus_id);

CREATE TABLE IF NOT EXISTS project_meerwerk (
  id            SERIAL PRIMARY KEY,
  klus_id       INTEGER NOT NULL REFERENCES klussen(id) ON DELETE CASCADE,
  omschrijving  VARCHAR(255) NOT NULL,
  bedrag        NUMERIC(10,2) NOT NULL DEFAULT 0,
  status        VARCHAR(20) NOT NULL DEFAULT 'voorgesteld', -- voorgesteld | geaccepteerd | geweigerd
  accepted_at   TIMESTAMPTZ,
  accepted_name VARCHAR(160),
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_meerwerk_klus ON project_meerwerk(klus_id);

-- Opleveringsrapporten: checklist (inhoud JSONB) + handtekeningen
ALTER TABLE opleveringsrapporten ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'vrij'; -- groepenkast | laadpaal | werkzaamheden | vrij
ALTER TABLE opleveringsrapporten ADD COLUMN IF NOT EXISTS inhoud JSONB;                    -- { type, datum, secties: [{titel, rijen: [{punt, waarde, opmerking}]}], aanvullend }
ALTER TABLE opleveringsrapporten ADD COLUMN IF NOT EXISTS handtekening_monteur TEXT;       -- data-URL (PNG)
ALTER TABLE opleveringsrapporten ADD COLUMN IF NOT EXISTS handtekening_klant TEXT;         -- data-URL (PNG)
ALTER TABLE opleveringsrapporten ADD COLUMN IF NOT EXISTS getekend_op TIMESTAMPTZ;
