-- Moneybird kolommen toevoegen aan facturen tabel
-- Voer uit via Neon SQL Editor

ALTER TABLE facturen
  ADD COLUMN IF NOT EXISTS moneybird_id     VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moneybird_url    VARCHAR(500) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_facturen_moneybird_id ON facturen(moneybird_id);
