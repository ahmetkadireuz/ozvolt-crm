# Ozvolt CRM — Audit & Documentatie

_Bijgewerkt: 2026-06-05_

---

## Routes overzicht

### Admin (beveiligd via middleware sessie)

| Route | Doel |
|---|---|
| `/` | Dashboard |
| `/klussen` | Projecten overzicht (UI: "Projecten") |
| `/klussen/[id]` | Project detail |
| `/klussen/nieuw` | Nieuw project aanmaken |
| `/klanten` | Klantenlijst |
| `/klanten/[id]` | Klantdetail |
| `/offertes` | Offertelijst |
| `/offertes/[id]` | Offerte detail |
| `/facturen` | Facturenlijst |
| `/facturen/[id]` | Factuur detail |
| `/agenda` | Agendaoverzicht |
| `/afspraken/[id]` | Afspraak detail |
| `/kosten` | Kostenlijst |
| `/inkoop` | Inkoopbeheer |
| `/mail` | AI Mailgenerator |
| `/whatsapp` | WhatsApp tekstgenerator |
| `/notificaties` | Notificatiecentrum |
| `/groepenverklaring` | Groepenverklaring beheer |
| `/login` | Admin login |

### Klantportaal (beveiligd via magic link sessie)

| Route | Doel |
|---|---|
| `/klant/dashboard` | Klant dashboard |
| `/klant/offerte/[id]` | Offerte bekijken + accepteren |
| `/klant/factuur/[id]` | Factuur bekijken + betalen |
| `/klant/rapport/[id]` | Opleveringsrapport bekijken |
| `/klant/profiel` | Profielinformatie |
| `/klant/geen-toegang` | Foutpagina geen toegang |

### Publieke routes

| Route | Doel |
|---|---|
| `/api/klant/login` | Magic link login POST |
| `/(publiek)/offerte/[token]` | Publieke offerteondertekening |
| `/(publiek)/werkafspraak/[token]` | Publieke werkafspraakbevestiging |

### PDF routes (risico: numerieke ID's)

| Route | Risico |
|---|---|
| `/api/offertes/[id]/pdf` | ID-gebaseerd, admin-sessie vereist |
| `/api/facturen/[id]/pdf` | ID-gebaseerd, admin-sessie vereist |
| `/api/afspraken/[id]/pdf` | ID-gebaseerd, admin-sessie vereist |

> **Risico**: PDF-routes zijn momenteel beveiligd via admin-sessie. Klantportaal PDF-links verlopen via de klant-sessie. Token-beveiliging voor publieke PDF-links is aanbevolen als toekomstige verbetering.

### Bot-API (alleen-lezen, `Authorization: Bearer <sleutel>`)

| Route | Scope | Doel |
|---|---|---|
| `/api/bot/offertes` | crm | Offertes zoeken/lijst (zoek, status, limit) |
| `/api/bot/offertes/[id]` | crm | Eén offerte compleet (regels, uitgangspunten, betaalplan, klant, project) |
| `/api/bot/klanten` | crm | Klanten zoeken incl. offerte-id's |
| `/api/bot/klussen` | crm | Projecten zoeken/lijst |
| `/api/bot/klussen/[id]` | crm | Project met offertes, facturen, uren, kosten, inkoop, meerwerk (nacalculatie) |
| `/api/bot/facturen` | crm | CRM-facturen (zoek, status, van/tot, klus_id) |
| `/api/bot/facturen/[id]` | crm | Eén factuur compleet |
| `/api/bot/kosten` | crm | Kosten (van/tot, klus_id, zoek) |
| `/api/bot/inkoop` | crm | Inkooplijsten met items (van/tot, klus_id, zoek) |
| `/api/bot/fiscaal` | crm | Urencriterium + btw per kwartaal uit het CRM |
| `/api/bot/moneybird/facturen` | finance | Verkoopfacturen + open posten uit Moneybird |
| `/api/bot/moneybird/inkoop` | finance | Inkoopfacturen en bonnen uit Moneybird |
| `/api/bot/moneybird/btw` | finance | Btw-overzicht per kwartaal (samengesteld) |
| `/api/bot/moneybird/sync-status` | finance | Verschillen CRM vs Moneybird |
| `/api/bot/tikkie` | finance | Diagnose Tikkie-koppeling (env ja/nee, testaanroep, Tikkie per open factuur) |

> Uitgezonderd van de admin-sessie in `middleware.ts`; sleutelcheck in `lib/bot-auth.ts` (`BOT_API_KEY` = crm, `BOT_API_KEY_FINANCE` = crm + Moneybird; crm-sleutel op Moneybird → 403). Alleen GET (rest → 405), geen tokens/credentials in antwoorden. Zie `docs/BOT_API.md`.

### Webhook routes

