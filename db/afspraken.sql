-- Werkafspraken tabel — voer uit via Neon console
CREATE TABLE IF NOT EXISTS werkafspraken (
  id              SERIAL PRIMARY KEY,
  afspraaknummer  INTEGER NOT NULL,
  klant_id        INTEGER NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  klus_id         INTEGER REFERENCES klussen(id) ON DELETE SET NULL,
  offerte_id      INTEGER REFERENCES offertes(id) ON DELETE SET NULL,
  status          VARCHAR(20) DEFAULT 'concept',
  datum           DATE NOT NULL,
  titel           VARCHAR(255),
  afspraken       JSONB NOT NULL DEFAULT '[]',
  notities        TEXT,
  accept_token    VARCHAR(64),
  sent_at         TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  accepted_name   VARCHAR(255),
  accepted_email  VARCHAR(255),
  accepted_ip     VARCHAR(64),
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW(),
  bijgewerkt_op   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_werkafspraken_klant_id ON werkafspraken(klant_id);
CREATE INDEX IF NOT EXISTS idx_werkafspraken_status   ON werkafspraken(status);
CREATE INDEX IF NOT EXISTS idx_werkafspraken_token    ON werkafspraken(accept_token);
