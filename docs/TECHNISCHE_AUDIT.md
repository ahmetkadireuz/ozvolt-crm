# Technische Audit — Ozvolt CRM als Multi-Tenant SaaS

> Gebaseerd op directe code-inspectie — 26 juni 2026  
> Geen aannames; alles is herleidbaar naar een concreet bestand en regelnummer.  
> Doel: beoordeel de haalbaarheid van ombouw naar een verkoopbaar multi-tenant SaaS-product.

---

## 1. FUNCTIES — Wat kan een gebruiker nu concreet doen?

### Admin-zijde (ingelogde medewerker/eigenaar)

**Klant- en leadbeheer**
- Klanten aanmaken met naam, e-mail, telefoon, locatie en type (Particulier / Zakelijk)
- Per klant alle gekoppelde klussen, offertes, facturen en werkafspraken in één oogopslag zien
- Klanttype onderscheiden voor correcte Moneybird-contact-aanmaak (bedrijf vs. persoon)

**Klus- en leadbeheer**
- Klus aanmaken gekoppeld aan een klant (type werk, product, omschrijving, bron)
- Leadstatus bijhouden via een statusflow: `nieuw → in_behandeling → offerte_gestuurd → gepland → afgerond`
- Belstatus per lead registreren: `niet_gebeld / opgenomen / niet_opgenomen / voicemail`
- Tijdstip van laatste telefoontje vastleggen

**Offertebeheer**
- Offertes opmaken met vrije regelomschrijving, aantal, eenheidsprijs, BTW-percentage en kortingspercentage
- Offertes koppelen aan een klant én optioneel aan een klus
- Offerte-PDF genereren (PDFKit, serverside) met professionele opmaak
- Offerte per e-mail versturen naar de klant, inclusief unieke ondertekeningslink
- Klant tekent digitaal via publieke tokenlink (geen login vereist); naam, e-mail en IP worden vastgelegd
- Automatische herinnering versturen bij niet-reactie
- 50/50-betaalplan instellen: twee aparte betaallinks (eerste deel bij akkoord, tweede bij oplevering)
- Offertestatus volgen: `concept → gestuurd → geaccepteerd / geweigerd / verlopen`
- Bestanden bijvoegen aan offerte (opgeslagen in Vercel Blob)
- Werkafspraakregels inbedden in offerte (`wa_items` JSONB)
- Offerte omzetten naar factuur met één klik

**Werkafspraken**
- Werkafspraken opstellen met vrije regels (omschrijving, verantwoordelijke, toelichting)
- Per regel instellen wie verantwoordelijk is: het installatiebedrijf of de klant
- Werkafspraak versturen; klant bevestigt digitaal via tokenlink (naam, e-mail, IP vastgelegd)
- PDF van werkafspraak genereren
- Werkafspraaknummer automatisch sequentieel toegewezen

**Facturering**
- Facturen aanmaken (handmatig of automatisch vanuit offerte)
- Sequentieel factuurnummer automatisch toewijzen (`OZVT-0001`, `OZVT-0002`, …)
- Betalingstermijn instellen (standaard 14 dagen)
- Factuur-PDF genereren
- Factuur per e-mail versturen
- Betaallink genereren via Moneybird en opslaan in `betaal_url`
- 50/50-gesplitste betaling: twee aparte betaallinks
- Factuurnummer en betaalstatus synchroniseren met Moneybird
- Mollie-betaling tracken: `mollie_payment_id`, `mollie_status`, `mollie_paid_at`
- Facturastatus volgen: `concept → verstuurd → betaald / te_laat`

**Planning en agenda**
- Agenda-items aanmaken gekoppeld aan klant en/of klus
- Start- en eindtijd instellen
- Kalenderoverzicht bekijken

**Projectbeheer per klus**
- Uren schrijven per klus met datum, aantal uren en uurtarief (standaard €65/uur)
- Taakenlijst bijhouden met omschrijving, voortgang (aantal_klaar / aantal_totaal) en fotobewijs
- Volgorde van taken aanpassen
- Extra meerwerk invoeren (omschrijving + bedrag); klant accepteert of weigert dit via klantportaal
- Inkooplijst aanmaken per klus (artikelnummer, hoeveelheid, eenheid, leverancier, prijs excl. BTW, afvinkbaar)

**Opleveringsrapporten**
- Opleveringsrapport aanmaken per klus (vrij of op basis van een vaste checklist: groepenkast, laadpaal, werkzaamheden)
- Foto's uploaden als bewijsmateriaal (Vercel Blob)
- Handtekening monteur vastleggen (Canvas → PNG data-URL in de database)
- Handtekening klant vastleggen (zelfde methode)
- Datum/tijdstip van tekening vastleggen

**Kosten en uitgaven**
- Kosten registreren per klant en/of klus (categorie, leverancier, bedrag)

