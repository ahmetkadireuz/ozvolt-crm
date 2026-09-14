-- Documenttype per offerte — voer uit via Neon SQL Editor
--
-- Een grote klus (meterkast vervangen) gaat als werkvoorstel naar de klant,
-- een kleine klus (perilex aansluiten) als offerte. De naam die de klant ziet
-- hangt dus af van de klus, niet van een vaste instelling.
--
-- De nummering blijft één doorlopende reeks voor beide, want een
-- offertenummer hoort uniek en oplopend te zijn.

ALTER TABLE offertes ADD COLUMN IF NOT EXISTS documenttype VARCHAR(20) DEFAULT 'offerte';

-- Bestaande offertes houden 'offerte'. Wil je er een omzetten naar
-- werkvoorstel, dan kan dat gewoon in het CRM op de offertepagina.
