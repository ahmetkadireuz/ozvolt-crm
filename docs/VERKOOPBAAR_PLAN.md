# Verkoopbaar Plan — Aparte Installateurversie op basis van Ozvolt CRM

> Analyse gebaseerd op volledige codebase-inspectie — 26 juni 2026  
> **Geen codewijzigingen uitgevoerd. Dit is uitsluitend een analyse en plan.**  
> Jouw live Ozvolt CRM is onaangeroerd.

---

## ⚠️ VEILIGHEIDSREGEL — Lees Dit Eerst

### Bestanden/mappen die absoluut NIET direct aangepast mogen worden

| Bestand/map | Reden |
|---|---|
| `/app/` (alle productionele pagina's) | Jouw live CRM — elke wijziging breekt productie |
| `/lib/` (mail.ts, moneybird.ts, pdf-factuur.ts, etc.) | Kernlogica van je live systeem |
| `/db/schema.sql` en alle andere SQL-bestanden | Database van jouw live data |
| `/.env.local` of productie `.env` variabelen in Vercel | Credentials van jouw live systeem |
| `/middleware.ts` | Auth voor je live CRM — breken = iedereen kan inloggen |
| `vercel.json` | Deployment + cron van jouw live systeem |
| `next.config.mjs` | Security headers van jouw live systeem |

### Hoe veilig een kopie maken

**Aanbevolen route: aparte GitHub-repository + aparte Vercel-deployment.**

Stap-voor-stap back-up en kopie:

```bash
# 1. Maak een back-up tag van de huidige staat
git tag backup-ozvolt-live-$(date +%Y%m%d) 
git push origin --tags

# 2. Maak een NIEUW repository aan op GitHub (bijv. installateurflow)
# Doe dit BUITEN deze map — in een volledig aparte directory

# 3. Kopieer de codebase naar een nieuwe map (buiten het huidige project)
cp -r /home/user/ozvolt-crm /home/user/installateurflow

# 4. Verwijder .git uit de kopie en initialiseer nieuw
cd /home/user/installateurflow
rm -rf .git
git init
git remote add origin https://github.com/jouw-account/installateurflow.git

# 5. Verwijder .env.local uit de kopie (nooit meekopiëren)
rm -f .env.local
```

### Welke branch/map/projectstructuur adviseer ik?

**Niet in dezelfde repository — in een volledig aparte repository.**

```
GitHub: ahmetkadireuz/ozvolt-crm      ← jouw live Ozvolt CRM, NIET AANRAKEN
GitHub: ahmetkadireuz/installateurflow ← nieuwe verkoopbare versie
```

Beide draaien als aparte Vercel-projecten:
```
Vercel project 1: ozvolt-crm    → portaal.ozvoltelektro.nl  (jouw live CRM)
Vercel project 2: installateurflow → demo.installateurflow.nl of crm.klantnaam.nl
```

### Back-up stappen vóórdat we iets bouwen

1. **Git tag aanmaken** op huidige staat van `ozvolt-crm` (zie boven)
2. **Vercel snapshot** — ga naar Vercel Dashboard > jouw project > Deployments > maak aantekening van huidige deployment URL
3. **Database dump** — in Neon console: export huidige database als SQL backup
4. **Noteer alle env vars** — Vercel Dashboard > Settings > Environment Variables (screenshot of notitie)

### Hoe voorkomen we dat het live Ozvolt CRM kapotgaat?

- **Werk altijd in de NIEUWE repository** (`installateurflow`)
- Push nooit naar `ozvolt-crm` tenzij je bewust Ozvolt-specifieke bugfixes doet
- Gebruik aparte Vercel-projecten — een fout in `installateurflow` deployment heeft nul invloed op `ozvolt-crm`
- Gebruik aparte Neon databases — `installateurflow` krijgt een eigen database
- Test altijd op de demo-omgeving, niet op productie

---

## 1. Kunnen we van dit Ozvolt CRM een aparte verkoopbare versie maken?

**Ja, absoluut. De businesslogica is volledig aanwezig en professioneel gebouwd.**

De 8-stappen workflow die jij gebruikt is volledig geïmplementeerd:

| Stap | Status in code | Herbruikbaar voor pilot? |
|---|---|---|
| Lead → klus → bellen → gebeld_status | ✅ Volledig | ✅ Ja |
| Offerte → PDF → digitale tokenlink | ✅ Volledig | ✅ Ja |
| Werkafspraak → digitale bevestiging | ✅ Volledig | ✅ Ja |
| Agenda → taken + foto's | ✅ Volledig | ✅ Ja |
| Meerwerk → klantportaal acceptatie | ✅ Volledig | ✅ Ja |
| Factuur (auto van offerte) → betaallink | ✅ Volledig | ✅ Ja (betaallink optioneel) |
| Opleveringsrapport → foto's + handtekeningen | ✅ Volledig | ✅ Ja |
| Moneybird boekhoudingssync | ✅ Volledig | ✅ Optioneel (al conditioneel in code) |

**Kritieke bevinding over Moneybird:** de Moneybird-koppeling is al conditioneel geïmplementeerd:
```typescript
// app/api/facturen/[id]/versturen/route.ts:76
if (process.env.MONEYBIRD_API_TOKEN && process.env.MONEYBIRD_ADMIN_ID && !factuur.moneybird_id) {
  // sync naar Moneybird
}
```
Als `MONEYBIRD_API_TOKEN` niet is ingesteld in `.env`, slaat het systeem Moneybird-sync automatisch over. **Het systeem werkt al zonder Moneybird.** Geen extra code nodig voor de pilot.

---

## 2. Aparte map/project: naam en structuur

### Aanbevolen naam: `installateurflow`

Redenen:
- Beschrijvend voor de doelgroep (installateurs)
- Flow = het proces dat het systeem beheert
- Internationaal bruikbaar (Installateurflow.nl of Installateurflow.io)
- Niet te specifiek voor één sector
- Professioneel en tech-friendly

**Alternatieven:** `vakportaal`, `klusflow`, `monteocrm`, `installatix`

### Aanbevolen projectstructuur (aparte repository)

```
/installateurflow/                    ← nieuwe root (aparte Git repo)
  /app/                               ← gekopieerd van Ozvolt, dan schoongemaakt
  /components/                        ← gekopieerd, volledig herbruikbaar
  /lib/
    config.ts                         ← NIEUW — centrale bedrijfsconfiguratie
    db.ts                             ← gekopieerd
    mail.ts                           ← gekopieerd, dan generiek gemaakt
    moneybird.ts                      ← gekopieerd, optioneel laten
    pdf-factuur.ts                    ← gekopieerd, dan generiek gemaakt
    projectbeheer.ts                  ← gekopieerd, dan generiek gemaakt
    session.ts                        ← gekopieerd
    security.ts                       ← gekopieerd
    utils.ts                          ← gekopieerd
  /db/
    schema.sql                        ← gekopieerd, tenant-kolommen later toevoegen
  /docs/
    SETUP.md                          ← NIEUW — installatiehandleiding voor klant
    ONBOARDING.md                     ← NIEUW — onboarding checklist
  .env.example                        ← UITGEBREID met bedrijfsvariabelen
  package.json                        ← gekopieerd
  next.config.mjs                     ← gekopieerd
  middleware.ts                       ← gekopieerd
  vercel.json                         ← gekopieerd (cron token aanpassen)
```

### Welke bestanden worden gekopieerd / hergebruikt

| Categorie | Bestanden | Actie |
|---|---|---|
| **Volledig herbruikbaar (kopieer ongewijzigd)** | `components/` (alle 8), `lib/db.ts`, `lib/session.ts`, `lib/security.ts`, `lib/utils.ts`, `lib/use-autosave.ts`, `lib/oplevering-checklists.ts`, `lib/klant-sessie.ts`, `db/schema.sql`, `middleware.ts`, `next.config.mjs`, `package.json`, `tsconfig.json`, `tailwind.config.ts` | Direct kopiëren |
| **Kopiëren + generiek maken** | `lib/mail.ts`, `lib/pdf-factuur.ts`, `lib/projectbeheer.ts`, `lib/moneybird.ts`, alle `app/api/` routes | Kopiëren, dan Ozvolt-strings vervangen via `lib/config.ts` |
| **Kopiëren + kleine aanpassing** | `lib/dashboard-cache.ts`, alle `app/` pagina's | Kopiëren, dan branding-referenties vervangen |
| **Nieuw bouwen** | `lib/config.ts`, `.env.example` (uitgebreid), `docs/SETUP.md` | Nieuw aanmaken |
| **Blijft alleen in Ozvolt** | Live `.env.local`, Ozvolt logo-bestanden, Ozvolt-specifieke content | Niet kopiëren |

### Environment variables gescheiden houden

```
ozvolt-crm/.env.local (Vercel project 1):
  DATABASE_URL=neon://ozvolt-database
  ADMIN_USER=ahmed
  SITE_URL=https://portaal.ozvoltelektro.nl
  MONEYBIRD_API_TOKEN=ozvolt-token
  ...

installateurflow/.env.local (Vercel project 2):
  DATABASE_URL=neon://klant-eigen-database     ← APARTE DATABASE
  ADMIN_USER=admin
  SITE_URL=https://crm.klantnaam.nl
  BEDRIJF_NAAM=Laadpaal Installaties BV
  BEDRIJF_KVK=12345678
  BEDRIJF_BTW=NL123456789B01
  BEDRIJF_EMAIL=info@klantnaam.nl
  BEDRIJF_LOGO_URL=https://cdn.klantnaam.nl/logo.png
  MONEYBIRD_API_TOKEN=                          ← leeg = Moneybird uitgeschakeld
  ...
```

---

## 3. Domein/deployment advies

### Domein voor de verkoopbare versie

**Voor de demo-omgeving (eigen gebruik):**
- `demo.installateurflow.nl` of `crm.installateurflow.nl`
- Hier toon je prospects de demo met nep-data

**Voor elke klant:**
- `crm.klantnaam.nl` — klant heeft eigen subdomein op hun eigen domein
- Of: `klantnaam.installateurflow.nl` — subdomain van jouw platform

**Aanbeveling voor pilot:** gebruik `crm.klantnaam.nl` — professioneler, klant ziet eigen naam in de URL, geen afhankelijkheid van jouw platformnaam.

### Deployment-scheiding (100% veilig)

```
Vercel Account
├── Project: ozvolt-crm          → portaal.ozvoltelektro.nl    (jouw live CRM)
├── Project: installateurflow-demo → demo.installateurflow.nl  (demo-omgeving)
├── Project: klant-1-naam        → crm.klant1naam.nl          (pilotklant 1)
└── Project: klant-2-naam        → crm.klant2naam.nl          (pilotklant 2)
```

Elk Vercel-project heeft:
- Eigen environment variables
- Eigen database (aparte Neon database)
- Eigen domein
- Eigen deployment-pipeline
- Volledig geïsoleerd van elkaar

### Database-scheiding

```
Neon Account
├── Database: ozvolt-live         ← NIET AANRAKEN (jouw Ozvolt data)
├── Database: installateurflow-demo ← voor demo-omgeving
├── Database: klant-1-naam        ← voor pilotklant 1
└── Database: klant-2-naam        ← voor pilotklant 2
```

Neon heeft een gratis tier tot 0,5 GB per database. Tot ~5 klanten geen extra kosten.

### Staging/demo omgeving

De demo-omgeving heeft:
- Nep-bedrijfsnaam: "Demo Installaties BV"
- Nep-KVK: 12345678
- Nep-klanten met echte workflow-data (offertes, facturen, opleverrapporten)
- Echte e-mailfunctionaliteit naar jouw eigen testadres
- Geen echte betaalkoppelingen

### Productieomgeving per klant

Per klant:
1. Nieuwe Neon database aanmaken (5 minuten)
2. Nieuw Vercel project aanmaken (5 minuten)
3. `.env` invullen met klantgegevens (10 minuten)
4. `schema.sql` uitvoeren op nieuwe database (2 minuten)
5. Klantdomein koppelen (10 minuten)
6. Totale setup-tijd: **±30 minuten**

---

## 4. Multi-tenant SaaS vs aparte installatie per klant

### Vergelijking Route A (aparte installatie) vs Route B (multi-tenant SaaS)

| Criterium | Route A: Aparte installatie | Route B: Multi-tenant SaaS |
|---|---|---|
| **Veiligheid** | ✅ Maximaal — data volledig geïsoleerd op database-niveau | ⚠️ Risico op data-lekkage als tenant-isolatie fout zit |
| **Risico voor Ozvolt** | ✅ Nul — volledig gescheiden | ✅ Nul — aparte codebase |
| **Snelheid om te starten** | ✅ Nu mogelijk — 3–5 dagen werk | ❌ 8–16 weken ontwikkelwerk |
| **Ontwikkelwerk** | ✅ Minimaal — bestaande code kopiëren + generiek maken | ❌ Zwaar — tenant_id toevoegen aan 17 tabellen, middleware, auth |
| **Schaalbaarheid** | ⚠️ Beperkt — elke klant = apart project, handmatige setup | ✅ Onbeperkt — één deployment, automatische onboarding |
| **Kosten infrastructuur** | ✅ €0–5/maand per klant tot ~10 klanten | ✅ Goedkoper per klant bij schaal |
| **Onderhoud** | ⚠️ Updates moeten per klant uitgerold worden | ✅ Eén update, alle klanten profiteren |
| **Verkoopbaarheid pilot** | ✅ Uitstekend — klant ziet eigen omgeving | ✅ Uitstekend |
| **Internationaal opschalen** | ⚠️ Moeilijk boven 20–30 klanten | ✅ Eenvoudig — één platform |
| **Klantdata isolatie** | ✅ Gegarandeerd — eigen database | ⚠️ Vereist correcte implementatie |
| **Tijd tot eerste klant** | ✅ 2 weken | ❌ 4–6 maanden |
| **Budget-vriendelijk** | ✅ Ja — ~€0 extra infra-kosten | ❌ Nee — dev-investering eerst |

### Advies: Begin met Route A, bouw parallel naar Route B

**Fase 1 (nu, 0–3 maanden):** Route A — aparte installatie per klant
- Start verkopen binnen 2 weken
- Elke klant = eigen Vercel project + eigen Neon database
- Setup per klant: 30 minuten handmatig werk
- Leer wat klanten echt willen vóórdat je investeert in SaaS

**Fase 2 (3–9 maanden):** Route B — multi-tenant SaaS
- Op basis van feedback van echte klanten bouwen
- Automatische onboarding
- Betaald via Stripe (eigen SaaS-abonnementen)

**Waarom nu Route A?**
- Je hebt €1.000 budget en parttime tijd
- Route B vereist 8–16 weken fulltime of 6–12 maanden parttime vóórdat je ook maar één euro verdient
- Route A levert binnen 2 weken potentieel de eerste €89–119/maand
- Met 5 klanten heb je €500–600/maand recurring — genoeg om Route B te bouwen

---

## 5. Multi-tenant status huidige code

### Resultaat: nul tenant-isolatie in de gehele codebase

Grep op `tenant`, `company_id`, `organization_id`, `workspace_id`, `business_id` in `/db/` en `/lib/` → **nul resultaten**.

### Tabel per onderdeel

| Onderdeel | Tabel | Tenant-scheiding? | Risico bij gedeeld gebruik | Benodigde aanpassing voor SaaS |
|---|---|---|---|---|
| Klanten | `klanten` | ❌ Nee | Klant A ziet klanten van klant B | `tenant_id INTEGER NOT NULL` toevoegen |
| Leads/Klussen | `klussen` | ❌ Nee | Zelfde probleem | `tenant_id` + alle queries filteren |
| Offertes | `offertes` | ❌ Nee | **Kritiek** — financiële data zichtbaar voor anderen | `tenant_id` toevoegen |
| Offerte-regels | In `offertes.regels` (JSONB) | ❌ Nee | Zit in offerte-tabel | Volgt offerte-isolatie |
| Facturen | `facturen` | ❌ Nee | **Kritiek** — financiële data | `tenant_id` toevoegen |
| Kosten | `kosten` | ❌ Nee | Financiële data | `tenant_id` toevoegen |
| Planning/afspraken | `agenda_items` | ❌ Nee | Planningdata zichtbaar | `tenant_id` toevoegen |
| Werkafspraken | `werkafspraken` | ❌ Nee | Contractdata zichtbaar | `tenant_id` toevoegen |
| Taken/foto's | `project_taken` | ❌ Nee | Projectdata zichtbaar | `tenant_id` toevoegen (via `klus_id`) |
| Documenten/bijlagen | In JSONB-velden | ❌ Nee | Vercel Blob — gedeelde opslag | Aparte Blob-container per tenant |
| Meerwerk | `project_meerwerk` | ❌ Nee | Financiële data | `tenant_id` (via `klus_id`) |
| Opleverrapporten | `opleveringsrapporten` | ❌ Nee | Klantdata + foto's | `tenant_id` toevoegen |
| Handtekeningen | In `opleveringsrapporten` als data-URL | ❌ Nee | Privacygevoelig | Volgt rapport-isolatie |
| WhatsApp-berichten | `whatsapp_messages` | ❌ Nee | Communicatiedata | `tenant_id` toevoegen |
| Klantportaal-sessies | `klant_sessies` | ❌ Nee | Token-conflict mogelijk | `tenant_id` toevoegen |
| Boekhoudkoppelingen | Moneybird env vars | N.v.t. (per deployment) | Geen risico bij aparte installatie | Env var per tenant bij SaaS |
| E-mailtemplates | Hardcoded in `lib/mail.ts` | ❌ Nee | Ozvolt-branding overal | `lib/config.ts` centrale config |
| Producten/diensten | Geen aparte tabel (in JSONB) | N.v.t. | Geen risico | Optioneel: producttabel per tenant |
| Bedrijfsinstellingen | Hardcoded + env vars | N.v.t. | Ozvolt-specifiek | `lib/config.ts` + env vars |
| Publieke tokenlinks | `accept_token` in offertes | ⚠️ Deels | Token is uniek per offerte, maar geen tenant-check | Token-validatie uitbreiden |
| Betaallinks | `betaal_url` in offertes/facturen | N.v.t. (per deployment) | Geen risico bij aparte installatie | Env var per tenant bij SaaS |
| Admin-login | Env vars `ADMIN_USER`/`ADMIN_PASS` | N.v.t. (per deployment) | Eén admin per deployment | Gebruikerstabel aanmaken voor SaaS |
| Notificaties | `admin_notifications` | ❌ Nee | Notificaties gemengd | `tenant_id` toevoegen |
| Inkooplijsten | `inkoop_lijsten`, `inkoop_items` | ❌ Nee | Inkoopdata gemengd | `tenant_id` toevoegen |
| Groepverklaringen | `groenverklaringen` | ❌ Nee | Documenten gemengd | `tenant_id` toevoegen |

### Conclusie multi-tenant check

Voor **Route A (aparte installatie):** geen enkel probleem. Elke klant heeft eigen database = volledige isolatie gegarandeerd.

Voor **Route B (SaaS):** alle 17 tabellen moeten worden uitgebreid met `tenant_id`. Dit is substantieel werk maar wel systematisch (zoek-en-vervang in queries).

---

## 6. Ozvolt-specifieke onderdelen

### Compleet overzicht — 45 bestanden, 7 categorieën

#### Categorie 1: Kern-branding in e-mail en PDF (KRITIEK voor pilotversie)

| Bestand | Ozvolt-specifiek onderdeel | Hoe generiek maken |
|---|---|---|
| `lib/mail.ts:29` | `SMTP_FROM_NAME ?? 'Ozvolt Elektrotechniek'` | Fallback naar `config.naam` |
| `lib/mail.ts:38` | `LOGO_URL = 'https://portaal.ozvoltelektro.nl/logo-wit.png'` | `config.logoUrl` |
| `lib/mail.ts:59,98,99,101,102,107` | Naam, KVK, BTW, e-mail, tel, website in HTML-templates | Alle vervangen door `config.*` |
| `lib/mail.ts:214` | `"Met vriendelijke groet, Ahmed Öz / Ozvolt Elektrotechniek"` | `config.contactpersoon` |
| `lib/pdf-factuur.ts:50,52` | Naam + KVK/BTW op factuur-PDF | `config.naam`, `config.kvk`, `config.btw` |
| `lib/pdf-factuur.ts:197` | `"t.n.v. Ozvolt Elektrotechniek"` op betaalinstructie | `config.naam` |
| `lib/pdf-factuur.ts:214,216` | Footer factuur PDF | `config.*` |
| `app/api/offertes/[id]/pdf/route.ts` | Logo, naam, KVK, BTW in offerte-PDF | `config.*` |
| `app/api/facturen/[id]/pdf/route.ts` | Logo, naam, KVK, BTW, e-mail in factuur-PDF | `config.*` |
| `app/api/afspraken/[id]/pdf/route.ts` | Logo, naam, KVK, e-mail in werkafspraak-PDF | `config.*` |

#### Categorie 2: Hardcoded businesslogica (KRITIEK)

| Bestand | Ozvolt-specifiek onderdeel | Hoe generiek maken |
|---|---|---|
| `app/afspraken/[id]/AfspraakForm.tsx:105` | `<option value="ozvolt">Regelt Ozvolt</option>` | Vervang "ozvolt" door "bedrijf", label via `config.naam` |
| `lib/mail.ts:344` | `verantwoordelijke === 'ozvolt'` check in e-mailtemplate | Vervang check naar `=== 'bedrijf'` |
| `lib/mail.ts:420` | Zelfde check in andere e-mailtemplate | Idem |
| `app/api/afspraken/[id]/pdf/route.ts:146-147` | `.ver-ozvolt` CSS class + "Regelt Ozvolt" label | Generiek CSS + label via config |

#### Categorie 3: Hardcoded URL-fallbacks (BELANGRIJK)

| Bestand | Ozvolt-specifiek onderdeel | Hoe generiek maken |
|---|---|---|
| 20+ API-routes | `process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'` | Fallback naar `'http://localhost:3000'` |
| `app/api/offertes/[id]/accepteren-klant/route.ts:60` | `NOTIF_EMAIL ?? 'financien@ozvoltelektro.nl'` | Fallback naar `config.email` |

#### Categorie 4: AI-e-mailgenerator (MIDDEL)

| Bestand | Ozvolt-specifiek onderdeel | Hoe generiek maken |
|---|---|---|
| `app/api/mail/genereren/route.ts:17-31` | Prompt met Ozvolt-naam, Ahmed Öz, NEN 1010, NEN 3140, VCA, e-mail | Alles via `config.*` — naam, certificeringen, contactpersoon |

#### Categorie 5: Klantportaal-teksten (MIDDEL)

| Bestand | Ozvolt-specifiek onderdeel | Hoe generiek maken |
|---|---|---|
| `app/klant/dashboard/page.tsx` | Logo + naam in portaal-header | `config.naam`, `config.logoUrl` |
| `app/klant/layout.tsx` | Logo in portaal-layout | `config.logoUrl` |
| `app/(publiek)/offerte/[token]/page.tsx` | Naam + logo in publieke offertepagina | `config.*` |
| `app/(publiek)/werkafspraak/[token]/page.tsx` | Naam + logo | `config.*` |
| `app/klant/geen-toegang/page.tsx` | "Ozvolt Elektrotechniek" in foutpagina | `config.naam` |

#### Categorie 6: Metadata/SEO/layout (LAAG)

| Bestand | Ozvolt-specifiek onderdeel | Hoe generiek maken |
|---|---|---|
| `app/layout.tsx` | Page title + metadata | `config.naam` |
| `app/rapporten/layout.tsx` | Logo in rapporten-layout | `config.logoUrl` |
| `app/rapporten/[id]/print/page.tsx` | Naam in print-header | `config.naam` |

#### Categorie 7: Moneybird-specifieke UI (OPTIONEEL)

| Bestand | Ozvolt-specifiek onderdeel | Hoe generiek maken |
|---|---|---|
| `app/instellingen/boekhouding/page.tsx` | Moneybird-instellingenpagina | Verberg als `MONEYBIRD_API_TOKEN` niet ingesteld |
| `app/facturen/[id]/FactuurActions.tsx` | Moneybird-sync knoppen | Conditioneel tonen |
| `app/offertes/[id]/OfferteActions.tsx` | Betaallink via Moneybird | Conditioneel tonen |

### Samenvatting: wat te doen per categorie

| Categorie | Bestanden | Prioriteit | Schatting |
|---|---|---|---|
| Kern-branding e-mail + PDF | 10 bestanden | **Kritiek** | 1 dag |
| Hardcoded businesslogica | 4 bestanden | **Kritiek** | 2 uur |
| URL-fallbacks | 20+ bestanden | **Kritiek** | 2 uur |
| AI-prompt | 1 bestand | **Kritiek** | 1 uur |
| Klantportaal-teksten | 5 bestanden | Middel | 2 uur |
| Metadata/SEO | 3 bestanden | Laag | 1 uur |
| Moneybird UI conditioneel | 3 bestanden | Laag | 1 uur |

---

## 7. Boekhouding en betaling: flexibele structuur

### Hoe werkt de huidige Moneybird-koppeling?

De koppeling in `lib/moneybird.ts` (167 regels) doet het volgende:

| Functie | Wat het doet |
|---|---|
| `mbZoekContact()` | Zoekt klant op e-mail in Moneybird |
| `mbMaakContact()` | Maakt nieuwe klant aan in Moneybird |
| `mbHaalOfMaakContact()` | Combineert bovenstaande |
| `mbMaakFactuur()` | Maakt factuur aan in Moneybird (met regels, BTW, klant) |
| `mbVerstuurFactuur()` | Markeert factuur als verzonden in Moneybird |
| `mbHaalFactuur()` | Haalt factuutstatus op uit Moneybird |
| `mbMarkeerBetaald()` | Markeert factuur als betaald (handmatige boeking) |
| `mbMaakBetaalLink()` | Genereert online betaallink via Moneybird |
| `mbZoekContactOpNaam()` | Zoekt klant op naam |

### Wat is puur boekhouding-sync vs betaling?

| Onderdeel | Type | Verplicht? |
|---|---|---|
| Klant aanmaken in Moneybird | Boekhouding-sync | Nee |
| Factuur aanmaken in Moneybird | Boekhouding-sync | Nee |
| Factuur versturen via Moneybird | Boekhouding-sync | Nee |
| Betaalstatus ophalen | Betaling | Nee |
| Betaallink genereren via Moneybird | **Betaling** | Nee |
| Webhook betalingsbevestiging | **Betaling** | Nee |
| Factuur-PDF genereren (eigen systeem) | Eigen functie | **Ja** |
| E-mail met factuur sturen (eigen SMTP) | Eigen functie | **Ja** |

### Kan het systeem werken zonder Moneybird?

**Ja — en dit is al zo gebouwd.** De code checkt altijd eerst:
```typescript
if (process.env.MONEYBIRD_API_TOKEN && process.env.MONEYBIRD_ADMIN_ID) {
  // sync naar Moneybird
}
```

Zonder deze env vars:
- Facturen worden gewoon aangemaakt en verzonden via eigen SMTP ✅
- Eigen PDF-factuur wordt gegenereerd ✅
- `moneybird_id` en `moneybird_url` blijven leeg in de database ✅
- De "Sync naar Moneybird" knop doet niks maar crasht niet ✅

### Aanbevolen flexibele betalingsstructuur voor pilot

**Pilotversie (MVP):**
```
Betalingsflow zonder externe koppeling:
1. Factuur aanmaken in CRM
2. PDF genereren
3. Factuur e-mailen via SMTP (eigen of klant's SMTP)
4. Klant betaalt via bankoverschrijving (IBAN in factuur-PDF)
5. Admin markeert handmatig als "betaald" in CRM
```

Dit werkt **vandaag** zonder enige aanpassing.

**Later toevoegen (op klantverzoek):**
```
Betaaloptie A: Moneybird (voor klanten met Moneybird-abonnement)
  → MONEYBIRD_API_TOKEN + MONEYBIRD_ADMIN_ID instellen → direct werkend

Betaaloptie B: Mollie (standalone betaalprovider)
  → MOLLIE_API_KEY instellen → betaallink in factuur
  → Webhook voor automatische betalingsbevestiging (Mollie webhook signature eerst fixen!)

Betaaloptie C: Stripe
  → Nieuw te bouwen (3–5 dagen werk)

Betaaloptie D: Geen betaling
  → Default — werkt al
```

### Aanbeveling voor abstracte betalingsstructuur (later, voor SaaS)

```typescript
// lib/payment-provider.ts (later bouwen)
type PaymentProvider = 'none' | 'moneybird' | 'mollie' | 'stripe'

const provider: PaymentProvider = 
  process.env.PAYMENT_PROVIDER as PaymentProvider ?? 'none'

export async function maakBetaalLink(factuurId: string, bedrag: number) {
  switch (provider) {
    case 'moneybird': return mbMaakBetaalLink(...)
    case 'mollie':    return mollieMaakLink(...)
    case 'stripe':    return stripeMaakLink(...)
    case 'none':      return null
  }
}
```

---

## 8. Verkoopbare MVP — Wat is minimaal nodig?

### Tabel: MVP-scope

| Functie | Status in code | Pilot: absoluut nodig | Pilot: handig | Betaalde versie | SaaS later | Niet nodig |
|---|---|---|---|---|---|---|
| Lead/klus aanmaken | ✅ Werkend | ✅ | | | | |
| Klantgegevens beheren | ✅ Werkend | ✅ | | | | |
| Offerte met regels, BTW, korting | ✅ Werkend | ✅ | | | | |
| Offerte-PDF genereren | ✅ Werkend | ✅ | | | | |
| Digitale akkoordlink (tokenlink) | ✅ Werkend | ✅ | | | | |
| E-mail versturen (SMTP) | ✅ Werkend | ✅ | | | | |
| Factuur aanmaken | ✅ Werkend | ✅ | | | | |
| Factuur-PDF genereren | ✅ Werkend | ✅ | | | | |
| Handmatig betaling markeren | ✅ Werkend | ✅ | | | | |
| Klantportaal (magic link) | ✅ Werkend | ✅ | | | | |
| Planning/agenda | ✅ Werkend | | ✅ | | | |
| Werkafspraak digitaal | ✅ Werkend | | ✅ | | | |
| Taken en foto's per klus | ✅ Werkend | | ✅ | | | |
| Meerwerk vastleggen + accepteren | ✅ Werkend | | ✅ | | | |
| Opleveringsrapport + handtekeningen | ✅ Werkend | | ✅ | | | |
| Inkooplijsten | ✅ Werkend | | | ✅ | | |
| Urenschrijven | ✅ Werkend | | | ✅ | | |
| Notificatiecron | ✅ Werkend | | | ✅ | | |
| Kosten/uitgaven | ✅ Werkend | | | ✅ | | |
| Dashboard omzetcijfers | ✅ Werkend | | ✅ | | | |
| Moneybird-sync | ✅ Werkend | | | ✅ | | |
| Online betaallink | ✅ Werkend | | | ✅ | | |
| WhatsApp-integratie | ✅ Werkend | | | ✅ | | |
| AI e-mailgenerator | ✅ Werkend | | ✅ | | | |
| Multi-user / monteurs | ❌ Niet aanwezig | | | | ✅ | |
| Rollen en rechten | ❌ Niet aanwezig | | | | ✅ | |
| Productcatalogus | ❌ Niet aanwezig | | | ✅ | | |
| Kalenderintegratie | ❌ Niet aanwezig | | | | ✅ | |
| Onderhoudsfacturen | ❌ Niet aanwezig | | | | ✅ | |
| Multi-tenant SaaS | ❌ Niet aanwezig | | | | ✅ | |
| Eigen Stripe-facturering | ❌ Niet aanwezig | | | | ✅ | |

### Minimale pilotversie (3–5 werkdagen)

1. `lib/config.ts` aanmaken met alle bedrijfsvariabelen
2. 45 bestanden updaten om Ozvolt-specifieke strings te vervangen
3. `verantwoordelijke === 'ozvolt'` vervangen door `=== 'bedrijf'`
4. SITE_URL fallback vervangen
5. AI-prompt generiek maken
6. `.env.example` uitbreiden
7. Demo-omgeving opzetten
8. AVG-documenten opstellen

---

## 9. Security en privacy voor de aparte verkoopbare versie

### Kritiek vóór pilot (MOET aanwezig zijn)

| Maatregel | Status nu | Actie |
|---|---|---|
| **Aparte database per klant** | Route A = automatisch geregeld | ✅ Geen actie nodig bij aparte deployments |
| **Aparte bestandsopslag (Vercel Blob)** | Gedeeld Blob account bij Ozvolt | Aparte Vercel Blob token per klant instellen via `BLOB_READ_WRITE_TOKEN` |
| **Veilige admin-login (bcrypt)** | ✅ Aanwezig (`ADMIN_PASS_HASH`) | Zorg dat klant `ADMIN_PASS_HASH` gebruikt, niet `ADMIN_PASS` |
| **JWT sessies (httpOnly cookies)** | ✅ Aanwezig | Geen actie |
| **Klantportaal magic links** | ✅ Aanwezig (24u geldig) | Geen actie |
| **HTTPS (via Vercel)** | ✅ Automatisch in productie | Geen actie |
| **Geen secrets in code** | ✅ Alles via env vars | Controleer bij elke klant dat `.env` niet in Git staat |
| **Verwerkersovereenkomst (DPA)** | ❌ Ontbreekt | Opstellen vóór eerste externe klant |
| **Privacyverklaring** | ❌ Ontbreekt | Opstellen vóór eerste externe klant |
| **Algemene voorwaarden** | ❌ Ontbreekt | Opstellen vóór eerste externe klant |
| **Mollie webhook signature verificatie** | ❌ Ontbreekt | Fix als Mollie wordt gebruikt — anders geen risico |

### Belangrijk vóór verkoop

| Maatregel | Status | Actie |
|---|---|---|
| **Back-up strategie** | Neon heeft automatische backups | Documenteer dit in SLA voor klant |
| **Brute-force bescherming** | ✅ Aanwezig (5 pogingen → 5 min lockout) | Geen actie |
| **Parameterized SQL** | ✅ Aanwezig (SQL-injectie veilig) | Geen actie |
| **AVG-rechten** | ❌ Ontbreekt | Voeg "account verwijderen" functie toe |
| **Foutlogging** | ❌ Geen centrale logging | Later Sentry toevoegen |

### Later

- Audit-log (wie zag welke data, wanneer)
- Twee-factor authenticatie
- IP-whitelist voor admin
- Automatische data-export voor klant (AVG recht op overdraagbaarheid)
- Penetratietest voor SaaS-versie

---

## 10. Commerciële beoordeling per doelgroep

| Doelgroep | Probleem | Match workflow | Betalingsbereidheid | Bereikbaarheid | Concurrentie | Score | Advies |
|---|---|---|---|---|---|---|---|
| **Laadpaalinstallateurs (2–15 man)** | Offerte-opvolging, digitale oplevering, subsidiedocumentatie | ✅ Uitstekend | ⭐⭐⭐⭐ Hoog (groeimarkt, hoge orderwaarden) | ⭐⭐⭐ Goed (LinkedIn, brancheverenigingen) | ⭐⭐ Laag (nauwelijks niche-software) | **9/10** | **Start hier** |
| **Kleine elektrotechnische bedrijven (2–10 man)** | Offerte in Word, geen opvolging, geen portaal | ✅ Uitstekend — systeem is hier exact voor gebouwd | ⭐⭐⭐⭐ Hoog | ⭐⭐⭐ Middel | ⭐⭐ Laag | **9/10** | **Primaire doelgroep** |
| **Zonnepaneelinstallateurs (2–20 man)** | Offerte meerdere opties, oplevering keuringsrapport, subsidie-documenten | ✅ Goed — offerte + oplevering perfect | ⭐⭐⭐⭐ Hoog | ⭐⭐⭐⭐ Goed (social media actief) | ⭐⭐⭐ Middel (SolarCRM bestaat) | **8/10** | **Tweede doelgroep** |
| **ZZP-elektriciens** | Offertes in Word, facturen vergeten | ⚠️ Deels — te uitgebreid voor 1 man | ⭐⭐ Laag (budget beperkt) | ⭐ Moeilijk (verspreid) | ⭐⭐⭐ Middel | 5/10 | Later — wacht op SaaS-versie |
| **Airco-installateurs** | Offerte, planning, onderhoudsfacturen | ⚠️ Deels — onderhoudscontracten ontbreken | ⭐⭐⭐ Middel | ⭐⭐ Middel | ⭐⭐⭐ Middel | 6/10 | Fase 2 — voeg onderhoudsfunctie toe |
| **Loodgieters** | Spoedklussen, materiaallijsten, kleine offertes | ⚠️ Beperkt — andere workflow | ⭐⭐ Laag | ⭐ Moeilijk | ⭐⭐⭐ Middel | 4/10 | Niet nu |
| **Aannemers** | Projectbeheer, onderaannemers, BIM | ❌ Te licht voor complexe projecten | ⭐⭐⭐⭐ Hoog | ⭐⭐ Middel | ⭐⭐⭐⭐ Hoog (Procore, Exact) | 3/10 | Andere markt |
| **Onderhoudsbedrijven** | Terugkerende contracten, SLA's, preventief onderhoud | ❌ Ontbreekt abonnementsbeheer | ⭐⭐⭐⭐ Hoog | ⭐⭐ Middel | ⭐⭐⭐ Middel | 4/10 | Grote uitbreiding nodig |

### Keuze: start met doelgroepen 1 en 2

**Laadpaalinstallateurs** (meest urgent) + **elektrotechnische bedrijven** (meest logisch). Zonnepanelen als derde zodra je de eerste twee hebt bewezen.

---

## 11. Beste positionering

### 10 positioneringen

| # | Positionering | Doelgroep | Belofte | Waarom het verkoopt | Risico | Score |
|---|---|---|---|---|---|---|
| 1 | **"Offerte- en opleveringssoftware voor installateurs"** | Elektro + laadpaal + zon | Stop met Word-offertes. Klant tekent online, jij levert professioneel op. | Directe pijn (offerte-opvolging), concrete output (PDF + handtekening) | Smal — klinkt beperkt | 8/10 |
| 2 | **"Van aanvraag tot betaalde factuur — voor installatiebedrijven"** | Alle installateurs | Eén systeem voor je hele werkproces | Complete belofte, ROI duidelijk | Moeilijk in 10 seconden te begrijpen | 7/10 |
| 3 | **"Werkprocesportaal voor elektrotechnische bedrijven"** | Elektrotechniek | Alles geregeld — van lead tot oplevering | Professioneel, onderscheidend | "Portaal" te tech-jargon | 6/10 |
| 4 | **"Digitaal klantportaal voor installateurs"** | Alle installateurs | Jouw klant ziet alles online — zonder telefoontjes | Unieke feature, klantgericht argument | Minder duidelijk wat het systeem doet | 6/10 |
| 5 | **"Installatieproces-app voor technische bedrijven"** | Breed | Van klus aanmaken tot oplevering — op je telefoon | Modern, app-gevoel | Te vaag, "app" kan verkeerd verwachting geven | 5/10 |
| 6 | **"Lead-to-installation platform"** | Groeiende bedrijven | Nooit meer een lead, offerte of oplevering missen | Volledig, moderne term | Engels in NL-markt kan afstoten | 5/10 |
| 7 | **"Field service light voor kleine installatiebedrijven"** | 2–10 man | Grote bedrijfssoftware, kleine prijs | Duidelijke positionering t.o.v. Simpro | "Field service" onbekend bij doelgroep | 6/10 |
| 8 | **"CRM speciaal voor laadpaalinstallateurs"** | Laadpaal niche | Het systeem dat je concurrent nog niet heeft | Heel specifiek, makkelijk te pitchen | Te smal voor groei naar andere sectoren | 7/10 |
| 9 | **"Jouw hele werkproces digitaal — voor installatiebedrijven"** | Alle installateurs | Alles wat je nu met WhatsApp, Word en Excel doet, in één systeem | Herkend probleem (Word/Excel/WhatsApp-chaos) | Wat specifiek zet je op de homepage? | 8/10 |
| 10 | **"Offertes die klanten direct tekenen — plus alles daarna"** | Alle installateurs | Stuur in 5 minuten een offerte. Klant tekent op zijn telefoon. | Concrete feature als haak, rest volgt | Te focust op één feature | 7/10 |

### Winnaar: positionering 9 + haak van positionering 10

> **"Jouw hele werkproces digitaal — voor installatiebedrijven"**
>
> *Tagline: Offertes, planning, oplevering en facturering. Alles in één systeem, speciaal voor installateurs.*

**De haak in marketing:** "Stuur in 5 minuten een offerte. Klant tekent op zijn telefoon. Jij krijgt een bevestiging. Klaar."

---

## 12. Verkoopmodel vergelijking

| Model | Hoe werkt het | Voordeel | Nadeel | Benodigde techniek | Prijsrange | Risico | Advies |
|---|---|---|---|---|---|---|---|
| **1. Aparte installatie per klant** | Jij deployt het systeem voor elke klant (eigen Vercel + Neon + domein) | Snel starten, hoge veiligheid, weinig dev-werk | Handmatig per klant, niet schaalbaar boven 20 klanten | Minimaal — kopieer + env vars invullen | €299 setup + €89–149/mnd | Laag | ✅ Nu doen |
| **2. Done-for-you implementatie** | Jij configureert alles voor de klant, inclusief onboarding | Hoge marge per klant, leerproces | Tijdsintensief, jij bent de bottleneck | Geen extra | €500–1.500 per klant | Middel | ✅ Nu doen (combineer met model 1) |
| **3. Setup fee + maandabonnement** | Eenmalige setup fee + recurring | Directe inkomsten + recurring | Klant moet setup fee willen betalen | Geen extra | €299–699 setup + €89–229/mnd | Laag | ✅ Beste model voor pilot |
| **4. White-label** | Klant krijgt systeem onder eigen naam, jij beheert hosting | Professioneel, hogere recurring fee | Meer setup-werk, eigen domeinen per klant | Branding via config (3–5 dagen werk) | €299 setup + €149–299/mnd | Middel | ✅ Direct beschikbaar na generiek maken |
| **5. SaaS-abonnement** | Alle klanten op één platform, zelfbediening | Schaalt onbeperkt, passief inkomen | 8–16 weken bouwen voordat je kunt verkopen | Multi-tenancy, onboarding, Stripe | €49–199/mnd | Hoog (bouw-investering) | ⏳ Fase 2 |
| **6. Template/licentie** | Klant koopt de code + zet zelf op | Eenvoudig, lage overhead | Eenmalig inkomen, geen recurring | Geen | €1.000–3.000 eenmalig | Laag | ❌ Niet aanbevolen |
| **7. Maatwerkdienst** | Jij bouwt op maat voor elk bedrijf | Hoge dagprijs | Niet schaalbaar, elke klant anders | Varieert | €5.000–25.000+ per project | Middel | ❌ Alleen voor grote enterprise klanten |

### Beste model voor eerste 3 klanten

**Model 1 + 2 + 3 gecombineerd:**

> "Ik stel jouw eigen systeem in binnen 7 werkdagen — jouw logo, jouw naam, jouw klanten. Eenmalig €299 setup, daarna €119 per maand. Geen jaarcontract."

Dit combineert:
- Route A (aparte deployment = eenvoudig en veilig)
- Done-for-you (jij regelt alles, klant hoeft niks)
- Setup fee + maandabonnement (directe inkomsten + recurring)

---

## 13. Prijsstrategie

### Pakket 1: Pilot — Voor eerste 1–3 klanten

- **Setup fee:** €0 (gratis in ruil voor feedback + testimonial)
- **Maandprijs:** €49/maand (eerste 3 maanden)
- **Minimumduur:** geen
- **Inbegrepen:**
  - Volledig systeem met klantbranding
  - Leads, offertes, facturen, klantportaal
  - Digitale ondertekening
  - Opleveringsrapport
  - 2 uur onboarding via Zoom
  - 30 dagen WhatsApp-support
- **Doelgroep:** Laadpaalinstallateur of elektrotechnisch bedrijf, 2–8 man
- **Waarom ze dit betalen:** €49 is minder dan 1 uur werk — zelfs als het maar 2 uur bespaart, heeft het zichzelf terugverdiend op dag 1
- **Wanneer verkopen:** Nu — als bewijs en testimonial

### Pakket 2: Starter — Voor ZZP'ers en kleine installateurs

- **Setup fee:** €199
- **Maandprijs:** €69/maand
- **Minimumduur:** geen (maand-tot-maand)
- **Inbegrepen:**
  - Alles van pilotpakket
  - Werkafspraken (digitaal bevestigd)
  - Planning/agenda
  - Kosten bijhouden
- **Doelgroep:** ZZP-elektricien of installateur solo/duo
- **Waarom ze dit betalen:** Bespaar 3 uur/week = €195+ aan uren (bij €65/uur) — maandprijs terugverdiend in 1 dag
- **Wanneer verkopen:** Na eerste 3 pilot-testimonials

### Pakket 3: Professional — Voor groeiende installatiebedrijven

- **Setup fee:** €499
- **Maandprijs:** €119/maand
- **Minimumduur:** 3 maanden (dan maand-tot-maand)
- **Inbegrepen:**
  - Alles van Starter
  - Taken en foto's per klus
  - Meerwerk vastleggen + klantacceptatie
  - Opleveringsrapporten met handtekeningen
  - Inkooplijsten
  - Urenschrijven
  - Notificatiecron (dagelijkse checks)
  - Dashboard met omzetcijfers
  - AI e-mailgenerator
  - WhatsApp-integratie
  - Moneybird-sync (optioneel)
- **Doelgroep:** Installatiebedrijf 3–10 medewerkers
- **Waarom ze dit betalen:** Volledige workflow, geen losse tools meer, klanten betalen sneller via betaallink
- **Wanneer verkopen:** Nu — dit is het hoofdpakket

### Pakket 4: Growth — Voor bedrijven met meerdere monteurs

- **Setup fee:** €999
- **Maandprijs:** €199/maand
- **Minimumduur:** 6 maanden
- **Inbegrepen:**
  - Alles van Professional
  - Meerdere admingebruikers (nog te bouwen — 2–3 weken)
  - Prioriteitssupport (reactie < 24u)
  - Kwartaalgesprek (30 min)
  - Aanpassingen op maat (2 uur/kwartaal)
- **Doelgroep:** Installatiebedrijf 8–20 medewerkers
- **Wanneer verkopen:** Zodra multi-user beschikbaar is

### Pakket 5: White-label / Enterprise

- **Setup fee:** €2.000+
- **Maandprijs:** €349–599/maand
- **Minimumduur:** 12 maanden
- **Inbegrepen:**
  - Alles van Growth
  - Eigen domeinnaam + volledige branding
  - SLA (99% uptime-garantie)
  - Dedicated support
  - Onboarding-training (4 uur)
- **Doelgroep:** Installatiebedrijf 20+ man, franchiseketen, branchevereniging
- **Wanneer verkopen:** Zodra je 5+ klanten hebt en bewijs van kwaliteit

### Prijsoverzicht per fase

| Fase | Setup | Maand | Reden |
|---|---|---|---|
| Eerste 3 pilotklanten | €0 | €49 | Bewijs + testimonials ophalen |
| Na testimonials (klant 4–10) | €299–499 | €89–119 | Professioneel pakket, waarde bewezen |
| Na 10 klanten | €499–999 | €119–199 | Vertrouwen gebouwd, hogere marges |
| Als aparte installatie (white-label) | €499–999 | €119–299 | Per klant één deployment |
| Als SaaS (fase 2) | €0–99 | €69–199 | Geautomatiseerde onboarding, lagere drempel |

---

## 14. Marketingstrategie (90 dagen)

### 1. Eerste doelgroep
Laadpaalinstallateurs en elektrotechnische bedrijven, 2–10 medewerkers, eigenaar doet zelf de offertes, gebruikt Excel of Word, heeft geen CRM.

### 2. Hoofdprobleem
"Ik stuur een offerte en hoor weken niks. Ik bel na, de klant is 'nog aan het nadenken', en drie weken later zie ik dat ze voor een ander hebben gekozen."

### 3. Belofte
"Jouw klant tekent de offerte direct op zijn telefoon — zonder account, zonder gedoe. Jij krijgt meteen een bevestiging."

### 4. Eerste aanbod
Gratis demo van 20 minuten. Demo met demo-bedrijf tonen. Daarna pilotaanbod: €0 setup + €49/maand eerste 3 maanden.

### 5. Lead magnets

1. **"Offerte-audit" (gratis)** — 30 minuten call: jij kijkt mee naar hun huidige offerteproces en geeft 3 verbeterpunten
2. **"5 redenen waarom installateurs offertes verliezen"** — PDF-checklist
3. **"Offerte-template voor installatiebedrijven"** — Word/PDF met standaard BTW-regels en professionele opmaak
4. **"CRM-scan: gebruik jij 1 systeem of 5?"** — korte quiz met gepersonaliseerd resultaat
5. **"Hoe sneller je facturen betaald krijgt"** — 7-daagse e-mailreeks

### 6. Outreachstrategie

**Week 1–2:**
- 100 installateurs in kaart brengen (Google Maps, LinkedIn, KvK-uittreksel)
- 20 LinkedIn-verbindingsverzoeken per dag
- 10 koude e-mails per dag
- 5 WhatsApp/DM berichten per dag

**Week 3–4:**
- Follow-up op alle openstaande gesprekken
- Eerste 3–5 demo's geven
- Eerste pilotaanbod doen

### 7. Contentstrategie (LinkedIn + Instagram)

**20 contentideeën:**

1. "Hoe lang duurt het gemiddeld voordat jouw klant een offerte tekent?" (poll)
2. Screen recording: offerte maken in 5 minuten
3. "Waarom ik stopte met Word-offertes"
4. "5 dingen die elke elektricien in zijn offerte moet zetten (maar vergeet)"
5. "Meerwerk mondeling afgesproken? Zo bescherm je jezelf"
6. "De echte kosten van een te laat betaalde factuur" (rekensommetje)
7. Klantcase: [bedrijf X] bespaart 4 uur/week
8. Behind the scenes: zo ziet een klantportaal eruit
9. "3 signalen dat jouw offerteproces kapot is"
10. Tutorial: opleveringsrapport met foto's op je telefoon
11. "Welke software gebruik jij voor offertes?" (engagement)
12. Vergelijking: Word-offerte vs. digitale offerte
13. "Hoe weet jij hoeveel je deze maand hebt verdiend?" (eerlijk)
14. "Wat is jouw grootste administratie-frustratie?" (poll)
15. "Klant betaalt niet → zo voorkom je dat"
16. "Hoe een laadpaalinstallateur 40% sneller offertes stuurt"
17. "Zo ziet jouw klant zijn eigen portaal" (schermopname)
18. Q&A: jullie vragen over digitale offertes
19. "5 vragen die elke installateur zichzelf moet stellen"
20. Testimonial van pilotklant (na 30 dagen gebruik)
21. "Wat kost het jou als je de oplevering niet documenteert?"
22. "De ROI van een klantportaal: minder bellen, sneller betaald"
23. "Hoe ik een installateur in 7 dagen live had met zijn eigen systeem"
24. "NEN-gecertificeerd maar nog steeds offertes in Word? Dit is raar."

### 8. Demo-strategie

**Demo-flow (20 minuten):**
1. Introductie (1 min): "Ik laat je een realistisch scenario zien"
2. Nieuwe klant aanmaken (1 min)
3. Klus aanmaken (1 min)
4. Offerte opmaken — regels, BTW, korting (3 min)
5. PDF preview (1 min)
6. Offerte e-mailen → klantportaal tonen (magic link) → digitale ondertekening demo (3 min)
7. Klantportaal als klant bekijken (2 min)
8. Factuur aanmaken van offerte (2 min)
9. Dashboard (1 min)
10. Vraag: "Zie je hier waarde in voor jouw bedrijf?" (5 min gesprek)

### 9. Eerste 10 gesprekken

1. Persoonlijk netwerk — ken je installateurs? Begin daar
2. LinkedIn — eigenaren van bedrijven in jouw regio zoeken, verzoek sturen
3. Google Maps — "elektricien [stad]" → website → e-mailadres → koude mail
4. Instagram/Facebook — installatiebedrijven die actief zijn, DM sturen
5. Vakbeurzen of netwerkbijeenkomsten in jouw regio

### 10. Eerste 3 pilotklanten

Stap 1: Lead magnet aanbieden ("gratis offerte-audit")
Stap 2: In die call hun huidige proces uitvragen
Stap 3: Pilotaanbod doen aan het einde van de call: "Mag ik dit voor jou instellen? Gratis, 3 maanden €49, daarna normaal tarief. In ruil voor eerlijke feedback."
Stap 4: Bevestiging + start setup

---

## Uitgebreide Outreach-scripts

### 5 Koude e-mails

---

**E-mail 1 — Offerte-pijn**

Onderwerp: Hoe lang duurt het bij jou voordat een klant een offerte tekent?

Hoi [naam],

Ik zie op Google dat jullie [laadpalen / elektrotechnisch werk] installeren in [regio]. Goed werk.

Korte vraag: hoelang duurt het gemiddeld voordat een klant reageert op een offerte?

Voor de meeste installateurs is dat 5 tot 14 dagen. In die tijd bel je 1 of 2 keer na, weet je niet zeker of ze nog geïnteresseerd zijn, en raak je mogelijk de klus kwijt.

Ik heb een systeem gebouwd waarmee de klant de offerte direct online tekent — op zijn telefoon, geen account nodig. Je ontvangt meteen een bevestiging met naam, e-mail en tijdstip.

Mag ik je dat even laten zien? 20 minuten via Teams of Zoom, volledig vrijblijvend.

Met vriendelijke groet,
[jouw naam] — [telefoonnummer]

P.S. Als het niks voor jou is, hoor ik dat ook graag. Dan weet ik dat ik in de verkeerde richting zoek.

---

**E-mail 2 — Factuur-pijn**

Onderwerp: Hoe lang staan jullie facturen gemiddeld open?

Hoi [naam],

In de installatiesector staan facturen gemiddeld 30 tot 45 dagen open. Dat is 30–45 dagen dat jij het werk al hebt gedaan, maar het geld nog niet op je rekening staat.

Wij gebruiken een aanpak waarbij de klant al vóór oplevering de eerste 50% betaalt — via een betaallink die ze in hun eigen portaal zien. De tweede 50% zodra ze het opleveringsrapport tekenen.

Resultaat: sneller geld op rekening, minder najaag-werk.

Interesse in een korte demo? Ik laat je precies zien hoe het werkt voor installatiebedrijven.

[jouw naam] — [telefoonnummer]

---

**E-mail 3 — Meerwerk-pijn**

Onderwerp: Wat doe jij als er meerwerk bijkomt en de klant later zegt "dat hadden we niet afgesproken"?

Hoi [naam],

Herken je dit: je bent op locatie, er komt iets bij, je bespreekt het mondeling, en bij de eindafrekening is er discussie.

Dat kost niet alleen geld — het kost ook klantrelaties.

Wij hebben een functie waarbij de monteur meerwerk invoert in het systeem. De klant krijgt een bericht in zijn eigen portaal en klikt op "akkoord". Alles vastgelegd, inclusief naam en tijdstip.

Kan ik je dat laten zien? 15 minuten. Geen verkooppraatje.

[jouw naam]

---

**E-mail 4 — Tijdsbesparing**

Onderwerp: Hoeveel uur per week besteed jij aan offertes, facturen en klantcontact?

Hoi [naam],

Voor de meeste installateurs is dat 5 tot 10 uur per week. Dat is €325–650 aan uren (bij €65 uurtarief) die niet direct omzet genereren.

Ik help installatiebedrijven om dat terug te brengen naar 1 à 2 uur — met een systeem dat speciaal voor jullie sector is gebouwd.

Mag ik je dat in 20 minuten laten zien?

[jouw naam] — [telefoon]

---

**E-mail 5 — Nieuwsgierigheid**

Onderwerp: [naam installatiebedrijf] — kort bericht

Hoi [naam],

Ik heb een systeem gebouwd dat drie installatiebedrijven in [regio/sector] gebruiken voor hun offertes, planning, klantportaal en facturering.

Klanten tekenen de offerte online, betalen via een link in hun eigen portaal, en alles gaat automatisch naar de boekhouding.

Ik vroeg me af of dat ook iets is voor jullie. Maar ik weet niet of jullie al iets soortgelijks gebruiken.

Als jullie openstaan voor een korte blik — puur om te zien of het relevant is — dan plan ik graag een demo in.

[jouw naam]

---

### 5 WhatsApp/DM-berichten

**DM 1 — Kort en direct**
"Hoi [naam], ik zie dat jullie laadpalen installeren. Ik bouw systemen voor offerte, planning en oplevering speciaal voor installateurs. Mag ik je dat even laten zien? 20 min, online."

**DM 2 — Vraag-aanpak**
"Hey [naam], hoe doen jullie offertes op dit moment? Nog via Word/Excel of al met een systeem? Ik ben benieuwd."

**DM 3 — Pain-first**
"Hoi [naam], krijg je weleens klanten die niet reageren op een offerte? Ik heb iets gebouwd waarbij de klant direct op zijn telefoon tekent. Mag ik het je laten zien?"

**DM 4 — Sociaal bewijs**
"Hey [naam], ik help installatiebedrijven met hun offerte- en klantbeheersysteem. Heb zojuist iets opgezet voor een laadpaalinstallateur in [regio] — ze besparen nu 4 uur per week. Is dat iets voor jullie?"

**DM 5 — Pilot-aanpak**
"Hoi [naam], ik zoek 3 pilotbedrijven die een systeem voor offertes, planning en oplevering gratis mogen testen in ruil voor eerlijke feedback. Interesse?"

---

### Belscript

**Opening:**
"Goedemiddag, u spreekt met [naam]. Ik bel u kort. Ik heb software gebouwd speciaal voor installatiebedrijven — voor offertes, klantopvolging en oplevering. Ik wil direct zijn: ik bel niet om iets te verkopen, maar om u één vraag te stellen. Heeft u 2 minuten?"

**Vraag:**
"Hoe regelt u op dit moment uw offertes en klantopvolging? Werkt u met een systeem, of meer met Excel of Word?"

**Als Excel/Word:**
"Dat herken ik van veel bedrijven in uw sector. Het kost alleen veel tijd en klanten reageren vaak laat op een offerte. Herkent u dat?"

**Pitch (30 seconden):**
"Ik heb een systeem gebouwd waarbij u in 5 minuten een professionele offerte maakt, de klant hem direct op zijn telefoon ontvangt en online tekent — zonder account. U krijgt meteen een bevestiging. De factuur gaat automatisch naar uw boekhouding. Alles in één systeem, speciaal voor installatiebedrijven."

**CTA:**
"Mag ik u vrijblijvend een demo laten zien? 20 minuten online. Dan ziet u precies of het relevant is voor uw bedrijf. Wanneer schikt dat?"

---

### Demo-script (20 minuten)

"Welkom. Ik ga je laten zien hoe het systeem werkt voor een installatiebedrijf zoals het jouwe. We nemen een realistische situatie: een klant belt, wil een laadpaal of installatieklus, en we lopen het volledige proces door.

**[Stap 1 — 2 min]** We maken de klant aan. Naam, e-mail, telefoon. Particulier of zakelijk.

**[Stap 2 — 2 min]** We koppelen een klus aan de klant. Type werk, beschrijving, status 'nieuw'.

**[Stap 3 — 4 min]** Offerte maken. We voegen regels toe — materiaal, arbeid, BTW 21%. Korting als dat wil. Geldig tot datum. Kijk — dit is hoe de PDF eruitziet. Professioneel, jouw naam erop.

**[Stap 4 — 3 min]** We sturen de offerte. Klant krijgt een e-mail met een link. Die link opent een pagina waar de klant de offerte ziet en direct kan tekenen — op zijn telefoon, geen account nodig. Kijk — ik toon het je in het klantportaal.

**[Stap 5 — 2 min]** Zodra de klant tekent, jij een bevestiging. Status wordt automatisch 'geaccepteerd'.

**[Stap 6 — 2 min]** Factuur aanmaken vanuit de offerte — één klik. E-mail versturen. Klant ziet factuur in portaal en kan eventueel online betalen.

**[Stap 7 — 1 min]** Dashboard: hoeveel omzet deze maand, wat staat open, wat is achterstallig.

Dat is het. Ik kan dit voor jou in 7 werkdagen instellen met jouw naam, logo en bedrijfsgegevens. Wat vind je?"

---

### Follow-up script

*(Na e-mail of DM zonder reactie — stuur na 4–5 dagen)*

"Hoi [naam], ik stuurde je vorige week een bericht over het systeem voor installatiebedrijven. Ik snap dat het druk is.

Ik wil het er toch even uittillen — niet om te pushen, maar omdat ik denk dat het relevant is voor jullie type werk.

Als het niks voor jullie is, zeg dat gerust. Dan stop ik.

Maar als je 20 minuten vrij hebt om even mee te kijken — ik heb een demo klaarstaan die ik jou kan laten zien. Wanneer schikt dat?"

---

### 10 bezwaren met antwoorden

| Bezwaar | Antwoord |
|---|---|
| "Ik heb al Teamleader/HubSpot" | "Teamleader is geweldig voor B2B-sales, maar heeft geen opleveringsrapporten, digitale meerwerk-acceptatie of klantportaal specifiek voor installateurs. Mag ik je dat laten zien?" |
| "Ik gebruik gewoon Excel, dat werkt prima" | "Dat begrijp ik. De vraag is: hoeveel tijd kost je dat per week? En hoeveel offertes verlies je doordat klanten niet reageren? Laat me je dat in 20 minuten laten zien." |
| "Ik ben niet zo technisch" | "Dat is precies waarom ik alles voor je instel. Jij doet niks behalve 2 uur meedoen in de training. Daarna kun je het gewoon gebruiken." |
| "Dat kost te veel" | "€119 per maand is minder dan 2 uur werk. Als je met dit systeem elke week 2 uur bespaart, heeft het zichzelf terugverdiend op dag 1 van de volgende maand." |
| "Ik heb geen tijd om dit te leren" | "De onboarding duurt 2 uur. Daarna gebruik je het 30 minuten per dag. Je wint meer tijd dan je er in stopt." |
| "Ik doe toch maar kleine klusjes" | "Juist voor kleine klusjes is het interessant — je maakt een snelle offerte, klant tekent, jij krijgt snel betaald. Geen gedoe." |
| "Ik ben bang dat mijn data niet veilig is" | "Jouw data staat in een aparte database die alleen voor jou is. Ik gebruik Neon PostgreSQL met automatische backups en SSL-encryptie." |
| "Werkt het ook op mijn telefoon?" | "Ja, de admin-kant werkt op mobiel via de browser. De klant ondertekent ook op zijn telefoon. Geen app nodig." |
| "Wat als jullie stoppen?" | "Jouw data staat in een standaard PostgreSQL-database. Je kunt er altijd een export van maken. Je bent niet opgesloten." |
| "Kunnen jullie ook [specifieke feature] bouwen?" | "Dat is een goede vraag. Vertel me wat je nodig hebt — als het voor meerdere klanten relevant is, bouwen we het in. Voor pilotklanten doe ik dat gratis." |

---

## 15. Ontwikkelplan aparte map/project

### Fase 1: Analyse en back-up (Dag 1)

**Taken:**
- Git tag aanmaken op huidige staat: `git tag backup-ozvolt-live-DATUM && git push origin --tags`
- Screenshot/notitie van alle Vercel env vars (jouw Ozvolt project)
- Neon database-dump aanmaken als extra backup

**Risico's:** Geen — puur lezen en documenteren
**Tijd:** 1 uur

**Controleer voordat je doorgaat:**
- ✅ Git tag zichtbaar in `git tag --list`
- ✅ Neon-dump gemaakt

---

### Fase 2: Kopie aanmaken als aparte repository (Dag 1–2)

**Taken:**
1. Nieuwe map aanmaken BUITEN het huidige project: `cp -r /home/user/ozvolt-crm /home/user/installateurflow`
2. `.git` verwijderen uit kopie
3. Nieuwe Git repository initialiseren
4. Nieuwe GitHub repository aanmaken: `installateurflow`
5. `.env.local` verwijderen uit kopie (nooit meekopiëren)
6. Eerste commit pushen

**Bestanden die NIET mee mogen:**
```
.env.local
.env.production
node_modules/
.next/
```

**Risico's:** Geen invloed op het live Ozvolt CRM — werken in aparte map
**Tijd:** 2 uur

**Controleer voordat je doorgaat:**
- ✅ Ozvolt CRM draait nog normaal op jouw vercel-deployment
- ✅ Nieuwe repo beschikbaar op GitHub
- ✅ Geen .env bestanden in nieuwe repo

---

### Fase 3: Ozvolt-specifieke onderdelen generiek maken (Dag 2–4)

**Taken (in de nieuwe `installateurflow` repository):**

1. **Maak `lib/config.ts` aan:**
```typescript
export const bedrijf = {
  naam:        process.env.BEDRIJF_NAAM        ?? 'Mijn Installatiebedrijf',
  naamKort:    process.env.BEDRIJF_NAAM_KORT   ?? 'Mijn Bedrijf',
  kvk:         process.env.BEDRIJF_KVK         ?? '',
  btw:         process.env.BEDRIJF_BTW         ?? '',
  email:       process.env.BEDRIJF_EMAIL       ?? '',
  telefoon:    process.env.BEDRIJF_TELEFOON    ?? '',
  website:     process.env.BEDRIJF_WEBSITE     ?? '',
  logoUrl:     process.env.BEDRIJF_LOGO_URL    ?? '/logo.png',
  siteUrl:     process.env.SITE_URL            ?? 'http://localhost:3000',
  contactpersoon: process.env.BEDRIJF_CONTACT  ?? '',
  certs:       process.env.BEDRIJF_CERTS       ?? '',
  notifEmail:  process.env.NOTIF_EMAIL         ?? process.env.BEDRIJF_EMAIL ?? '',
}
```

2. **Update `lib/mail.ts`** — vervang alle 17 hardcoded Ozvolt-strings door `bedrijf.*` imports
3. **Update `lib/pdf-factuur.ts`** — vervang 4 hardcoded strings
4. **Update alle PDF-routes** — offertes, facturen, afspraken
5. **Fix `AfspraakForm.tsx:105`** — `value="ozvolt"` → `value="bedrijf"`
6. **Fix alle `verantwoordelijke === 'ozvolt'` checks** → `=== 'bedrijf'`
7. **Fix alle SITE_URL fallbacks** → `?? 'http://localhost:3000'`
8. **Fix AI-prompt in `mail/genereren`** — alles via `bedrijf.*`
9. **Update `.env.example`** met alle nieuwe variabelen

**Aangeraden volgorde:** config.ts eerst, dan mail.ts, dan PDF-generators, dan overige bestanden.

**Risico's:** Alleen in de nieuwe repository — Ozvolt CRM onaangeroerd
**Tijd:** 2–3 dagen parttime

**Controleer voordat je doorgaat:**
- ✅ `grep -r "Ozvolt" lib/ app/ | grep -v node_modules` → geeft nul resultaten
- ✅ Lokaal draaien met demo-env vars → naam "Demo Installaties BV" verschijnt overal
- ✅ PDF-generatie werkt met nieuwe namen

---

### Fase 4: Demo-data en demo-account aanmaken (Dag 4–5)

**Taken:**
1. Nieuwe Neon database aanmaken: `installateurflow-demo`
2. `schema.sql` uitvoeren op de nieuwe database
3. Demo-env vars instellen:
```env
BEDRIJF_NAAM=Demo Installaties BV
BEDRIJF_KVK=12345678
BEDRIJF_BTW=NL123456789B01
BEDRIJF_EMAIL=demo@installateurflow.nl
BEDRIJF_TELEFOON=06 00 00 00 00
BEDRIJF_WEBSITE=demo.installateurflow.nl
BEDRIJF_LOGO_URL=/logo-demo.png
SITE_URL=https://demo.installateurflow.nl
ADMIN_USER=demo
ADMIN_PASS_HASH=[bcrypt hash van demo-wachtwoord]
```
4. Demo-klanten aanmaken (3–5 nep-klanten)
5. Demo-offertes aanmaken (2–3, één geaccepteerd, één verlopen)
6. Demo-facturen aanmaken (één betaald, één openstaand)
7. Demo-opleveringsrapport met nep-foto's en nep-handtekening
8. Nieuw Vercel project aanmaken: `installateurflow-demo`
9. Koppelen aan `demo.installateurflow.nl`

**Risico's:** Geen invloed op Ozvolt
**Tijd:** 1–2 dagen

**Controleer voordat je doorgaat:**
- ✅ Demo-omgeving draait op demo.installateurflow.nl
- ✅ Alle 8 stappen van de workflow zijn zichtbaar in de demo
- ✅ Geen Ozvolt-teksten zichtbaar in de demo

---

### Fase 5: Eerste pilotklant instellen (Week 2)

**Per nieuwe klant (30–45 minuten werk):**
1. Nieuwe Neon database aanmaken: `[klantnaam]-crm`
2. `schema.sql` uitvoeren op nieuwe database
3. Nieuw Vercel project aanmaken: `[klantnaam]-crm`
4. `.env` invullen met klantgegevens (naam, KVK, BTW, e-mail, logo, SMTP)
5. Klantdomein koppelen: `crm.klantnaam.nl`
6. Deploy uitvoeren
7. Admin-wachtwoord instellen (bcrypt hash)
8. Onboarding-call plannen (2 uur)

**Risico's:** Elke klant is volledig geïsoleerd — geen invloed op Ozvolt of andere klanten
**Tijd per klant:** 30–45 minuten setup + 2 uur onboarding

**Controleer per klant:**
- ✅ Klant ziet eigen naam/logo overal
- ✅ Geen "Ozvolt" tekst zichtbaar
- ✅ Klant kan eerste offerte versturen
- ✅ Klantportaal werkt (magic link testen)

---

### Fase 6: Verbeteren richting white-label en SaaS (Maand 2–6)

**Prioriteitsvolgorde op basis van klantfeedback:**

| Prioriteit | Feature | Schatting |
|---|---|---|
| 1 | Multi-admingebruikers (monteurs kunnen inloggen) | 2–3 weken |
| 2 | Rollen/rechten (eigenaar vs monteur vs backoffice) | 2–3 weken |
| 3 | Productcatalogus per klant | 1–2 weken |
| 4 | Klant-selfservice instellingen (logo, kleuren, naam via UI) | 1–2 weken |
| 5 | Automatische onboarding (klant registreert zichzelf) | 2–3 weken |
| 6 | Eigen facturering via Stripe (SaaS-abonnementen) | 2–3 weken |
| 7 | Multi-tenancy database (één platform, meerdere tenants) | 4–6 weken |

---

## 16. Wat heb ik nog van jou nodig?

Om dit goed te bouwen en verkoopbaar te maken, heb ik antwoord nodig op:

### Branding / naam
- [ ] Heb je al een naam voor de verkoopbare versie? (Installateurflow, Klusflow, Vakportaal, enz.)
- [ ] Heb je al een domeinnaam geregistreerd of voorkeur?
- [ ] Heb je een logo (of idee) voor de nieuwe versie?
- [ ] Voorkeur voor kleurenschema (of mag het dezelfde navy/blauw stijl zijn)?

### Doelgroep
- [ ] Wil je eerst laadpaalinstallateurs, elektrotechnici, of beide tegelijk?
- [ ] Richt je je op regio (jouw regio eerst?) of heel Nederland?
- [ ] Ken je al installateurs die je kunt benaderen als eerste pilotklant?

### Prijzen
- [ ] Ben je akkoord met €0 setup + €49/maand voor de eerste 3 pilots?
- [ ] Wat is jouw minimale acceptabele maandprijs na pilotfase?
- [ ] Wil je een jaarkorting aanbieden of strikt maand-tot-maand?

### Functies
- [ ] Wil je de AI e-mailgenerator meenemen in de pilotversie? (vereist Anthropic API key)
- [ ] Wil je WhatsApp-integratie in de pilotversie? (vereist Meta WhatsApp Business API)
- [ ] Wil je Moneybird-integratie optioneel aanbieden aan klanten die het al gebruiken?

### Juridisch
- [ ] Heb je al algemene voorwaarden, verwerkersovereenkomst of privacyverklaring?
- [ ] Wil je dit zelf schrijven of een juridisch template gebruiken?

### Hosting
- [ ] Gebruik je al een Vercel-account? (Gratis tier werkt voor 3–5 projecten)
- [ ] Gebruik je al een Neon-account voor Ozvolt? (Dan kunnen extra databases daar bij)
- [ ] Voorkeur voor hosting: Vercel (aanbevolen, serverless) of iets anders?

### Demo-data
- [ ] Mag ik de demo-omgeving maken met een fictief bedrijf "Demo Installaties BV"?
- [ ] Wil je dat de demo specifiek voor laadpalen is, of generiek installaties?

### Planning
- [ ] Wanneer wil je de eerste demo kunnen geven? (binnen 1 week / 2 weken / 1 maand?)
- [ ] Hoeveel uren per week kun je parttime besteden aan dit project?

---

## 17. Eerlijk Eindadvies

### 1. Moeten we dit project proberen te verkopen?
**Ja.** De codebase is professioneel, de workflow is compleet, er is geen directe niche-concurrent in Nederland. Het risico is laag, het potentieel is hoog.

### 2. Aparte installatie of SaaS?
**Begin met aparte installatie.** In 2 weken kun je de eerste pilotklant draaien. SaaS vereist 3–6 maanden bouwen voordat je ook maar één euro verdient. Begin klein, leer snel.

### 3. Veiligste route zonder Ozvolt te verstoren?
**Aparte GitHub-repository + aparte Vercel-projecten + aparte Neon-databases.** Jouw Ozvolt CRM wordt nooit aangeraakt. Ze draaien 100% onafhankelijk van elkaar.

### 4. Beste eerste doelgroep?
**Laadpaalinstallateurs (2–10 man) + kleine elektrotechnische bedrijven.** Beide hebben dezelfde pijn, hetzelfde budget en het systeem is er exact voor gebouwd.

### 5. Beste naam/positionering?
**Installateurflow** als naam. Positionering: "Jouw hele werkproces digitaal — voor installatiebedrijven." Haak in marketing: "Offerte in 5 minuten, klant tekent op zijn telefoon."

### 6. Welke prijs voor eerste pilot?
**€0 setup + €49/maand de eerste 3 maanden**, in ruil voor eerlijke feedback en een testimonial. Daarna €499 setup + €119/maand.

### 7. Welke functies eerst bouwen?
Niets nieuws — het systeem heeft al alles voor de pilot. Alleen Ozvolt-branding generiek maken (3–5 dagen werk).

### 8. Welke marketing eerst?
1. LinkedIn koude DMs aan eigenaren installatiebedrijven
2. Google Maps → e-mail of WhatsApp outreach
3. Persoonlijk netwerk — ken je al installateurs?
4. Organische LinkedIn-content over offerte-pijn

### 9. Technische fouten vermijden
1. Verander nooit iets in de huidige `ozvolt-crm` repository voor dit project
2. Maak altijd een aparte Neon-database per klant — nooit gedeeld
3. Sla `.env.local` nooit op in Git
4. Test altijd op de demo-omgeving vóór productie
5. Mollie webhook pas activeren als je signature-verificatie hebt gebouwd

### 10. De 10 acties voor deze week

| # | Actie | Wanneer |
|---|---|---|
| 1 | Git tag aanmaken op huidige Ozvolt CRM | Vandaag |
| 2 | Nieuwe repository aanmaken: `installateurflow` op GitHub | Vandaag |
| 3 | Codebase kopiëren naar `/home/user/installateurflow` | Vandaag |
| 4 | `lib/config.ts` aanmaken met alle bedrijfsvariabelen | Dag 2 |
| 5 | `lib/mail.ts` en PDF-generators generiek maken | Dag 2–3 |
| 6 | Demo-database aanmaken + `schema.sql` uitvoeren | Dag 3 |
| 7 | Demo-omgeving deployen op Vercel | Dag 4 |
| 8 | Verwerkersovereenkomst + voorwaarden opstellen | Dag 4–5 |
| 9 | Lijst van 50 laadpaalinstallateurs in jouw regio maken | Dag 5 |
| 10 | Eerste 10 LinkedIn DMs sturen | Dag 5–7 |

---

## 18. Samenvatting voor ChatGPT

```
Ik heb een volledig CRM/portaal gebouwd voor mijn elektrotechnisch installatiebedrijf 
Ozvolt Elektrotechniek. Het systeem werkt actief en mag niet worden aangepast.

Ik wil een APARTE verkoopbare versie maken voor andere installatiebedrijven.

---

1. AANBEVOLEN VEILIGE ROUTE:
Aparte GitHub-repository (installateurflow), aparte Vercel-deployment, aparte Neon-database 
per klant. Ozvolt CRM blijft 100% onaangeroerd. Geen shared infrastructure.

2. APARTE MAP/PROJECT ADVIES:
Naam: installateurflow. Codebase kopiëren naar aparte repository. lib/config.ts aanmaken 
als centrale bedrijfsconfiguratie via env vars. Alle 45 Ozvolt-specifieke bestanden 
generiek maken.

3. DOMEIN/DEPLOYMENT ADVIES:
Demo: demo.installateurflow.nl. Per klant: crm.klantnaam.nl. Elk als apart Vercel-project 
met eigen database. Setup per klant: 30–45 minuten.

4. MULTI-TENANT STATUS:
Nul tenant-isolatie in de huidige code. 17 tabellen, geen enkele heeft tenant_id. 
Voor aparte installaties geen probleem. Voor SaaS moeten alle 17 tabellen worden uitgebreid.

5. OZVOLT-SPECIFIEKE ONDERDELEN:
45 bestanden met hardcoded Ozvolt-identiteit (naam, KVK, BTW, e-mail, logo, telefoon, 
website, AI-prompt met Ahmed Öz + NEN 1010/3140/VCA). Alle te vervangen door lib/config.ts 
centraal config-object. Kritieke businesslogica: `verantwoordelijke === 'ozvolt'` in 
werkafspraken moet worden vervangen.

6. HERBRUIKBARE FUNCTIES:
Volledige 8-stappen workflow werkend: leads, offertes, PDF, digitale ondertekening, 
werkafspraken, planning, taken/foto's, meerwerk, facturen, opleveringsrapporten, 
handtekeningen, klantportaal (magic link). Alle 100% herbruikbaar.

7. BOEKHOUDING/BETALING ADVIES:
Moneybird is al OPTIONEEL in de code (conditionele check op env vars). Systeem werkt 
volledig zonder Moneybird — eigen PDF + SMTP is standaard. Betaallink later toevoegen 
via Moneybird, Mollie of Stripe. Voor pilot: IBAN in factuur + handmatig "betaald" 
markeren volstaat.

8. MVP VOOR PILOT:
Absoluut nodig: leads, klanten, offertes (PDF + digitale ondertekening), facturen (PDF), 
klantportaal. Handig voor pilot: planning, opleveringsrapport, meerwerk. Later: multi-user, 
rollen, productcatalogus, boekhoudkoppeling, betaallinks.

9. KRITIEKE SECURITY TAKEN:
Aparte database per klant (Route A = automatisch geregeld), aparte Blob-opslag per klant, 
bcrypt wachtwoorden, verwerkersovereenkomst + privacyverklaring + algemene voorwaarden 
opstellen vóór eerste externe klant.

10. BESTE DOELGROEP:
Laadpaalinstallateurs + kleine elektrotechnische bedrijven (2–10 man). Zonnepanelen als 
tweede. Beide hebben dezelfde pijn, hetzelfde budget, nauwelijks niche-software.

11. BESTE POSITIONERING:
"Jouw hele werkproces digitaal — voor installatiebedrijven." Haak: "Offerte in 5 minuten, 
klant tekent op zijn telefoon, jij krijgt direct bevestiging."

12. BESTE VERKOOPMODEL:
Setup fee + maandabonnement via aparte installatie per klant. Done-for-you setup. 
Pilotklanten: €0 setup + €49/mnd. Regulier: €499 setup + €119/mnd.

13. PRIJSADVIES:
Pilot (1–3 klanten): €0 setup + €49/mnd. Na testimonials: €299–499 setup + €89–119/mnd. 
Professional pakket: €499 setup + €119/mnd. Growth (multi-user): €999 + €199/mnd. 
White-label: €2000+ + €349–599/mnd.

14. MARKETINGADVIES:
LinkedIn koude DMs (eigenaren installatiebedrijven, 20/dag), Google Maps outreach 
(e-mail + WhatsApp, 10/dag), persoonlijk netwerk. Haak: offerte-pijn. Lead magnet: 
gratis offerte-audit (30 min call). Doel week 1–2: 30 gesprekken, 5 demo's, 1–3 pilots.

15. ONTWIKKELINSCHATTING:
Pilotversie (branding generiek): 3–5 werkdagen. White-label versie (multi-user + config UI): 
+6–8 weken. SaaS-versie (multi-tenancy + onboarding + Stripe): +3–4 maanden.

16. OPEN VRAGEN:
Naam/branding keuze, doelgroepvoorkeur, regio, budget bevestiging, juridische documenten, 
Anthropic/WhatsApp API meenemen in pilot, Moneybird optie aanbieden, planning startdatum.

17. EINDOORDEEL:
Ja — dit is verkoopbaar, de technische basis is sterk, de blokkade is alleen de 
Ozvolt-branding (3–5 dagen work). Start met Route A (aparte installaties), verdien de 
eerste €500–800/mnd recurring, bouw daarna de SaaS-versie op basis van echte feedback. 
Eerste actie: git tag aanmaken + nieuwe repository initialiseren.
```

---

*Dit document is een analyse en plan op basis van volledige codebase-inspectie van het Ozvolt CRM.*  
*Geen codewijzigingen zijn uitgevoerd. Alle aanpassingen vinden plaats in een aparte repository.*  
*Gegenereerd: 26 juni 2026*