**Communicatie**
- E-mail genereren met AI (Claude Haiku via Anthropic API); promt is nu hardcoded voor Ozvolt
- WhatsApp-bericht sturen via Meta Graph API (v25.0); berichten worden opgeslagen
- Inkomende WhatsApp-berichten ontvangen via webhook (richting: `inbound`)

**Notificaties en automatisering**
- Dagelijkse cron-job (Vercel Cron, 08:00 UTC) detecteert automatisch:
  - Facturen die de betalingstermijn hebben overschreden
  - Klussen zonder update van 7+ dagen
  - Offertes die verlopen zijn
  - Werkafspraken die morgen plaatsvinden
- Notificaties worden aangemaakt in `admin_notifications` en verschijnen in het notificatiecentrum
- Moneybird-webhook verwerkt betalingsbevestigingen en werkt facturastatus automatisch bij

**Boekhouding**
- Klanten aanmaken of opzoeken in Moneybird
- Facturen aanmaken in Moneybird en als verzonden markeren
- Betaallinks ophalen uit Moneybird
- Betalingsstatus ophalen via Moneybird-webhook
- Handmatig markeren als betaald in Moneybird
- Moneybird-instellingenpagina met API-statuscheck

**Dashboard**
- Omzet lopende maand en procentuele trend ten opzichte van vorige maand
- Totaalwaarde en aantal openstaande offertes
- Totaalwaarde en aantal openstaande facturen
- Bedrag aan achterstallige facturen
- Actie-items: offertes wacht op reactie, klussen zonder activiteit
- Recente klanten en klussen

### Klant-zijde (klantportaal, geen wachtwoord)

- Inloggen via magic link (eenmalige e-maillink, 24 uur geldig, sessie-cookie daarna 30 dagen)
- Dashboard zien met eigen klussen, offertes, facturen en rapporten
- Offerte bekijken en digitaal ondertekenen
- Factuur bekijken en online betalen via betaallink
- Meerwerk accepteren of weigeren
- Opleveringsrapport bekijken en digitaal ondertekenen
- Groenverklaringen / certificaten beheren en downloaden
- Profiel- en contactgegevens inzien

---

## 2. TECH STACK & ARCHITECTUUR

### Talen en frameworks

| Laag | Technologie | Versie |
|------|-------------|--------|
| Framework | Next.js (App Router) | 14.2.35 |
| UI-bibliotheek | React | 18.x |
| Taal | TypeScript | 5.x |
| CSS | Tailwind CSS | 3.4.1 |
| Iconen | Lucide React | 1.17.0 |

### Backend / serverlogica

Alle backend-logica draait als **Next.js API Routes** (serverless functies) binnen hetzelfde project. Er is geen aparte backend-server. Elke API-route is een geïsoleerde serverless function die door Vercel wordt gehost.

