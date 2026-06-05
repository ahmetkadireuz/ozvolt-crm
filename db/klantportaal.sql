-- Klantportaal migratie — voer uit via Neon console

CREATE TABLE IF NOT EXISTS klant_sessies (
  id            SERIAL PRIMARY KEY,
  klant_id      INTEGER NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  token_hash    VARCHAR(128) NOT NULL UNIQUE,
  verlopen_op   TIMESTAMPTZ NOT NULL,
  gebruikt_op   TIMESTAMPTZ,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opleveringsrapporten (
  id            SERIAL PRIMARY KEY,
  klus_id       INTEGER NOT NULL REFERENCES klussen(id) ON DELETE CASCADE,
  klant_id      INTEGER NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  titel         VARCHAR(255) DEFAULT 'Opleveringsrapport',
  notities      TEXT,
  fotos         JSONB NOT NULL DEFAULT '[]',
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW(),
  bijgewerkt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_klant_sessies_token ON klant_sessies(token_hash);
CREATE INDEX IF NOT EXISTS idx_klant_sessies_klant ON klant_sessies(klant_id);
CREATE INDEX IF NOT EXISTS idx_oplever_klus        ON opleveringsrapporten(klus_id);
CREATE INDEX IF NOT EXISTS idx_oplever_klant       ON opleveringsrapporten(klant_id);

CREATE TABLE IF NOT EXISTS groenverklaringen (
  id            SERIAL PRIMARY KEY,
  klant_id      INTEGER NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  naam          VARCHAR(255) NOT NULL,
  url           TEXT NOT NULL,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groenverk_klant ON groenverklaringen(klant_id);
