# Bot-API (alleen-lezen)

Read-only API waarmee de Claude-bots van Ozvolt (offertebot, calculator) offertes en klanten uit het CRM kunnen lezen — zonder admin-login en zonder iets te kunnen wijzigen.

- Alleen `GET`; `POST`/`PUT`/`PATCH`/`DELETE` geven `405`.
- Alleen `SELECT`-queries. Geen tokens (publieke links, magic links), wachtwoorden, betaallinks of Moneybird-gegevens in de antwoorden.
- Alle antwoorden: JSON met `Cache-Control: no-store`. Bedragen zijn getallen (euro's, afgerond op 2 decimalen).

## Beveiliging

Elke aanvraag heeft de header `Authorization: Bearer <sleutel>` nodig. De sleutel wordt constant-time (`crypto.timingSafeEqual`) vergeleken met de env-variabele `BOT_API_KEY`. Ontbreekt `BOT_API_KEY` of klopt de sleutel niet → `401` met:

```json
{ "fout": "Geen toegang" }
```

`/api/bot` (en sub-paden) is in `middleware.ts` uitgezonderd van de admin-sessiecheck; de routes controleren de sleutel zelf (`lib/bot-auth.ts`).

## Endpoints

### `GET /api/bot/offertes`

| Parameter | Betekenis |
|---|---|
| `zoek` | Optioneel. Zoekt case-insensitive op klantnaam, offertenummer (`OZVT-0012`, `12`) en titel |
| `status` | Optioneel. `concept`, `gestuurd`, `geaccepteerd`, `verlopen`, `geweigerd` |
| `limit` | Optioneel. Standaard 20, maximaal 100 |

Nieuwste eerst. Antwoord:

```json
{
  "aantal": 1,
  "offertes": [
    { "id": 12, "offertenummer": "OZVT-0012", "titel": "Groepenkast vervangen", "status": "gestuurd",
      "datum": "2026-09-20", "klant_id": 4, "klant_naam": "Rajko …",
      "totaal_ex_btw": 1450, "totaal_incl_btw": 1754.5 }
  ]
}
```

`titel` = het werktype van het gekoppelde project, anders de omschrijving van de eerste regel (offertes hebben geen eigen titelveld).

### `GET /api/bot/offertes/[id]`

Eén offerte compleet: kopgegevens (`offertenummer`, `titel`, `status`, `status_notitie`, `datum`, `geldig_tot`, `verstuurd_op`, `geaccepteerd_op`, `geaccepteerd_door`, `notities_intern`), `regels` (omschrijving, beschrijving, aantal, `prijs_ex_btw`, `btw_tarief`, `regeltotaal_ex_btw`), `uitgangspunten`, `opties` (met `meerprijs_ex_btw`), `betaalplan` (`volledig` of `50/50` met termijnen), `totalen`, `klant` (naam, plaats, type, e-mail, telefoon) en `project` (gekoppelde klus, of `null`). Onbekend id → `404`.

### `GET /api/bot/klanten`

| Parameter | Betekenis |
|---|---|
| `zoek` | Optioneel. Zoekt case-insensitive op naam en plaats |
| `limit` | Optioneel. Standaard 20, maximaal 100 |

Antwoord: `{ "aantal": n, "klanten": [{ "id", "naam", "plaats", "type", "offerte_ids": [...] }] }`.

## Voorbeelden

```bash
CRM=https://portaal.ozvoltelektro.nl

curl -s -H "Authorization: Bearer $CRM_BOT_KEY" "$CRM/api/bot/offertes?zoek=rajko"
curl -s -H "Authorization: Bearer $CRM_BOT_KEY" "$CRM/api/bot/offertes?status=concept&limit=5"
curl -s -H "Authorization: Bearer $CRM_BOT_KEY" "$CRM/api/bot/offertes/12"
curl -s -H "Authorization: Bearer $CRM_BOT_KEY" "$CRM/api/bot/klanten?zoek=rajko"
```

## Sleutel instellen

1. Maak een lange willekeurige sleutel, bijv. `openssl rand -hex 32`.
2. **Vercel**: project → *Settings* → *Environment Variables* → `BOT_API_KEY` = de sleutel (Production, en eventueel Preview). Daarna opnieuw deployen, anders is de variabele nog niet actief.
3. **Claude-cloudomgeving** (waar de bots draaien): zet dezelfde waarde als `CRM_BOT_KEY` en voeg het CRM-domein (bijv. `portaal.ozvoltelektro.nl`) toe aan de toegestane domeinen van het netwerkbeleid.
4. Sleutel uitgelekt? Zet een nieuwe waarde in beide plekken en deploy opnieuw; de oude werkt dan direct niet meer.
