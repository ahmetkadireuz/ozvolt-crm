-- Inkoop tabellen — voer uit via Neon SQL Editor
CREATE TABLE IF NOT EXISTS inkoop_lijsten (
  id            SERIAL PRIMARY KEY,
  klus_id       INTEGER REFERENCES klussen(id) ON DELETE CASCADE,
  klant_id      INTEGER REFERENCES klanten(id) ON DELETE SET NULL,
  titel         VARCHAR(255) NOT NULL,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inkoop_items (
  id              SERIAL PRIMARY KEY,
  lijst_id        INTEGER NOT NULL REFERENCES inkoop_lijsten(id) ON DELETE CASCADE,
  omschrijving    VARCHAR(255) NOT NULL,
  artikelnummer   VARCHAR(80),
  aantal          NUMERIC(8,2) DEFAULT 1,
  eenheid         VARCHAR(30) DEFAULT 'stuk',
  leverancier     VARCHAR(120),
  prijs_ex_btw    NUMERIC(10,2),
  afgevinkt       BOOLEAN DEFAULT FALSE,
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW()
);

-- Migratie voor bestaande installaties (veilig om opnieuw te draaien):
ALTER TABLE inkoop_items ADD COLUMN IF NOT EXISTS artikelnummer VARCHAR(80);
ALTER TABLE inkoop_items ADD COLUMN IF NOT EXISTS prijs_ex_btw NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_inkoop_lijsten_klus ON inkoop_lijsten(klus_id);
CREATE INDEX IF NOT EXISTS idx_inkoop_items_lijst  ON inkoop_items(lijst_id);
