-- Ozvolt CRM — PostgreSQL schema (Neon)
-- Voer dit eenmalig uit via Neon console of psql

CREATE TABLE IF NOT EXISTS klanten (
  id            SERIAL PRIMARY KEY,
  naam          VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  telefoon      VARCHAR(50),
  type          VARCHAR(20) DEFAULT 'Particulier',
  locatie       VARCHAR(255),
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS klussen (
  id            SERIAL PRIMARY KEY,
  klant_id      INTEGER NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  type_werk     VARCHAR(255),
  omschrijving  TEXT,
  status        VARCHAR(30) DEFAULT 'nieuw',
  product       VARCHAR(255),
  bron          VARCHAR(50) DEFAULT 'contact',
  notities      TEXT,
  gebeld_status VARCHAR(30) DEFAULT 'niet_gebeld',
  gebeld_op     TIMESTAMPTZ,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW(),
  bijgewerkt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offertes (
  id               SERIAL PRIMARY KEY,
  offertenummer    INTEGER NOT NULL,
  klant_id         INTEGER NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  klus_id          INTEGER REFERENCES klussen(id) ON DELETE SET NULL,
  status           VARCHAR(20) DEFAULT 'concept',
  datum            DATE NOT NULL,
  geldig_tot       DATE,
  regels           JSONB NOT NULL DEFAULT '[]',
  korting_pct      NUMERIC(5,2) DEFAULT 0,
  btw_pct          NUMERIC(5,2) DEFAULT 21,
  notities         TEXT,
  accept_token     VARCHAR(64),
  sent_at          TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  reminder_count   INTEGER DEFAULT 0,
  accepted_at      TIMESTAMPTZ,
  accepted_name    VARCHAR(255),
  accepted_email   VARCHAR(255),
  accepted_ip      VARCHAR(64),
  aangemaakt_op    TIMESTAMPTZ DEFAULT NOW(),
  bijgewerkt_op    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facturen (
  id               SERIAL PRIMARY KEY,
  factuurnummer    VARCHAR(20) NOT NULL,
  klant_id         INTEGER NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  klus_id          INTEGER REFERENCES klussen(id) ON DELETE SET NULL,
  offerte_id       INTEGER REFERENCES offertes(id) ON DELETE SET NULL,
  status           VARCHAR(20) DEFAULT 'concept',
  factuurdatum     DATE NOT NULL,
  leverdatum       DATE,
  betalingstermijn SMALLINT DEFAULT 14,
  regels           JSONB NOT NULL DEFAULT '[]',
  btw_pct          NUMERIC(5,2) DEFAULT 21,
  notities         TEXT,
  betaal_token     VARCHAR(64),
  mollie_payment_id VARCHAR(64),
  mollie_status    VARCHAR(30),
  mollie_paid_at   TIMESTAMPTZ,
  aangemaakt_op    TIMESTAMPTZ DEFAULT NOW(),
  bijgewerkt_op    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kosten (
  id            SERIAL PRIMARY KEY,
  klant_id      INTEGER REFERENCES klanten(id) ON DELETE SET NULL,
  klus_id       INTEGER REFERENCES klussen(id) ON DELETE SET NULL,
  datum         DATE NOT NULL,
  categorie     VARCHAR(30) DEFAULT 'overig',
  leverancier   VARCHAR(120),
  omschrijving  VARCHAR(255) NOT NULL,
  bedrag        NUMERIC(10,2) NOT NULL DEFAULT 0,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agenda_items (
  id            SERIAL PRIMARY KEY,
  klant_id      INTEGER REFERENCES klanten(id) ON DELETE SET NULL,
  klus_id       INTEGER REFERENCES klussen(id) ON DELETE SET NULL,
  titel         VARCHAR(255) NOT NULL,
  datum_start   TIMESTAMPTZ NOT NULL,
  datum_eind    TIMESTAMPTZ,
  notities      TEXT,
  status        VARCHAR(20) DEFAULT 'gepland',
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id            SERIAL PRIMARY KEY,
  klant_id      INTEGER REFERENCES klanten(id) ON DELETE SET NULL,
  klus_id       INTEGER REFERENCES klussen(id) ON DELETE SET NULL,
  wa_message_id VARCHAR(255),
  direction     VARCHAR(10) NOT NULL,
  status        VARCHAR(30),
  from_number   VARCHAR(32),
  to_number     VARCHAR(32),
  body          TEXT,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(30) DEFAULT 'info',
  titel         VARCHAR(255) NOT NULL,
  bericht       TEXT,
  link          VARCHAR(500),
  gelezen       BOOLEAN DEFAULT FALSE,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

-- Indexen voor snelheid
CREATE INDEX IF NOT EXISTS idx_klussen_status    ON klussen(status);
CREATE INDEX IF NOT EXISTS idx_klussen_klant_id  ON klussen(klant_id);
CREATE INDEX IF NOT EXISTS idx_klussen_datum     ON klussen(aangemaakt_op DESC);
CREATE INDEX IF NOT EXISTS idx_offertes_klant_id ON offertes(klant_id);
CREATE INDEX IF NOT EXISTS idx_offertes_status   ON offertes(status);
CREATE INDEX IF NOT EXISTS idx_offertes_klus_id  ON offertes(klus_id);
CREATE INDEX IF NOT EXISTS idx_offertes_token    ON offertes(accept_token);
CREATE INDEX IF NOT EXISTS idx_facturen_klant_id ON facturen(klant_id);
CREATE INDEX IF NOT EXISTS idx_facturen_status   ON facturen(status);
CREATE INDEX IF NOT EXISTS idx_facturen_klus_id  ON facturen(klus_id);
CREATE INDEX IF NOT EXISTS idx_agenda_datum      ON agenda_items(datum_start);
CREATE INDEX IF NOT EXISTS idx_notif_gelezen     ON admin_notifications(gelezen);
