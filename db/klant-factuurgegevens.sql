-- Factuurgegevens per klant — voer uit via Neon SQL Editor
--
-- Waarom: de klant had alleen een vrij tekstveld `locatie`, dat tegelijk
-- als werklocatie en als factuuradres werd gebruikt. Een klant die op zijn
-- eigen adres werk laat doen maar op een bedrijfsnaam gefactureerd wil
-- worden, kon niet goed worden vastgelegd.
--
-- `locatie` blijft ongewijzigd in gebruik als werk-/installatielocatie
-- (groepenverklaring en opleveringsrapport lezen dat veld).

ALTER TABLE klanten ADD COLUMN IF NOT EXISTS factuur_naam     VARCHAR(255);
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS factuur_adres    VARCHAR(255);
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS factuur_postcode VARCHAR(16);
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS factuur_plaats   VARCHAR(120);

-- Factuuradres invullen voor een bestaande klant.
-- Stap 1 — zoek het juiste id en controleer dat je één regel terugkrijgt:
--
--   SELECT id, naam, email, locatie FROM klanten WHERE naam ILIKE '%rodrigues%';
--
-- Stap 2 — vul het id in en voer de update uit:
--
--   UPDATE klanten SET
--     factuur_naam     = 'Monitron Service',
--     factuur_adres    = 'De Charmotte 9',
--     factuur_postcode = '4191 GT',
--     factuur_plaats   = 'Geldermalsen'
--   WHERE id = <vul hier het id in>;
--
-- Of doe het zonder SQL via Klanten > klant openen > Factuurgegevens.
