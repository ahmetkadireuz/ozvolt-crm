# Bot-API (alleen-lezen)

Read-only API waarmee de Claude-bots van Ozvolt gegevens uit het CRM (en via het CRM uit Moneybird) kunnen lezen — zonder admin-login en zonder iets te kunnen wijzigen.

- Alleen `GET`; `POST`/`PUT`/`PATCH`/`DELETE` geven `405`.
- Alleen `SELECT`-queries en Moneybird-`GET`-verzoeken. De bot-API maakt geen tabellen of kolommen aan; ontbreekt een (lazy aangemaakte) tabel, dan komt er een lege lijst terug.
- Geen tokens (publieke links, magic links, betaallinks), wachtwoorden, IP-adressen of Moneybird-credentials in de antwoorden. De Moneybird-token blijft in het CRM.
- Alle antwoorden: JSON met `Cache-Control: no-store`. Bedragen zijn getallen (euro's, afgerond op 2 decimalen). Datums als `YYYY-MM-DD`.

## Eerste stap bij een 401: `GET /api/bot/status`

Werkt ook **zonder** geldige sleutel en laat zien waarom een aanvraag geweigerd wordt — zonder ooit (delen van) sleutels, lengtes of hashes te tonen. Altijd `200`, `Cache-Control: no-store`; andere methodes `405`.

```json
{
  "header_ontvangen": true,
  "vorm": "bearer",
  "crm_sleutel_ingesteld": true,
  "finance_sleutel_ingesteld": true,
  "scope": null
}
```

| Veld | Betekenis |
|---|---|
| `header_ontvangen` | Er kwam een (niet-lege) sleutel binnen in een van de geaccepteerde headers |
| `vorm` | `bearer`, `kaal`, `x-api-key` of `null` (geen sleutel ontvangen) |
| `crm_sleutel_ingesteld` / `finance_sleutel_ingesteld` | `BOT_API_KEY` / `BOT_API_KEY_FINANCE` is in de omgeving gezet (niet leeg na trimmen) |
| `scope` | `crm`, `finance` of `null` (sleutel klopt niet) |

Lezen: `header_ontvangen: false` → de bot stuurt geen header mee. Sleutel ingesteld maar `scope: null` → de bot stuurt een andere sleutel dan in Vercel staat. `…_ingesteld: false` → env-variabele ontbreekt in Vercel (na wijzigen opnieuw deployen).

## Sleutels en scopes

Elke aanvraag heeft een sleutel nodig, in een van deze headers (de eerste niet-lege telt):

1. `Authorization: Bearer <sleutel>` (aanbevolen; `Bearer` hoofdletterongevoelig)
2. `Authorization: <sleutel>` (zonder `Bearer`)
3. `X-API-Key: <sleutel>`

Spaties en enters aan begin of eind worden genegeerd, zowel in de header als in de env-variabele (handig bij plakken in Vercel). Een env-variabele die na trimmen leeg is, telt als niet ingesteld. De sleutel wordt constant-time (`crypto.timingSafeEqual`) vergeleken met beide env-variabelen:

| Env-variabele (Vercel) | Scope | Mag lezen |
|---|---|---|
| `BOT_API_KEY` | **crm** | Alle CRM-endpoints, níet `/api/bot/moneybird/*` |
| `BOT_API_KEY_FINANCE` | **finance** | Alle CRM-endpoints **+** `/api/bot/moneybird/*` |

| Bot | Sleutel (in de Claude-cloudomgeving) |
|---|---|
| Offertebot | `CRM_BOT_KEY` (= `BOT_API_KEY`) |
| Calculator | `CRM_BOT_KEY` (= `BOT_API_KEY`) |
| Boekhouder | `CRM_BOT_KEY_FINANCE` (= `BOT_API_KEY_FINANCE`) |
| CRM-hoofd | `CRM_BOT_KEY_FINANCE` (= `BOT_API_KEY_FINANCE`) |

Foutantwoorden:

| Situatie | Status | Body |
|---|---|---|
| Geen, foute of niet-ingestelde sleutel | `401` | `{ "fout": "Geen toegang" }` |
| crm-sleutel op `/api/bot/moneybird/*` | `403` | `{ "fout": "Geen toegang tot Moneybird" }` |
| Andere methode dan GET | `405` | `{ "fout": "Methode niet toegestaan" }` |
| Ongeldig / onbekend id | `400` / `404` | `{ "fout": "Ongeldig id" }` / `{ "fout": "Niet gevonden" }` |
| Moneybird onbereikbaar | `502` | `{ "fout": "Moneybird ophalen mislukt", "detail": "…" }` |

`/api/bot` (en sub-paden, ook `/api/bot/status`) is in `middleware.ts` uitgezonderd van de admin-sessiecheck; de routes controleren de sleutel zelf (`lib/bot-auth.ts`).

## Gemeenschappelijke parameters (lijsten)

| Parameter | Betekenis |
|---|---|
| `zoek` | Case-insensitive zoeken (zie per endpoint waarop) |
| `limit` | Standaard 20, maximaal 100 |
| `van`, `tot` | Datumfilter `YYYY-MM-DD` (waar genoemd) |
| `klus_id` | Filter op project (waar genoemd) |
| `status` | Filter op status (waar genoemd) |

Lijsten zijn altijd nieuwste eerst.

## CRM-endpoints (scope crm)

### `GET /api/bot/offertes`
Filters: `zoek` (klantnaam, offertenummer `OZVT-0012`/`12`, titel), `status` (`concept`, `gestuurd`, `geaccepteerd`, `verlopen`, `geweigerd`), `limit`.
Per offerte: `id`, `offertenummer`, `titel`, `status`, `datum`, `klant_id`, `klant_naam`, `totaal_ex_btw`, `totaal_incl_btw`.
`titel` = werktype van het gekoppelde project, anders de omschrijving van de eerste regel (offertes hebben geen eigen titelveld).

### `GET /api/bot/offertes/[id]`
Kopgegevens (`status_notitie`, `geldig_tot`, `verstuurd_op`, `geaccepteerd_op`, `geaccepteerd_door`, `notities_intern`), `regels` (omschrijving, beschrijving, aantal, `prijs_ex_btw`, `btw_tarief`, `regeltotaal_ex_btw`), `uitgangspunten`, `opties` (`meerprijs_ex_btw`), `betaalplan` (`volledig` of `50/50` met termijnen), `totalen`, `klant`, `project`.

### `GET /api/bot/klanten`
Filters: `zoek` (naam, plaats), `limit`. Per klant: `id`, `naam`, `plaats`, `type`, `offerte_ids`.

### `GET /api/bot/klussen`
Projecten. Filters: `zoek` (klantnaam, werktype, omschrijving, product), `status`, `limit`.
Per project: `id`, `titel`, `status`, `product`, `aangemaakt_op`, klant, `offerte_ids`, `factuur_ids`.

### `GET /api/bot/klussen/[id]`
Eén project voor nacalculatie: klant, `offertes` (met totalen), `facturen`, `uren` (datum, uren, uurloon, bedrag), `kosten`, `inkoop` (lijsten met items en `totaal_ex_btw`), `meerwerk` en een samenvatting `nacalculatie` (omzet geaccepteerde offertes en meerwerk, gefactureerd, uren, kosten, inkoop).

### `GET /api/bot/facturen`
CRM-facturen. Filters: `zoek` (klantnaam, factuurnummer), `status` (`concept`, `verstuurd`, `te_laat`, `betaald`), `van`/`tot` (factuurdatum), `klus_id`, `limit`.
Per factuur: `factuurnummer`, `status`, `betaald`, `factuurdatum`, `vervaldatum`, klant, `totaal_ex_btw`, `totaal_incl_btw`.

### `GET /api/bot/facturen/[id]`
Eén factuur met regels, totalen, `betalingstermijn_dagen`, `vervaldatum`, `in_moneybird`, klant, gekoppeld project/offerte.

### `GET /api/bot/kosten`
Filters: `van`/`tot` (datum), `klus_id`, `zoek` (omschrijving, leverancier, categorie, klantnaam), `limit`.
Geeft ook `aantal_totaal` en `totaal_bedrag` over álle treffers. Kosten staan in het CRM zonder btw-splitsing.

### `GET /api/bot/inkoop`
Inkooplijsten (materiaal) met items. Filters: `van`/`tot` (aanmaakdatum lijst), `klus_id`, `zoek` (titel, klantnaam, item, leverancier, artikelnummer), `limit`.

### `GET /api/bot/fiscaal?jaar=2026`
Hergebruikt `lib/fiscaal` (profiel, tarieven, urencriterium-berekening):
- `urencriterium`: gewerkte projecturen (uit `project_uren`), minimum, uren nodig naast loondienst, nog nodig, gehaald.
- `btw_per_kwartaal`: per kwartaal gewerkte uren, omzet en af te dragen btw over CRM-facturen (geen concepten), per tarief.

Voorbelasting en Moneybird-cijfers: zie `/api/bot/moneybird/btw`.

## Moneybird-endpoints (scope finance)

Gelezen via de bestaande Moneybird-koppeling van het CRM (`lib/moneybird.ts`, alleen `GET`). Zonder `van`/`tot` geldt het lopende jaar.

### `GET /api/bot/moneybird/facturen`
Verkoopfacturen. Filters: `van`/`tot`, `status` (`open`, `te_laat`, `betaald`, `concept`), `zoek` (klant, factuurnummer, referentie), `limit`.
Per factuur: `factuurnummer`, `status` (Moneybird-state), `open_post`, `klant`, `factuurdatum`, `vervaldatum`, `betaald_op`, `totaal_ex_btw`, `btw`, `totaal_incl_btw`, `openstaand`. Plus `open_posten` (aantal, openstaand totaal, te laat).

### `GET /api/bot/moneybird/inkoop`
Inkoopfacturen en bonnetjes. Filters: `van`/`tot`, `soort` (`inkoopfactuur`, `bon`), `zoek` (leverancier, referentie, regelomschrijving), `limit`.
Per document: leverancier, datum, status, totalen, btw, `heeft_bijlage`, regels met grootboekrekening.

### `GET /api/bot/moneybird/btw?kwartaal=2026-Q3`
Moneybird biedt geen btw-aangifte via de API; het overzicht wordt samengesteld uit verkoopfacturen (af te dragen btw) en inkoopfacturen + bonnen (voorbelasting). Geeft `af_te_dragen_btw`, `voorbelasting`, `saldo`. Indicatie — verlegde/niet-aftrekbare btw staat er niet apart in. Zonder `kwartaal` het lopende kwartaal.

### `GET /api/bot/moneybird/sync-status?jaar=2026`
Vergelijkt CRM-facturen met Moneybird: aantal gekoppeld, `niet_in_moneybird`, `gekoppeld_maar_niet_gevonden`, `status_verschillen`, `bedrag_verschillen`, `alleen_in_moneybird`. Er wordt niets gesynchroniseerd.

## Voorbeelden

```bash
CRM=https://portaal.ozvoltelektro.nl

# crm-sleutel
curl -s -H "Authorization: Bearer $CRM_BOT_KEY" "$CRM/api/bot/offertes?zoek=rajko"
curl -s -H "Authorization: Bearer $CRM_BOT_KEY" "$CRM/api/bot/offertes/12"
curl -s -H "Authorization: Bearer $CRM_BOT_KEY" "$CRM/api/bot/klussen/7"
curl -s -H "Authorization: Bearer $CRM_BOT_KEY" "$CRM/api/bot/kosten?van=2026-07-01&tot=2026-09-30"
curl -s -H "Authorization: Bearer $CRM_BOT_KEY" "$CRM/api/bot/fiscaal?jaar=2026"

# finance-sleutel
curl -s -H "Authorization: Bearer $CRM_BOT_KEY_FINANCE" "$CRM/api/bot/moneybird/facturen?status=open"
curl -s -H "Authorization: Bearer $CRM_BOT_KEY_FINANCE" "$CRM/api/bot/moneybird/btw?kwartaal=2026-Q3"
curl -s -H "Authorization: Bearer $CRM_BOT_KEY_FINANCE" "$CRM/api/bot/moneybird/sync-status"
```

## Sleutels instellen

1. Maak twee verschillende lange willekeurige sleutels, bijv. twee keer `openssl rand -hex 32`.
2. **Vercel**: project → *Settings* → *Environment Variables*:
   - `BOT_API_KEY` = sleutel 1
   - `BOT_API_KEY_FINANCE` = sleutel 2

   (Production, eventueel ook Preview.) Daarna opnieuw deployen, anders zijn de variabelen nog niet actief.
3. **Claude-cloudomgeving** (waar de bots draaien):
   - `CRM_BOT_KEY` = sleutel 1
   - `CRM_BOT_KEY_FINANCE` = sleutel 2 (alleen nodig voor boekhouder en CRM-hoofd)
   - Voeg het CRM-domein (bijv. `portaal.ozvoltelektro.nl`) toe aan de toegestane domeinen van het netwerkbeleid.
4. Sleutel uitgelekt? Zet een nieuwe waarde op beide plekken en deploy opnieuw; de oude werkt dan direct niet meer.
