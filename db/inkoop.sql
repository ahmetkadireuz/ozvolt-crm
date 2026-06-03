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
  aantal          NUMERIC(8,2) DEFAULT 1,
  eenheid         VARCHAR(30) DEFAULT 'stuk',
  leverancier     VARCHAR(120),
  afgevinkt       BOOLEAN DEFAULT FALSE,
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inkoop_lijsten_klus ON inkoop_lijsten(klus_id);
CREATE INDEX IF NOT EXISTS idx_inkoop_items_lijst  ON inkoop_items(lijst_id);