| Bibliotheek | Gebruik | Versie |
|---|---|---|
| `@neondatabase/serverless` | PostgreSQL-verbinding | 1.1.0 |
| `jose` | JWT aanmaken en verifiëren | 6.2.3 |
| `bcryptjs` | Wachtwoord-hashing | 3.0.3 |
| `iron-session` | Aanwezig in dependencies, niet actief in gebruik (JWT via `jose` wordt feitelijk gebruikt) | 8.0.4 |
| `nodemailer` | Uitgaande e-mail via SMTP | 8.0.10 |
| `pdfkit` | Server-side PDF-generatie | 0.18.0 |
| `@anthropic-ai/sdk` | Claude Haiku voor AI e-mailgeneratie | 0.100.1 |
| `@vercel/blob` | Bestandsopslag (foto's, bijlagen) | 2.4.0 |
| `openai` | Aanwezig in dependencies, nergens actief gebruikt | 6.41.0 |

### Database

**PostgreSQL via Neon** (serverless, connection pooling ingebakken in de SDK). Queries worden geschreven als SQL template literals (`sql\`...\``), wat SQL-injectie voorkomt via parameterisatie.

### Hosting en deployment

**Vercel** (serverless). De app is een monoliet: front- en backend in één Next.js-project, geen microservices.

- Cron-job via `vercel.json`: dagelijks om 08:00 UTC → `/api/cron?token=CRON_SECRET`
- Bestandsopslag via Vercel Blob
- Geen Docker, geen traditionele server

### Globale architectuur (hoe de app is opgebouwd)

```
Browser
  │
  ├─ /app/(admin)/*         Admin-pagina's (React Server Components + Client Components)
  │     Beschermd via JWT-cookie (middleware.ts)
  │
  ├─ /app/klant/*           Klantportaal (token-based sessie)
  │     Beschermd via ozvolt_klant cookie
  │
  ├─ /app/(publiek)/*       Publieke offerte- en werkafspraakpagina's (geen auth)
  │
  └─ /app/api/*             API-routes (serverless functions)
         │
         ├─ lib/db.ts        Neon SQL-verbinding
         ├─ lib/mail.ts      SMTP e-mail + HTML-templates
         ├─ lib/pdf-factuur.ts  PDF-generatie (facturen)
         ├─ lib/moneybird.ts    Moneybird API-wrapper
         ├─ lib/session.ts      JWT sessie-beheer
         ├─ lib/security.ts     Sanitisatie, rate-limiting, brute-force bescherming
         └─ lib/klant-sessie.ts Magic link sessie-beheer
```

---

## 3. DATAMODEL — Entiteiten en samenhang

### Alle 17 tabellen

```
klanten ──────────────────────────────────────────────────────────────────────┐
  id, naam, email, telefoon, type, locatie                                    │
  └─< klussen ────────────────────────────────────────────────────────────┐   │
        id, klant_id, type_werk, status, gebeld_status, product, bron     │   │
        └─< project_uren      (id, klus_id, datum, uren, uurloon)         │   │
        └─< project_taken     (id, klus_id, omschrijving, voortgang, fotos│   │
        └─< project_meerwerk  (id, klus_id, omschrijving, bedrag, status) │   │
        └─< inkoop_lijsten                                                 │   │
              └─< inkoop_items                                             │   │
        └─< agenda_items      (klus_id optioneel)                         │   │
        └─< whatsapp_messages (klus_id optioneel)                         │   │
        └─< kosten            (klus_id optioneel)                         │   │
                                                                           │   │
  └─< offertes ──────────────────────────────────────────────────────┐    │   │
        id, klant_id, klus_id?, offertenummer, status, regels JSONB   │    │   │
        accept_token, accepted_at, accepted_name, accepted_ip         │    │   │
        betaling_50_50, betaal_url, betaal_url_2                      │    │   │
        wa_items JSONB, bijlagen JSONB                                 │    │   │
        └─< facturen ──────────────────────────────────────────────┐  │    │   │
              id, klant_id, klus_id?, offerte_id?                   │  │    │   │
              factuurnummer, status, regels JSONB                   │  │    │   │
              betaal_token, betaal_url, betaal_url_2                │  │    │   │
              mollie_payment_id, mollie_status, mollie_paid_at      │  │    │   │
              moneybird_id, moneybird_url                           │  │    │   │
                                                                    │  │    │   │
  └─< werkafspraken ─────────────────────────────────────────────┐  │  │    │   │
        id, klant_id, klus_id?, offerte_id?                       │  │  │    │   │
        afspraaknummer, status, afspraken JSONB                   │  │  │    │   │
        accept_token, accepted_at, accepted_name, accepted_ip     │  │  │    │   │
                                                                  │  │  │    │   │
  └─< klant_sessies  (magic link tokens)                          │  │  │    │   │
  └─< groenverklaringen (certificaten)                            │  │  │    │   │
  └─< opleveringsrapporten ──────────────────────────────────────┘  │  │    │   │
        id, klus_id, klant_id                                        │  │    │   │
        fotos JSONB, inhoud JSONB (checklist)                        │  │    │   │
        handtekening_monteur TEXT, handtekening_klant TEXT           │  │    │   │
                                                                     │  │    │   │
admin_notifications  (systeemmeldingen)  ────────────────────────────┘  │    │   │
agenda_items         (planning)  ───────────────────────────────────────┘    │   │
kosten               (uitgaven)  ────────────────────────────────────────────┘   │
whatsapp_messages    (berichten)  ───────────────────────────────────────────────┘
```

### Regels die als JSONB zijn opgeslagen (geen aparte tabel)

| Veld | In tabel | Bevat |
|---|---|---|
| `offertes.regels` | offertes | `[{omschrijving, beschrijving, aantal, prijs, btw}]` |
| `facturen.regels` | facturen | Zelfde structuur |
| `offertes.wa_items` | offertes | Werkafspraakregels ingebed in offerte |
| `offertes.bijlagen` | offertes | Bestandsreferenties (URL's) |
| `werkafspraken.afspraken` | werkafspraken | `[{omschrijving, verantwoordelijke, toelichting}]` |
| `opleveringsrapporten.fotos` | opleveringsrapporten | `[{url, naam}]` |
| `opleveringsrapporten.inhoud` | opleveringsrapporten | Checklist-structuur |
| `project_taken.fotos` | project_taken | Foto-URL's per taak |

### Schemadrift (niet alle kolommen staan in schema.sql)

De volgende kolommen bestaan wél in de code maar zijn via losse migratie-scripts toegevoegd en staan niet in `schema.sql`:
- `offertes.betaling_50_50`, `betaal_url`, `betaal_url_2`, `status_notitie`, `wa_items`, `bijlagen`
- `facturen.moneybird_id`, `moneybird_url`, `betaal_url`, `betaal_url_2`
- `klant_sessies.link_gebruikt`
- `opleveringsrapporten.type`, `inhoud`, `handtekening_monteur`, `handtekening_klant`, `getekend_op`
- `inkoop_items.artikelnummer`, `prijs_ex_btw`
- `klanten.status_notitie`

Dit is een onderhoudsprobleem: er is geen enkelvoudige bron van waarheid voor het schema. Een frisse installatie vereist het uitvoeren van 6 losse SQL-bestanden in de juiste volgorde.

---

## 4. INTEGRATIES & SECRETS

### Overzicht van alle externe koppelingen

| Integratie | Doel | Hoe geconfigureerd | Verplicht? |
|---|---|---|---|
| **Neon PostgreSQL** | Primaire database | `DATABASE_URL` (env var) | Ja |
| **SMTP/Nodemailer** | Uitgaande e-mail | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (env vars) | Ja (voor e-mails) |
| **Vercel Blob** | Foto's en bijlagen | `BLOB_READ_WRITE_TOKEN` (env var) | Ja (voor uploads) |
| **Moneybird** | Boekhouding + betaallinks | `MONEYBIRD_API_TOKEN`, `MONEYBIRD_ADMIN_ID` (env vars) | Nee — conditioneel |
| **Mollie** | Betaalverwerking | `MOLLIE_API_KEY` (env var); schema heeft `mollie_*` kolommen | Nee — deels geïmplementeerd |
| **Anthropic / Claude** | AI e-mailgeneratie | `ANTHROPIC_API_KEY` (env var) | Nee |
| **Meta WhatsApp** | Berichten sturen | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (env vars) | Nee |
| **Vercel Cron** | Dagelijkse automatisering | `CRON_SECRET` (env var) | Ja (als cron actief) |

### Hoe worden geheimen beheerd?

**Goed:** Alle API-sleutels, wachtwoorden en tokens worden uitsluitend via omgevingsvariabelen ingelezen. Er staan geen secrets hardcoded in de broncode. De `.env.example` is aanwezig en bevat duidelijke instructies.

**Kanttekening — Moneybird is conditioneel maar ADMIN_ID is globaal:**
```typescript
// lib/moneybird.ts:3-4
function adminId() {
  return process.env.MONEYBIRD_ADMIN_ID ?? ''
}
```
Er is slechts één `MONEYBIRD_ADMIN_ID` per deployment. Dit betekent dat alle facturen en contacten van alle klanten in dezelfde Moneybird-administratie terechtkomen — een fundamenteel multi-tenancy-probleem.

**Kanttekening — Vercel Blob is gedeeld:**
Er is één `BLOB_READ_WRITE_TOKEN` per deployment. Alle foto's en bijlagen gaan in dezelfde Blob-container. Bestanden hebben weliswaar willekeurige URL's, maar zijn niet echt geïsoleerd per klant.

---

## 5. SINGLE-TENANT AANNAMES — Waar zit "Ozvolt" ingebakken?

### 5a. Hardcoded bedrijfsidentiteit (45 bestanden)

De volgende gegevens zijn letterlijk in de broncode gezet in 45 bestanden:

| Gegeven | Waar | Voorbeeldregel |
|---|---|---|
| Bedrijfsnaam | `lib/mail.ts:59,98` e.a. | `<title>Ozvolt Elektrotechniek</title>` |
| KVK-nummer | `lib/pdf-factuur.ts:52`, PDF-routes | `'KVK 99837366  ·  BTW NL005413208B33'` |
| BTW-nummer | Zelfde bestanden | `NL005413208B33` |
| Logo-URL | `lib/mail.ts:38` | `const LOGO_URL = 'https://portaal.ozvoltelektro.nl/logo-wit.png'` |
| E-mailadres | `lib/mail.ts:101` | `financien@ozvoltelektro.nl` |
| Telefoonnummer | `lib/mail.ts:102` | `06 449 98 789` |
| Website | `lib/mail.ts:107` | `ozvoltelektro.nl` |
| Naam contactpersoon | `app/api/mail/genereren/route.ts:31` | `"Met vriendelijke groet, Ahmed Öz / Ozvolt Elektrotechniek"` |
| Certificeringen | `app/api/mail/genereren/route.ts:22` | `NEN 1010, NEN 3140 en VCA gecertificeerd` |
| Portaal-URL als fallback | 20+ API-routes | `process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'` |
| SMTP-afzendernaam | `lib/mail.ts:29` | `process.env.SMTP_FROM_NAME ?? 'Ozvolt Elektrotechniek'` |

### 5b. Hardcoded document-prefixen (15+ bestanden)

Dit is een categorie apart: de offerte- en factuurnummering gebruikt het prefix `OZVT-` en `OZWA-`:

```typescript
// app/api/offertes/[id]/factuur/route.ts:17
const factuurNr = `OZVT-${String(nextNr).padStart(4,'0')}`

// app/api/offertes/[id]/versturen/route.ts:38
werkafspraakNr = `OZWA-${String(aRows[0].afspraaknummer).padStart(4,'0')}`
```

Dit prefix staat op 15 plekken hardcoded. Elke klant die dit systeem gebruikt, stuurt facturen met het opschrift `OZVT-0001` naar hun eindklanten — een ernstige omissie voor verkoopbaarheid.

### 5c. Hardcoded businesslogica (6 bestanden)

In werkafspraken heeft de dropdown voor "wie is verantwoordelijk" een optie `value="ozvolt"`:

```tsx
// app/afspraken/[id]/AfspraakForm.tsx:105
<option value="ozvolt">Regelt Ozvolt</option>
```

Dezelfde waarde wordt in e-mailtemplates gecontroleerd:
```typescript
// lib/mail.ts:344
${a.verantwoordelijke === 'ozvolt' ? `<span ...>Regelt Ozvolt</span>` : ''}
```

Een klant die dit systeem koopt, ziet in zijn eigen werkafspraken letterlijk "Regelt Ozvolt" staan.

### 5d. Eén admin-account per deployment

```typescript
// app/api/auth/login/route.ts:18-20
const adminUser = process.env.ADMIN_USER ?? ''
const adminPassHash = process.env.ADMIN_PASS_HASH ?? ''
const adminPass = process.env.ADMIN_PASS ?? ''
```

Er is slechts één gebruikersnaam en één wachtwoord per deployment, geconfigureerd via omgevingsvariabelen. Er bestaat geen `gebruikers`-tabel. Monteurs kunnen niet inloggen. Er is geen rol-onderscheid.

### 5e. Geen scheiding in de database

Alle 17 tabellen missen elke vorm van tenant-kolom. Uit een grep op de volledige database:

```
grep "tenant_id|company_id|organization_id|workspace_id|business_id" /db/*.sql
→ nul resultaten
```

Klant A's klussen staan in dezelfde rijen als klant B's klussen, onderscheiden door niets anders dan de integer `klant_id` — die toevallig per klant uniek is, maar niet per *bedrijf* dat het systeem gebruikt.

### 5f. Één Moneybird-administratie

De `MONEYBIRD_ADMIN_ID` is één waarde per deployment. Alle facturen van alle eindklanten gaan in dezelfde boekhouding. Er is geen mechanisme om per SaaS-klant een eigen Moneybird-koppeling in te stellen.

### 5g. Cron-notificaties zijn niet bedrijfsspecifiek

De dagelijkse cron-job schrijft meldingen naar `admin_notifications` zonder enige tenant-context. In een multi-tenant omgeving zou dit betekenen dat alle notificaties van alle bedrijven door elkaar staan, of dat één cron-job voor alle tenants tegelijk draait zonder scheiding.

### 5h. Schemadrift: geen enkelvoudig migratiesysteem

Er zijn 6 losse SQL-bestanden die in een bepaalde volgorde uitgevoerd moeten worden. Er is geen versienummering of migratietool (zoals Flyway, Drizzle migrations, of Prisma migrate). Dit maakt geautomatiseerde onboarding van nieuwe tenants kwetsbaar.

---

## 6. MULTI-TENANT GEREEDHEID — Wat ontbreekt er?

### 6a. Gebruikersaccounts en login

**Huidige staat:** Één admin-account per deployment via env vars. Geen gebruikerstabel.

**Wat ontbreekt:**
- Tabel `gebruikers` met: `id, tenant_id, naam, email, wachtwoord_hash, rol, actief, aangemaakt_op`
- Registratie- en uitnodigingsflow
- Wachtwoord-reset via e-mail
- JWT-payload uitbreiden met `tenant_id` en `rol`
- Meerdere admins per tenant (bijv. eigenaar + backoffice)
- Monteurs die kunnen inloggen om eigen klussen te zien

**Inschatting: GROOT** — dit is een fundamentele nieuwe module.

---

### 6b. Rollen en rechten

**Huidige staat:** Geen. Wie ingelogd is, ziet en doet alles.

**Wat ontbreekt:**
- Rollenmodel: minimaal `eigenaar`, `backoffice`, `monteur`
- Rechtenmatrix: monteur ziet alleen eigen klussen, backoffice mag facturen versturen, eigenaar mag alles
- Middleware uitbreiden: naast "is ingelogd" ook "heeft deze rol toestemming voor deze route"
- Frontend: menu-items en knoppen conditioneel tonen op basis van rol

**Inschatting: GROOT** — raken vrijwel alle 58 API-routes en 40 pagina's.

---

### 6c. Data-isolatie tussen bedrijven

**Huidige staat:** Nul isolatie. Geen enkele tabel heeft een `tenant_id`.

**Wat ontbreekt:**
Alle 17 tabellen moeten worden uitgebreid:
```sql
ALTER TABLE klanten           ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE klussen           ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE offertes          ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE facturen          ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE kosten            ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE agenda_items      ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE werkafspraken     ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE whatsapp_messages ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE admin_notifications ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE klant_sessies     ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE opleveringsrapporten ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE groenverklaringen ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE inkoop_lijsten    ADD COLUMN tenant_id INTEGER NOT NULL;
ALTER TABLE inkoop_items      -- via inkoop_lijsten.tenant_id
ALTER TABLE project_uren      -- via klussen.tenant_id
ALTER TABLE project_taken     -- via klussen.tenant_id
ALTER TABLE project_meerwerk  -- via klussen.tenant_id
```

Alle 58+ API-routes moeten vervolgens worden aangepast: elke SQL-query krijgt een `WHERE tenant_id = $huidige_tenant` clause. Dit is systematisch maar omvangrijk werk — één vergeten `WHERE`-clause kan leiden tot data-lekkage tussen bedrijven.

Bovendien: een nieuwe `tenants`-tabel is nodig:
```sql
CREATE TABLE tenants (
  id         SERIAL PRIMARY KEY,
  naam       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  plan       VARCHAR(30) DEFAULT 'starter',
  actief     BOOLEAN DEFAULT TRUE,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);
```

**Inschatting: GROOT** — dit is het zwaarste stuk werk en het meest kritiek voor veiligheid.

---

### 6d. Per-klant configuratie

**Huidige staat:** Alle configuratie (bedrijfsnaam, KVK, BTW, logo, SMTP, Moneybird, documentprefixen) is hardcoded of staat in één set env vars per deployment.

**Wat ontbreekt:**
- Tabel `tenant_config` of uitbreiding van `tenants` met:
  - `naam`, `kvk`, `btw`, `email`, `telefoon`, `website`
  - `logo_url`, `primaire_kleur`
  - `document_prefix` (vervangt hardcoded `OZVT-`)
  - `smtp_host`, `smtp_user`, `smtp_pass` (voor eigen e-mailafzender per klant)
  - `moneybird_token`, `moneybird_admin_id` (per klant eigen boekhoudkoppeling)
  - `mollie_api_key`, `whatsapp_token` (optioneel per klant)
- Instellingenpagina voor de tenant-eigenaar (geen code-aanpassing nodig per klant)
- Centrale `lib/config.ts` die config uit de database leest in plaats van uit env vars

**Inschatting: MIDDEL** — de datastructuur is duidelijk, maar het raak alle templates, PDF's en e-mails.

---

### 6e. Self-service onboarding

**Huidige staat:** Niet aanwezig. Elke nieuwe klant vereist handmatige deployment, database-aanmaak en env var-configuratie door de beheerder.

**Wat ontbreekt:**
- Registratiepagina: bedrijfsnaam, naam, e-mail, wachtwoord
- E-mailverificatie na registratie
- Automatisch aanmaken van tenant-record
- Automatisch doorsturen naar instellingenpagina (logo, bedrijfsgegevens invullen)
- Trial-periode activeren (bijv. 14 dagen gratis)
- Admin-paneel voor de SaaS-beheerder (jij) om tenants te beheren, pakket te wijzigen, te deactiveren

**Inschatting: MIDDEL** — nieuwe module, maar relatief zelfstandig te bouwen nadat tenant-isolatie werkt.

---

### 6f. Ingebouwde facturatie en abonnementsbeheer

**Huidige staat:** Niet aanwezig. Er is geen mechanisme om SaaS-klanten te factureren of om abonnementen te beheren.

**Wat ontbreekt:**
- Stripe-integratie voor terugkerende abonnementen
- Pakketkeuze (Starter, Professional, Growth)
- Betaalstatus per tenant bijhouden (actief, proef, verlopen, geblokkeerd)
- Toegang automatisch blokkeren bij niet-betaling
- Facturen voor SaaS-gebruik genereren (los van de facturen die de tenant zelf maakt)
- Upgrade/downgrade-flow

**Inschatting: GROOT** — een volledig nieuw subsysteem.

---

## 7. BEVEILIGING & AVG

### Wat is goed geregeld

| Maatregel | Details |
|---|---|
| Wachtwoord-hashing | bcryptjs, gesalted; voorkeursmethode is `ADMIN_PASS_HASH` (bcrypt hash) |
| JWT-sessies | HS256 via `jose`, 8 uur geldig, httpOnly + secure cookie |
| Brute-force bescherming | 5 mislukte pogingen → 5 minuten lockout per IP (`lib/security.ts`) |
| SQL-injectie | Alle queries via Neon template literals (geparametriseerd) |
| Input-sanitisatie | `sanitize()` functie (HTML-escaping) beschikbaar in `lib/security.ts` |
| XSS via headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Strict-Transport-Security` in `next.config.mjs` |
| Magic link beveiliging | Token SHA256-gehasht opgeslagen; nooit plaintext in database |
| Klant-sessie isolatie | API-routes valideren `klant_id` uit de sessie — klant A kan niet bij klant B's data |
| IP-vastlegging | `accepted_ip` bij offerte- en werkafspraakacceptatie |

### Beveiligingsproblemen

**Probleem 1: Rate-limiting is niet betrouwbaar in serverless**

```typescript
// lib/security.ts
const ipMap = new Map<string, { count: number; resetAt: number }>()
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()
```

Beide Maps zijn in-memory. Elke Vercel serverless instantie heeft zijn eigen geheugen. Bij het opstarten van een nieuwe instantie (cold start) worden tellers gereset. Bij hoog verkeer draaien meerdere instanties parallel — een aanvaller kan brute-force bescherming omzeilen door requests over meerdere instanties te spreiden.

**Fix:** Redis (Upstash) of Neon-gebaseerde rate-limiting.

---

**Probleem 2: Geen Mollie webhook signature-verificatie**

```typescript
// app/api/moneybird/webhook/route.ts — geen HMAC-verificatie aanwezig
```

Mollie vereist dat webhook-payloads worden geverifieerd via HMAC. Ontbreekt dit, dan kan een aanvaller valse POST-verzoeken sturen naar het webhook-endpoint en facturen als "betaald" markeren zonder echte betaling.

**Fix:** Mollie HMAC-verificatie toevoegen (3–4 uur werk).

---

**Probleem 3: Klant-portal token wordt na gebruik niet ongeldig gemaakt**

```typescript
// lib/klant-sessie.ts — valideerKlantToken() (gebruikt voor cookie-checks)
const rows = await sql`
  SELECT klant_id FROM klant_sessies
  WHERE token_hash = ${hash} AND verlopen_op > NOW()
`
// Controleert NIET op link_gebruikt
```

De kolom `klant_sessies.link_gebruikt` bestaat wel, maar `valideerKlantToken()` (de functie die bij elk paginaverzoek wordt aangeroepen) controleert deze niet. Alleen `valideerEnGebruikKlantToken()` doet dat, maar die wordt enkel gebruikt bij het daadwerkelijk inloggen via de link. Na het inloggen controleert het systeem bij elke API-aanroep de cookie-token opnieuw via `valideerKlantToken()`, wat correct is. Dit is niet per se een veiligheidsprobleem, maar de `link_gebruikt` kolom heeft geen werkende functie meer en schept verwarring.

---

**Probleem 4: Geen audit-log**

Er wordt nergens bijgehouden wie welke actie heeft uitgevoerd op welk tijdstip. Dit is een AVG-verplichting bij verwerking van persoonsgegevens namens derden (verwerkersrol). Bij een datalek is er geen manier om te reconstrueren wat er is gebeurd.

---

**Probleem 5: Handtekeningen als data-URL's in de database**

```sql
handtekening_monteur TEXT  -- data-URL (PNG), kan tot 50–200 KB zijn
handtekening_klant TEXT
```

Handtekeningen worden opgeslagen als base64-gecodeerde PNG-strings direct in de database, niet als bestanden in Blob. Dit is performant ongunstig (grote TEXT-waarden in PostgreSQL) en maakt AVG-rechten (recht op vergetelheid) complexer.

---

### AVG-risico's voor levering aan derden

| Risico | Ernst |
|---|---|
| Geen verwerkersovereenkomst (DPA) | **Kritiek** — verplicht bij verwerking van persoonsgegevens namens een andere verwerkingsverantwoordelijke |
| Geen privacyverklaring | **Kritiek** — vereist voor klantportaal-gebruikers |
| Geen mogelijkheid tot data-verwijdering (recht op vergetelheid) | Hoog |
| Geen data-export voor klanten (recht op overdraagbaarheid) | Hoog |
| Handtekeningen (biometrisch-achtige data) zonder expliciete toestemming | Middel |
| IP-adressen vastgelegd bij acceptatie — zonder melding | Middel |
| WhatsApp-berichten opgeslagen — bewaartermijn niet gedefinieerd | Middel |
| Foto's van installaties — mogelijk personen zichtbaar | Laag |

---

## 8. INSCHATTING — Hoe ver staat dit van een verkoopbaar multi-tenant product?

### Per onderdeel

| Onderdeel | Nu aanwezig? | Inspanning | Toelichting |
|---|---|---|---|
| **Gebruikersaccounts & login** | ❌ Nee (1 admin via env var) | **GROOT** | Nieuwe `gebruikers`-tabel, registratie, e-mailverificatie, wachtwoordreset, JWT uitbreiden |
| **Rollen en rechten** | ❌ Nee | **GROOT** | Rechtenmatrix voor eigenaar/backoffice/monteur; raak alle 58 routes en 40 pagina's |
| **Data-isolatie (tenant_id)** | ❌ Nee | **GROOT** | `tenant_id` in alle 17 tabellen + alle queries bijwerken — zwaarste werk, hoogste beveiligingsrisico |
| **Per-klant configuratie** | ❌ Nee (hardcoded) | **MIDDEL** | Nieuwe `tenants`-tabel + instellingenpagina + centrale config-lib |
| **Document-prefix per klant** | ❌ Nee (`OZVT-` hardcoded op 15 plekken) | **KLEIN** | Config-waarde per tenant; zoek-en-vervang in de codepaden |
| **Bedrijfsbranding generiek** | ❌ Nee (45 bestanden) | **MIDDEL** | Centrale config-module + alle templates bijwerken |
| **Self-service onboarding** | ❌ Nee | **MIDDEL** | Registratiepagina, verificatie, tenant aanmaken, trial starten |
| **Ingebouwde facturatie/abonnementen** | ❌ Nee | **GROOT** | Stripe-integratie, pakketkeuze, betaalstatus, blokkering |
| **Per-klant boekhoudkoppeling** | ❌ Nee (1 Moneybird-account) | **MIDDEL** | Config per tenant in database; Moneybird-lib aanpassen om per-tenant tokens te gebruiken |
| **Mollie webhook signature** | ❌ Nee | **KLEIN** | HMAC-verificatie toevoegen — 3–4 uur werk |
| **Betrouwbare rate-limiting** | ⚠️ Gedeeltelijk (in-memory, onbetrouwbaar) | **KLEIN** | Vervangen door Redis/Upstash of Neon-tabel |
| **Audit-log** | ❌ Nee | **MIDDEL** | Nieuwe `audit_log`-tabel; key-events loggen in alle routes |
| **AVG-documenten** | ❌ Nee | **KLEIN** | Juridisch werk, geen code; verwerkersovereenkomst, privacyverklaring, voorwaarden |
| **Data-export / verwijdering** | ❌ Nee | **MIDDEL** | Export-functie per klant; cascade-verwijdering al deels aanwezig |
| **Enkelvoudig migratiebeheer** | ❌ Nee (6 losse SQL-bestanden) | **KLEIN** | Samenvoegen in één geordend schema-bestand of migratietool (bijv. Drizzle) |

### Totaaloordeel

**Dit systeem is een stevige, productioneel functionerende single-tenant CRM. Het is goed gebouwd en de businesslogica is volledig aanwezig.**

Voor gebruik door één bedrijf (zoals Ozvolt) is het productioneel gereed.

Voor multi-tenant SaaS is het **substantieel onderschat** als je denkt dat "branding aanpassen genoeg is." De drie grootse obstakels zijn structureel:

1. **Geen data-isolatie** — dit is een beveiligingsprobleem, geen cosmetisch probleem. Eén vergeten `WHERE`-clause kan leiden tot datalekken tussen klanten.
2. **Geen gebruikersbeheer** — je kunt geen monteurs, medewerkers of meerdere admingebruikers toevoegen zonder een compleet nieuwe authenticatie-laag.
3. **Geen facturatie** — je kunt geen SaaS verkopen zonder een systeem dat jouw klanten factureert en bij niet-betaling de toegang blokkeert.

### Realistisch tijdspad (parttime, 1 persoon)

| Fase | Inhoud | Duur |
|---|---|---|
| **Fase A: Verkoopbare pilotversie** (aparte deployment per klant) | Branding generiek maken via config, document-prefix configureerbaar, Mollie webhook fixen, AVG-documenten | **3–5 werkdagen** |
| **Fase B: White-label** (aparte deployment, maar gestroomlijnd) | Fase A + instellingenpagina voor klant, multi-admingebruikers, betrouwbare rate-limiting | **+4–6 weken** |
| **Fase C: Multi-tenant SaaS** | Fase B + tenant_id in alle tabellen, self-service onboarding, Stripe-facturatie, audit-log | **+3–5 maanden** |

### Aanbeveling

**Begin met Fase A** (aparte deployment per klant). Dit is de snelste, veiligste route naar omzet. Je leert van echte klanten wat ze willen, bouwt sociale bewijskracht op, en financiert daarmee de grotere technische investering van Fase B en C.

Spring niet direct naar multi-tenant SaaS. De kans op een beveiligingsincident (data-lekkage tussen tenants) bij onvoldoende getest multi-tenant werk is reëel en kan reputatie-schade veroorzaken die een vroeg product niet overleeft.