| Route | Service |
|---|---|
| `/api/mollie/webhook` | Mollie betalingsstatus |
| `/api/mollie/klant-webhook` | Mollie klantbetaling |
| `/api/moneybird/webhook` | Moneybird sync |
| `/api/cron` | Periodieke taken |

---

## Database tabellen

| Tabel | Doel |
|---|---|
| `klanten` | Klantgegevens |
| `klussen` | Projecten (intern: klussen) |
| `offertes` | Offerteregistratie |
| `facturen` | Factuurregistratie |
| `agenda_items` | Afspraken/agenda |
| `afspraken` | Werkafspraken |
| `inkoop` | Inkooporders |
| `inkoop_items` | Inkooporderregels |
| `kosten` | Kostenregistratie |
| `opleveringsrapporten` | Opleveringsrapport-documenten |
| `notificaties` | Systeem-notificaties |
| `klant_sessies` | Magic link sessies klantportaal |

---

## Wat is aangepast in deze wijziging (2026-06-05)

- **UI hernoemd**: "Klussen" → "Projecten" in sidebar, navigatie, pagina-titels, dashboard, knoppen
- **Database onaangeroerd**: tabel `klussen` en API-routes `/api/klussen/*` zijn ongewijzigd
- **Route `/klussen` behouden**: URL is niet veranderd, `/projecten` redirect toegevoegd als alias
- **Mobiele tabbar**: "Klussen" → "Projecten" label bijgewerkt

---

## Project is leidend (2026-10-02)

- **Geen dubbele klanten**: `lib/klanten.ts` (`vindOfMaakKlant`) zoekt eerst op naam (hoofdletters/spaties genegeerd), e-mail of telefoon (laatste 9 cijfers) en hergebruikt die klant. Gebruikt door klanten/nieuw, klussen/nieuw, offertes/nieuw, facturen/nieuw en "Andere klant" op het project. Matchregels gedeeld met de browser via `lib/klant-match.ts`.
- **Klantzoeker**: `components/KlantZoeker.tsx` (typeahead met e-mail/plaats) met melding "Deze klant bestaat al: … — gebruiken?".
- **Project verplicht**: nieuwe offertes/facturen hangen altijd aan een project (`components/ProjectKiezer.tsx`: bestaand project of in dezelfde stap een nieuw project). Geen stille auto-koppeling meer. De klant komt van het project; OfferteForm/FactuurForm tonen klant + project als vaste info en de PATCH-routes wijzigen `klant_id` niet meer.
- **Klant van project wijzigen** (`PATCH /api/klussen/[id]` met `klant_id`): niet-getekende offertes en facturen die niet betaald zijn en niet in Moneybird staan volgen mee (`lib/projecten.ts`).
- **Losse documenten** (zonder `klus_id`): melding "Niet gekoppeld aan een project" met koppelen (OfferteKoppelen/FactuurKoppelen) of een nieuw project voor die klant (`POST /api/klussen`). Factuur vanuit offerte vereist een gekoppeld project.
- **Eén actieve offerte per project** (`lib/offertes.ts`): een tweede offerte wordt na bevestiging een nieuwe versie (kopie). De oude krijgt status `vervangen` (+ `offertes.vervangen_door_id`), is niet meer te tekenen/versturen/wijzigen en verdwijnt uit het klantportaal-overzicht. Na tekenen loopt meerwerk via `project_meerwerk`.

---

## Bekende risico's

| Risico | Prioriteit | Status |
|---|---|---|
| PDF-routes zonder token (numerieke ID) | Middel | Documentatie klaar, token-prep gewenst |
| Mollie webhooks zonder signature-verificatie | Hoog | Te implementeren |
| Admin heeft één account, geen auditlog | Laag | Bewust gekozen |
| Klantportaal magic links verlopen niet actief | Middel | Huidige implementatie voldoet |

---

## Nog te doen (backlog)

- [ ] Projectstatussen moderniseren naar nieuwe flow
- [ ] Offertenummering → OZV-O-2026-0001 formaat
- [ ] Factuurnummering → OZV-F-2026-0001 formaat
- [ ] Token-beveiliging PDF-routes voor klantportaal
- [ ] Mollie webhook signature-verificatie
- [ ] Inkoop/kosten koppelen aan winstmarge per project
- [ ] Opleveringsrapport PDF-stijl vernieuwen naar Ozvolt-design
- [ ] Factuur/offerte PDF-stijl vernieuwen

---

## Handmatige testchecklist (Vercel)

- [ ] Admin login
- [ ] Dashboard laadt correct
- [ ] Projecten pagina (route /klussen) laadt
- [ ] Projectdetail laadt
- [ ] Klantdetail laadt
- [ ] Offerte detail + PDF openen
- [ ] Factuur detail + PDF openen
- [ ] Klantportaal klant 1 magic link
- [ ] Klantportaal klant 2 magic link
- [ ] Digitaal ondertekenen offerte
- [ ] Betaallink Mollie (testmodus)
