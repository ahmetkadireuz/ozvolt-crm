# Marktstrategieanalyse — Ozvolt CRM voor de Installatietechniek

> Gebaseerd op volledige codebase-analyse — gegenereerd op 26 juni 2026  
> Codebase: Next.js 14 · PostgreSQL (Neon) · Vercel · 58+ API routes · 14 tabellen · 40+ pagina's

---

## 1. Korte Conclusie

### Is dit verkoopbaar?
**Deels — met gerichte aanpassingen: ja.**

De kern van het systeem is sterk en professioneel. Het lost echte problemen op voor installateurs. Maar er zijn twee kritieke blokkades voordat je het kunt verkopen: (1) alle Ozvolt-branding is hardcoded door de gehele codebase, en (2) er is geen multi-tenancy — elke nieuwe klant vereist nu een aparte deployment.

### Aan wie zou je dit als eerste verkopen?
**Kleine laadpaalinstallateurs (2–8 medewerkers)** en **zonnepaneelinstallateurs**. Zij groeien hard, staan onder druk van offerte-opvolging, hebben geen specifieke software en betalen graag voor iets dat direct werkt.

### Als wat zou je dit verkopen?
**Hybride model: Done-for-you setup fee + maandabonnement.** In de beginfase stel jij het systeem in voor elke klant (eigen branding, tarieven, producten). Later bouw je dit om naar een SaaS-platform. Begin laag, eindig hoog.

### Wat is de grootste kans?
Er bestaat **geen betaalbare, niche-specifieke CRM voor Nederlandse installateurs** die leads, offertes, klantportaal, planning, oplevering en betaling combineert. De meeste installateurs gebruiken Excel, losse apps of een generieke CRM die niet past.

### Wat is de grootste blokkade?
**Single-tenant architectuur + hardcoded Ozvolt-identiteit.** Op dit moment kost elke nieuwe klant een volledige aparte deployment. Dit schaalt niet. Dit is oplosbaar, maar vereist 3–6 weken technisch werk voordat je serieus kunt groeien.

---

## 2. Wat Is Dit Systeem Precies?

### Wat het doet
Ozvolt CRM is een **volledig bedrijfsbeheersysteem voor een installatiebedrijf**. Het dekt de volledige klantreis van eerste contact tot betaling.

### Workflows in het systeem

| Stap | Workflow | Status |
|------|----------|--------|
| 1 | Lead binnenkomt → klus aanmaken → bellen → status bijhouden | ✅ Volledig |
| 2 | Offerte opstellen → PDF genereren → per mail versturen → klant tekent digitaal | ✅ Volledig |
| 3 | Werkafspraak opstellen → klant bevestigt digitaal | ✅ Volledig |
| 4 | Planning in agenda → monteur op locatie → taken/foto's bijhouden | ✅ Volledig |
| 5 | Extra werk melden → klant accepteert via portaal | ✅ Volledig |
| 6 | Factuur aanmaken (of automatisch van offerte) → per mail → klant betaalt online | ✅ Volledig |
| 7 | Opleveringsrapport met foto's + handtekeningen (monteur + klant) | ✅ Volledig |
| 8 | Synchronisatie naar Moneybird boekhouding | ✅ Volledig |

### Welke gebruikers er mee werken
- **Admingebruiker (eigenaar/backoffice):** volledig beheer via CRM
- **Klant:** eigen portaal via magic link — offerte accepteren, factuur betalen, rapport bekijken

### Welke problemen het oplost
1. Offertes handmatig in Word/Excel maken → kost uren
2. Geen opvolging van leads → verloren omzet
3. Klanten bellen steeds voor status → tijdverspilling
4. Aparte factuurprogramma, agenda, notities → gefragmenteerd
5. Papieren handtekeningen op locatie → inefficiënt
6. Geen inzicht in openstaande bedragen en betalingsstatus

### Wat specifiek voor Ozvolt is
- Bedrijfsnaam, KVK (99837366), BTW (NL005413208B33) hardcoded in PDF-templates
- E-mailhandtekening: "Ahmed Öz / Ozvolt Elektrotechniek"
- Logo-URL: `https://portaal.ozvoltelektro.nl/logo-wit.png`
- Moneybird account ID voor hun administratie
- SMTP-afzender: `financien@ozvoltelektro.nl`
- NEN 1010 / NEN 3140 / VCA-certificeringen in AI-prompt
- Contactgegevens in alle PDF-footers

### Wat generiek bruikbaar is voor andere installatiebedrijven
Vrijwel **alles behalve de branding**. De gehele businesslogica — leads, offertes, facturen, planning, portaal, oplevering, WhatsApp, AI-mail, Moneybird, Mollie — werkt voor **elk** installatiebedrijf. De structuur is zelfs bewust professioneel gebouwd (geparametriseerde queries, JWT, goede indextabel, nette API-structuur).

---

## 3. Functionaliteiten Die Verkoopwaarde Hebben

| Functionaliteit | Gevonden in code | Voor wie waardevol? | Probleem dat het oplost | Verkoopwaarde | Opmerking |
|---|---|---|---|---|---|
| Lead/klus registratie met belstatus | `klussen` tabel, dashboard | Elke installateur | Leads vergeten op te volgen | **Hoog** | `gebeld_status` veld is echt slim |
| Offerte-PDF generatie | `/api/offertes/[id]/pdf`, PDFKit | Alle installateurs | Uren kwijt aan Word-offertes | **Hoog** | Professioneel design, inclusief regels, BTW, korting |
| Digitale offerte-ondertekening | `/(publiek)/offerte/[token]` | Alle installateurs | Klant moet fysiek tekenen of per mail reageren | **Hoog** | Token-gebaseerd, IP-logging, naam + e-mail capturing |
| Klantportaal (magic link) | `/klant/*` routes | Klanten van installateurs | Klanten bellen voor status → tijdverspilling | **Hoog** | Geen wachtwoord nodig — erg laagdrempelig |
| Factuurautomatisering | `offertes → facturen` conversie | Elke ZZP'er / bedrijf | Aparte factuursoftware nodig | **Hoog** | Direct van offerte naar factuur, Moneybird sync |
| Online betaling via Moneybird/Mollie | `betaal_url`, webhook `/api/moneybird/webhook` | Elke installateur | Klant betaalt traag of vergeet | **Hoog** | Betaallink in mail/portaal, 50/50 splits mogelijk |
| 50/50 betaalplan | `betaling_50_50`, twee betaal-URLs | Alle installateurs | Klanten willen gespreide betaling | **Middel** | Unieke feature — zelfs grote CRMs hebben dit niet standaard |
| Werkafspraken (digitaal bevestigd) | `werkafspraken` tabel, `/afspraken/*` | Grotere installateurs | Aansprakelijkheid, geen schriftelijke bevestiging | **Hoog** | Klant ondertekent digitaal — juridisch sterk |
| Opleveringsrapport met foto's + handtekening | `opleveringsrapporten`, `SignatureCanvas.tsx` | Alle installateurs | Oplevering zonder bewijs → problemen later | **Hoog** | Monteur + klant tekenen op device, foto's inbegrepen |
| Extra meerwerk acceptatie via portaal | `project_meerwerk`, `/api/klant/meerwerk/accepteren` | Installateurs met monteurs | Mondelinge afspraken over meerwerk → factuurgeschil | **Hoog** | Klant accepteert digitaal, volledig traceerbaar |
| AI e-mailgenerator (Claude Haiku) | `/mail`, `/api/mail/genereren`, Anthropic SDK | ZZP'ers | E-mails schrijven kost tijd | **Middel** | Goede differentiator — anderen hebben dit niet |
| WhatsApp-integratie (Meta API) | `/whatsapp`, `/api/whatsapp/sturen` | Alle installateurs | Klantcommunicatie verloopt via WhatsApp | **Hoog** | Direct vanuit CRM WhatsApp sturen |
| Urenschrijven per project | `project_uren`, uurloon veld | Installateurs met personeel | Geen inzicht in winstgevendheid per klus | **Hoog** | €65/uur default, configureerbaar per klus |
| Taakenlijst met foto-bewijs | `project_taken`, `fotos` JSONB | Installateurs met monteurs | Monteurs weten niet wat ze moeten doen | **Middel** | Inclusief voortgangspercentage |
| Inkooplijsten | `inkoop_lijsten`, `inkoop_items` | Installateurs met magazijn | Materiaalinkoop per project bijhouden | **Middel** | Gekoppeld per klus, leverancier en prijs |
| Notificatiesysteem (cron) | `/api/cron`, `admin_notifications` | Alle gebruikers | Vergeten facturen, verlopen offertes | **Hoog** | Dagelijkse check: te laat, stilstand, verlopen, morgen |
| Dashboard met omzetcijfers | `/` (admin dashboard) | Eigenaar / directeur | Geen realtime financieel overzicht | **Hoog** | Omzet maand, trend, openstaand, achterstallig |
| Klanttypes (particulier / zakelijk) | `klanten.type` veld | B2B en B2C installateurs | Geen onderscheid in BTW/communicatie | **Middel** | Basis aanwezig, uitbreidbaar |
| Bijlagen aan offertes | `bijlagen` JSONB, Vercel Blob | Alle installateurs | Tekeningen, meetrapporten meesturen bij offerte | **Middel** | Upload naar cloud, link in PDF |
| Groepverklaringen / certificaten | `groenverklaringen` | Elektrotechniek specifiek | Klanten vragen om veiligheidsdocumenten | **Laag** | Erg specifiek voor elektro, minder voor andere sectoren |
| Moneybird boekhoudingssync | `lib/moneybird.ts`, webhooks | Bedrijven met boekhouder | Dubbel invoeren in CRM en boekhoudpakket | **Hoog** | Volledige sync — nagenoeg geen dubbel werk |
| Agenda / planning | `agenda_items`, `/agenda` | Alle installateurs | Geen overzicht van afspraken en monteurs | **Middel** | Basis aanwezig — geen multi-monteur view |
| Kosten/uitgaven registratie | `kosten` tabel | ZZP'ers | Kosten per klus bijhouden voor winstberekening | **Middel** | Koppelbaar aan klus, leverancier, categorie |

---

## 4. Is Het Geschikt voor ZZP'ers en Installatiebedrijven?

### Beoordeling per doelgroep

| Doelgroep | Belangrijkste probleem | Past dit CRM daarbij? | Betalingsbereidheid | Hoe makkelijk te bereiken? | Concurrentie | Score 1–10 | Advies |
|---|---|---|---|---|---|---|---|
| **ZZP-elektriciens** | Offertes in Word, facturen vergeten, geen opvolging | Ja — maar te uitgebreid voor 1 man | Laag (€20–50/mnd max) | Moeilijk (verspreid, druk) | Snelstart, ZZP-tools, Teamleader | 5/10 | Later instappen — wacht op SaaS versie |
| **Kleine elektrotechnische bedrijven (2–10 man)** | Offerte → factuur workflow, monteurs aansturen, meerwerk bijhouden | **Uitstekend** — systeem is hier exact voor gebouwd | Hoog (€100–250/mnd) | Middel (via LinkedIn, vakbladen) | Weinig niche-specifiek | **9/10** | **Primaire doelgroep** |
| **Laadpaalinstallateurs** | Snel offertes, subsidiedocumentatie, klantportaal | Ja — offerte, portaal en oplevering zijn perfect | Hoog (groeiende markt, goede marges) | Goed (brancheverenigingen, LinkedIn) | Nagenoeg geen niche CRM | **9/10** | **Primaire doelgroep — start hier** |
| **Zonnepaneelinstallateurs** | Offerte met meerdere opties, subsidies, oplevering met keuringsrapport | Ja — goed geschikt | Hoog (groeiende markt) | Goed (social media, SEO, vakbeurzen) | Enkele niche-tools (SolarCRM, Huspot) | **8/10** | **Sterke tweede doelgroep** |
| **Airco-installateurs** | Offerte, planning, onderhoudscontract | Gedeeltelijk — onderhoudsabonnementen ontbreken | Middel | Middel | Meer generieke CRMs actief | 6/10 | Pas later — voeg onderhoudsfunctie toe |
| **Loodgieters** | Spoedklussen, onderhoudsabonnementen, materiaallijsten | Gedeeltelijk — ontbreekt urgentie/planning | Laag tot middel | Moeilijk (veel ZZP'ers) | Meer generieke tools | 5/10 | Niet nu — te ver van kernfocus |
| **Aannemers / bouwbedrijven** | Projectbeheer, onderaannemers, BIM | Beperkt — te licht voor complexe projecten | Hoog | Middel | Procore, PlanningPME, Exact | 4/10 | Niet nu — andere markt |
| **Onderhoudsbedrijven** | Terugkerende contracten, SLA's, preventieve planning | Beperkt — ontbreekt abonnementsbeheer | Hoog | Middel | FMIS-systemen, Field Service tools | 4/10 | Niet nu — vereist grote uitbreiding |

### Aanbeveling: Start met deze 3 doelgroepen

1. **Laadpaalinstallateurs (2–15 man)** — groeiend, hoge marges, digitaal vaardig, nauwelijks niche-software
2. **Kleine elektrotechnische bedrijven (2–10 man)** — het systeem is letterlijk voor hen gebouwd
3. **Zonnepaneelinstallateurs (2–20 man)** — zelfde pijnpunten als elektro, grote markt

---

## 5. Beste Positionering

### Vijf mogelijke positioneringen

#### Positionering A: "CRM voor laadpaalinstallateurs"
- **Doelgroep:** Bedrijven die laadpalen installeren (thuis en zakelijk)
- **Belofte:** Van lead tot ondertekende oplevering — in één systeem
- **Kernfuncties:** Offerte, digitale ondertekening, klantportaal, opleveringsrapport, online betaling
- **Waarom het verkoopt:** Groeimarkt, veel nieuwe spelers zonder systeem, hoge orderwaarden (€1.000–€5.000/klus)
- **Risico:** Markt consolideert — grote spelers gaan eigen software bouwen
- **Score:** 8/10

#### Positionering B: "Offerte- en planningssysteem voor elektriciens"
- **Doelgroep:** Elektrotechnische bedrijven met 2–10 medewerkers
- **Belofte:** Stop met Word-offertes. Stuur in 5 minuten een professionele offerte die de klant digitaal tekent.
- **Kernfuncties:** Offertebouwer, PDF, digitale handtekening, factuurconversie
- **Waarom het verkoopt:** Directe pijnpunt (iedereen maakt offertes), eenvoudige hook
- **Risico:** Smal — klanten willen ook planning en facturen
- **Score:** 7/10

#### Positionering C: "Klantportaal voor installatiebedrijven"
- **Doelgroep:** Installatiebedrijven die veel B2C-werk doen
- **Belofte:** Geef je klant een eigen portal — zonder extra telefoontjes
- **Kernfuncties:** Magic link portaal, offerte/factuur bekijken, online betalen, rapport downloaden
- **Waarom het verkoopt:** Klantgerichtheid als verkoopargument richting eindklant
- **Risico:** Moeilijk te begrijpen voor kleine ZZP'er
- **Score:** 6/10

#### Positionering D: "Lead-to-installation systeem voor technische bedrijven"
- **Doelgroep:** Groeiende installatiebedrijven (5–20 man)
- **Belofte:** Van eerste contact tot getekende oplevering — geautomatiseerd
- **Kernfuncties:** Leadregistratie, offerte, werkafspraak, planning, meerwerk, oplevering, factuur
- **Waarom het verkoopt:** Complete belofte — één systeem, alles geïntegreerd
- **Risico:** Te complex als instapverhaal voor kleine bedrijven
- **Score:** 7/10

#### Positionering E: "Alles-in-één groeisysteem voor installateurs"
- **Doelgroep:** Installatiebedrijven die willen professionaliseren
- **Belofte:** Bespaar 5 uur per week op administratie. Groei zonder chaos.
- **Kernfuncties:** Alles van het systeem
- **Waarom het verkoopt:** Duidelijke ROI-belofte (tijd = geld)
- **Risico:** Te breed — "alles voor iedereen" overtuigt niemand
- **Score:** 5/10

### Beste positionering: **A + B gecombineerd**

**"Het offerte- en klantbeheersysteem speciaal voor installatietechnici"**

Begin met de **offerte-hook** (pijnpunt #1 voor elke installateur) en bouw het verhaal op naar het volledige systeem. Target **laadpaalinstallateurs en elektrotechnische bedrijven** als eerste niche.

Reden: De offerte-pijn is universeel, direct en makkelijk te communiceren. Als ze eenmaal offertes maken in het systeem, wordt de rest vanzelf aantrekkelijk.

---

## 6. Hoe Kunnen We Dit Het Beste Verkopen?

### Vergelijking verkoopmodellen

| Model | Hoe werkt het? | Voordelen | Nadelen | Benodigde techniek | Snelheid om te starten | Winstpotentie | Beste keuze? |
|---|---|---|---|---|---|---|---|
| **A. SaaS-abonnement** | Klanten inloggen op gedeeld platform, elke klant eigen omgeving | Schaalbaar, passief inkomen, lage support per klant | Vereist multi-tenancy (nog niet gebouwd), hoge initiële investering | Multi-tenant database, onboarding, facturatie platform | Langzaam (3–6 mnd) | Zeer hoog | Einddoel — niet nu |
| **B. Done-for-you implementatie** | Jij zet systeem op voor klant (eigen branding, hosting, data), klant betaalt setup + maand | Snel geld, leer wat klanten willen, geen multi-tenancy nodig | Niet schaalbaar, tijdintensief, elke klant = aparte deployment | Eigen env vars, eigen Vercel project, eigen database | Snel (1–2 weken) | Middel | **Nu starten** |
| **C. White-label systeem** | Klant krijgt systeem onder eigen naam, jij beheert hosting | Professioneel, recurring fee | Meer setup per klant, support intensief | Branding instelbaar via config, eigen domeinen | Middel | Hoog | Fase 2 |
| **D. Template/licentie** | Klant koopt code en host zelf | Eenmalig inkomen, weinig support | Geen recurring, klant moet technisch zijn | Documentatie, setup-gids | Direct | Laag | Niet aanbevolen |
| **E. Maatwerk voor installatiebedrijven** | Jij bouwt op maat voor elk bedrijf | Hoge marge per project | Niet schaalbaar, hoge tijdsinvestering | Nee | Direct | Middel | Alleen voor 1e pilot |
| **F. Hybride: setup fee + maandabonnement** | Klant betaalt €500–1.500 setup, dan €99–199/mnd | Directe inkomsten + recurring, lage drempel | Iets meer configuratiewerk | Branding parametriseerbaar | Snel | Hoog | **Beste keuze nu** |

### Advies voor jouw situatie

Gegeven: ~€1.000 budget, parttime, beperkte ervaring, laag risico, internationaal potentieel.

**Fase 1 (nu, maand 1–3):** Done-for-you + hybride pricing
- Zet het systeem op voor elke klant als aparte Vercel + Neon instantie
- Branding aanpassen (naam, logo, kleuren, KVK, BTW, mail) per klant via env vars + kleine code-aanpassing
- Setup fee: €500–800 per klant, maandabonnement: €89–149
- Doel: 3–5 pilotklanten, feedback verzamelen, €1.500–3.000 recurring bereiken

**Fase 2 (maand 3–6):** White-label ready
- Maak branding volledig configureerbaar via omgevingsvariabelen en database
- Bouw simpele onboarding (klant vult bedrijfsgegevens in → systeem configureert zichzelf)
- Begin SaaS-platform te bouwen op basis van geleerde feedback

**Fase 3 (maand 6–12):** Multi-tenant SaaS
- Één platform, meerdere tenants
- Geautomatiseerde onboarding en betaling
- Internationalisering (NL → BE → DE)

---

## 7. Prijsstrategie

### Pakketten

#### Starter — Voor ZZP'ers en kleine installateurs (1–2 personen)
- **Setup fee:** €299
- **Maandprijs:** €49/maand
- **Inbegrepen functies:**
  - Klantenbeheer (onbeperkt)
  - Offertes + PDF-generatie
  - Facturen + PDF
  - Digitale ondertekening (offerte)
  - Klantportaal (magic link)
  - Online betaling via Moneybird
  - E-mailnotificaties
  - 1 admin gebruiker
- **Ideale klant:** ZZP-elektricien die Excel wil vervangen
- **Argument:** "Voor €49/maand bespaar je minstens 3 uur per week aan administratie. Dat is €150+ aan uren."
- **Minimale versie:** Offerte + factuur + klantportaal

#### Professional — Voor groeiende installatiebedrijven (2–8 personen)
- **Setup fee:** €699
- **Maandprijs:** €119/maand
- **Inbegrepen functies:**
  - Alles van Starter
  - Planning/agenda
  - Werkafspraken (digitaal bevestigd)
  - Opleveringsrapporten met foto's en handtekeningen
  - Extra meerwerk via portaal
  - Inkooplijsten
  - Urenschrijven per project
  - WhatsApp-integratie
  - AI e-mailgenerator
  - Notificatiesysteem (cron)
  - Moneybird boekhoudingssync
- **Ideale klant:** Elektrotechnisch bedrijf of laadpaalinstallateur met 3–8 medewerkers
- **Argument:** "Jouw klanten tekenen digitaal, jij krijgt direct betaald en je boekhouder hoeft niets handmatig in te voeren."
- **Minimale versie:** + planning + oplevering + Moneybird

#### Growth — Voor bedrijven met meerdere monteurs of diensten
- **Setup fee:** €1.199
- **Maandprijs:** €229/maand
- **Inbegrepen functies:**
  - Alles van Professional
  - Meerdere admingebruikers (rollen/rechten — nog te bouwen)
  - Multi-dienst ondersteuning (laadpaal + zonnepanelen + airco)
  - Rapportages & dashboards
  - Prioriteitssupport (reactie binnen 24 uur)
  - Kwartaalgesprek (30 min strategie-call)
- **Ideale klant:** Installatiebureau met 8–20 medewerkers
- **Argument:** "Jouw monteurs registreren werk, jou klanten betalen sneller, jij ziet dagelijks je omzetcijfers."
- **Minimale versie:** + multi-user + rapportages

#### White-label / Enterprise — Voor partners en grotere partijen
- **Setup fee:** €2.500+
- **Maandprijs:** €399–799/maand (afhankelijk van volume en support)
- **Inbegrepen functies:**
  - Alles van Growth
  - Eigen domeinnaam + branding
  - Dedicated database en hosting
  - SLA (99,9% uptime garantie)
  - API-toegang
  - Onboarding-training (2 uur)
  - Maandelijkse rapportage-call
- **Ideale klant:** Installatiebedrijf met 20+ medewerkers, franchiseketen, of branchevereniging die dit wil aanbieden aan leden
- **Argument:** "Jouw volledige bedrijfssysteem, onder jouw naam, beheerd door ons."

### Prijsadvies per fase

| Fase | Situatie | Setup fee | Maandprijs | Reden |
|---|---|---|---|---|
| Eerste 3 klanten | Nog geen bewijs | €0–199 | €49–89 | Bewijs opbouwen, feedback verzamelen |
| Na 3 klanten + testimonials | Eerste cases beschikbaar | €299–499 | €89–119 | Waarde bewezen, iets steviger |
| Na 10 klanten | Product gevalideerd | €499–799 | €119–199 | Normaal tarief |
| SaaS-ready | Geautomatiseerde onboarding | €199–499 | €79–249 | Lagere setup, hogere marge |

---

## 8. Marketingstrategie

### Doelgroep — Wie benaderen we eerst?

**Primair:** Laadpaalinstallateurs en elektrotechnische bedrijven met 2–10 medewerkers in Nederland, omzet €200K–1,5M, eigenaar doet zelf de offertes, gebruikt Excel of Word, heeft geen CRM of een generieke tool die niet past.

**Profiel van de ideale eerste klant:**
- 3–8 medewerkers
- Doet B2C installaties (bij particulieren thuis)
- Maakt maandelijks 10–30 offertes
- Vraagt zich af waarom klanten niet terugkoppelen op offertes
- Heeft geen dedicated backoffice-medewerker

### Aanbod — Wat bieden we precies aan?

**Hook-aanbod (introstap):** "Gratis demo van 20 minuten: zie hoe jouw offerte er over 10 minuten professioneel uitziet en hoe klanten hem direct online tekenen."

**Pilot-aanbod:** "We zetten jouw systeem binnen 7 werkdagen live — inclusief jouw logo, kleuren en bedrijfsgegevens — voor een eenmalige fee van €299 en €89/maand."

### Hook — Welke pijn gebruiken we in de marketing?

**Primaire pijn:** "Je stuurt een offerte en hoort weken niks." → Digitale ondertekening + automatische herinnering

**Secundaire pijnen:**
- "Mijn facturen worden te laat betaald" → Online betaallink in klantportaal
- "Klanten bellen steeds voor een update" → Klantportaal met live status
- "Meerwerk mondeling afgesproken — klant betaalt niet" → Digitale meerwerk-acceptatie
- "Ik heb geen idee hoeveel ik deze maand verdiend heb" → Dashboard

### Kanalen

| Kanaal | Doel | Frequentie | Budget |
|---|---|---|---|
| LinkedIn (organisch) | Bewustwording + autoriteit | 4x/week | €0 |
| LinkedIn DM (koude outreach) | Directe afspraken | Dagelijks 20 DMs | €0 |
| Instagram | Bewustwording via vakinhoud | 3x/week | €0 |
| Google Maps outreach | Koude e-mail/bel naar installateurs | 10/dag | €0 |
| WhatsApp koude outreach | Directe respons | 5/dag | €0 |
| E-mail koude outreach | Opvolgflow | 3x/week | €0 |
| Vakbeurzen / netwerkbijeenkomsten | Demos geven | 1x/maand | Reiskosten |
| LinkedIn advertenties | Leads genereren (fase 2) | Continu | €200–500/mnd |
| Google Ads (fase 2) | Zoekintentie | Continu | €200–500/mnd |

### Contentideeën (minimaal 20)

1. "Hoeveel omzet verlies jij omdat klanten niet reageren op je offerte?" → directe vraag
2. Timelapse: "Zo ziet een offerte eruit die klanten wél direct tekenen"
3. "5 dingen die elke elektricien in zijn offerte moet zetten (maar vergeet)"
4. Screen recording: van lead tot ondertekende offerte in 8 minuten
5. "Waarom ik stopte met Excel-offertes" (personal story)
6. Klantcase: "Hoe [bedrijfsnaam] 3 uur per week bespaart op administratie"
7. "De echte kosten van een te laat betaalde factuur (rekensommetje)"
8. Poll: "Hoelang duurt het gemiddeld voordat jouw klant een offerte tekent?"
9. "Zo stuur jij je klant een betaallink — direct vanuit je CRM"
10. "Meerwerk mondeling afgesproken? Zo bescherm je jezelf"
11. Behind the scenes: "Dit is ons systeem voor offertes bij laadpaalinstallaties"
12. "3 signalen dat jouw offerteproces kapot is"
13. Tutorial: "Hoe je een opleveringsrapport maakt met foto's en handtekeningen op je telefoon"
14. "Welke software gebruik jij voor offertes?" (engagement post)
15. "Onze klant stuurt nu 40% meer offertes per maand — met dezelfde tijdsinvestering"
16. Vergelijking: "Word-offerte vs. digitale offerte — het verschil in betaalsnelheid"
17. "Zo ziet jouw klant zijn eigen portaal" (schermopname klantportaal)
18. "5 vragen die elke laadpaalinstallateur zichzelf moet stellen over zijn administratie"
19. "Hoe ik in één dag mijn eerste klant live had met hun eigen CRM"
20. Testimonial-video: "Dit is wat het ons opleverde na 3 maanden"
21. "Waarom installateurs WhatsApp gebruiken voor klantcontact (en hoe je dat professioneel aanpakt)"
22. "De roi van een klantportaal: minder telefoontjes, sneller betaald"
23. Q&A: "Jullie vragen over CRM voor installateurs — ik beantwoord ze"
24. "Hoe weet jij hoeveel je deze maand hebt verdiend? (eerlijk antwoord)"

### Outreach

#### 5 Koude e-mails

---

**E-mail 1 — Offerte-pijn**

Onderwerp: Hoe lang duurt het bij jou voordat een klant een offerte tekent?

Hoi [naam],

Ik zie dat jullie laadpalen installeren in [regio]. Goed werk.

Ik heb één vraag: hoelang duurt het gemiddeld voordat een klant reageert op een offerte?

Voor de meeste installateurs is dat 3 tot 10 dagen. En in die tijd bel je meerdere keren na, weet je niet of ze nog geïnteresseerd zijn, en raak je misschien de klus kwijt.

Ik heb een systeem gebouwd waarmee de klant de offerte direct online tekent — op zijn telefoon, geen account nodig. Je ontvangt een bevestiging inclusief naam, e-mail en tijdstip.

Mag ik je dat even laten zien? 20 minuten via Teams, volledig vrijblijvend.

Met vriendelijke groet,
[jouw naam]
[telefoonnummer]

P.S. Als het niks voor jou is, hoor ik dat ook graag — dan weet ik dat ik in de verkeerde richting zoek.

---

**E-mail 2 — Facturering-pijn**

Onderwerp: Hoe lang staan jullie facturen gemiddeld open?

Hoi [naam],

Korte vraag: wanneer een installatieklus klaar is, hoe lang duurt het dan voordat de factuur betaald is?

Gemiddeld in de bouwsector is dat 30–45 dagen. Voor ZZP'ers en kleine bedrijven betekent dat cashflowproblemen.

Wij hebben een aanpak waarbij de klant al vóór oplevering de eerste 50% betaalt — via een betaallink die ze direct in hun eigen portaal zien. De tweede 50% zodra ze het opleveringsrapport ondertekenen.

Resultaat: klanten betalen sneller, jij hebt minder gedoe met aanmaningen.

Interesse in een korte demo? Dan laat ik je precies zien hoe het werkt voor installatiebedrijven.

[jouw naam]

---

**E-mail 3 — Meerwerk-pijn**

Onderwerp: Wat doe jij als er meerwerk bijkomt en de klant later zegt "dat was niet afgesproken"?

Hoi [naam],

Herken je dit: je bent op locatie, er komt iets bij, je bespreekt het mondeling met de klant, en bij de eindafrekening is er discussie over wie wat heeft afgesproken?

Dat kost niet alleen geld — het kost ook klantvertrouwen.

Wij hebben een functie gebouwd waarbij de monteur meerwerk invoert in het systeem, de klant een notificatie krijgt in zijn eigen portaal, en digitaal akkoord geeft. Alles vastgelegd, inclusief tijdstip en naam.

Kan ik je dat laten zien? 15 minuten. Geen verkooppraatje.

[jouw naam]

---

**E-mail 4 — Tijdsbesparing**

Onderwerp: Hoeveel uur per week besteed jij aan offertes, facturen en klantcontact?

Hoi [naam],

Ik stel me voor dat het antwoord "te veel" is.

Voor de meeste installateurs is dat 5 tot 10 uur per week — offertes in Word, facturen versturen, klanten nabellen voor betaling, status doorgeven aan wie belt.

Wij helpen installatiebedrijven in de energie- en elektrotechniek om dat terug te brengen naar 1 tot 2 uur. Met een systeem dat speciaal voor jullie sector is gebouwd.

Ik laat je graag in 20 minuten zien wat dat voor jullie bedrijf zou betekenen.

[jouw naam]

---

**E-mail 5 — Sociaal bewijs + nieuwsgierigheid**

Onderwerp: [naam installatiebedrijf] — kort bericht

Hoi [naam],

Ik heb onlangs een systeem gebouwd dat drie elektrotechnische bedrijven in [regio/sector] gebruiken voor hun offertes, plannen, klantportaal en facturering.

Het bijzondere: klanten tekenen de offerte online, betalen via een link in hun eigen portaal, en het gaat automatisch naar de boekhouding.

Ik vroeg me af of dat ook interessant is voor jullie. Maar ik weet niet of jullie al iets soortgelijks gebruiken.

Als jullie openstaan voor een korte blik — puur om te zien of het relevant is — dan plan ik graag een halve demo in.

[jouw naam]

---

#### 5 WhatsApp/DM berichten

**DM 1 — Kort en direct**
"Hoi [naam], ik zie dat jullie laadpalen installeren. Ik bouw CRM-systemen speciaal voor installateurs — offertes, klantportaal, oplevering. Mag ik je dat even laten zien? 20 min, online."

**DM 2 — Vraag-aanpak**
"Hey [naam], hoe doen jullie offertes op dit moment? Nog via Word/Excel of al met een systeem? Ik ben nieuwsgierig want ik heb iets gebouwd voor installatiebedrijven."

**DM 3 — Pain-first**
"Hoi [naam], krijg je weleens klanten die niet reageren op een offerte? Ik heb een manier om dat op te lossen — klant tekent direct op zijn telefoon. Mag ik het je laten zien?"

**DM 4 — Sociaal bewijs**
"Hey [naam], ik help installatiebedrijven met hun offerte- en klantbeheersysteem. Heb zojuist iets opgezet voor een laadpaalinstallateur in [regio] en ze besparen nu 4 uur per week. Is dat iets voor jullie om even naar te kijken?"

**DM 5 — Nieuwsgierigheid**
"Hoi [naam], ik bouw een niche-CRM voor installatietechnici (elektro, laadpaal, zonnepanelen). Ben op zoek naar 3 pilotbedrijven die dit gratis willen testen in ruil voor feedback. Interesse?"

---

#### 1 Belscript

**Opening:**
"Goedemiddag, u spreekt met [naam]. Ik bel u omdat ik CRM-software heb ontwikkeld speciaal voor installatiebedrijven zoals [bedrijfsnaam]. Ik wil graag direct zijn: ik bel niet om iets te verkopen, maar om u een vraag te stellen. Heeft u 2 minuten?"

**Vraag:**
"Hoe regelt u op dit moment uw offertes en klantopvolging? Gebruikt u daarvoor software of meer iets zoals Excel of Word?"

**Luisteren → Bridge naar pijn:**
*Als Excel/Word:* "Dat herken ik van veel bedrijven in uw sector. Het kost alleen veel tijd en klanten reageren vaak laat of helemaal niet op een offerte. Herkent u dat?"

**Pitch (30 seconden):**
"Wij hebben een systeem gebouwd waarbij u in 5 minuten een professionele offerte maakt, de klant hem direct op zijn telefoon ontvangt en online tekent — zonder account. U krijgt meteen een bevestiging. De factuur gaat automatisch naar uw boekhouding. Alles in één systeem, speciaal voor installatiebedrijven."

**CTA:**
"Mag ik u vrijblijvend een demo laten zien? 20 minuten online, ik laat u precies zien hoe het werkt voor uw type bedrijf. Wanneer schikt dat?"

---

#### 1 Follow-up script

*(Na e-mail/DM zonder reactie — stuur na 4 dagen)*

"Hoi [naam], ik stuurde je vorige week een berichtje over het CRM-systeem voor installatiebedrijven. Ik snap dat het druk is. Ik wil het er toch even uittillen — niet om te pushen, maar omdat ik denk dat het echt relevant is voor jullie type werk. Als het niks voor jullie is, zeg dat gerust. Dan stop ik met sturen. Maar als je nieuwsgierig bent: ik heb een demo klaarstaan van 20 minuten. Wanneer zou dat passen?"

---

#### 1 Demo-script

**Introductie (2 min):**
"Bedankt dat je er bent. Ik ga je laten zien hoe het systeem werkt voor een installatiebedrijf zoals het jouwe. Ik doe dit als een realistische workflow: we nemen een echte klussituatie en lopen die stap voor stap door."

**Demo-flow (15 min):**
1. Nieuwe klant aanmaken → 1 minuut
2. Klus aanmaken (type werk, product, status) → 1 minuut
3. Offerte opmaken (regels, BTW, korting, geldigheid) → 3 minuten
4. PDF bekijken → 1 minuut
5. Offerte mailen → klantportaal tonen (magic link) → klant tekent digitaal → 3 minuten
6. Klantportaal bekijken als klant → 2 minuten
7. Factuur aanmaken van offerte → betaallink → 2 minuten
8. Dashboard tonen (omzet, openstaand) → 1 minuut

**Afsluiting (3 min):**
"Dit is het systeem. Ik kan dit voor jou in 7 werkdagen live zetten met jouw logo, kleuren en bedrijfsgegevens. De vraag die ik wil stellen: ziet u hier waarde in voor uw bedrijf?"

---

### Lead magnets — 5 gratis weggevers

1. **"De 5 redenen waarom installateurs offertes verliezen (en hoe je ze terugwint)"** — PDF checklist
2. **"Gratis offerte-audit: wij bekijken jouw huidige offerteproces en geven 3 concrete verbeterpunten"** — persoonlijke call van 30 minuten
3. **"Offertetemplate voor installatiebedrijven"** — Downloadbare Word/PDF sjabloon inclusief standaard BTW-regels
4. **"De CRM-scan voor installateurs: gebruik je 1 systeem of 5?"** — Korte quiz + resultaat met advies
5. **"Hoe sneller je facturen betaald krijgt: 7 concrete stappen voor installatiebedrijven"** — E-mailreeks van 7 dagen

---

## 9. Wat Ontbreekt Nog?

### Must-have voordat we verkopen

| Item | Waarom kritiek | Geschatte werktijd |
|---|---|---|
| **Branding volledig parametriseerbaar via env vars** | Elke klant heeft eigen naam, logo, KVK, BTW, e-mail, kleuren — nu hardcoded | 2–4 dagen |
| **Multi-tenant deployment workflow** | Elke nieuwe klant vereist nu handmatige deployment + database | 1–2 weken (of accepteer losse deployments tijdelijk) |
| **GDPR/AVG-documenten** | Verwerkersovereenkomst, privacyverklaring, algemene voorwaarden | 1–2 dagen (juridisch) |
| **Onboarding instructies voor nieuwe klanten** | Klant moet weten hoe hij het systeem instelt | 1 dag |
| **Basale support-workflow** | Als systeem omvalt of klant heeft vraag — hoe contact? | 0,5 dag |
| **Backup-strategie** | Neon heeft automatisch backups, maar policy moet gedocumenteerd zijn | 0,5 dag |

### Nice-to-have (helpt maar hoeft nog niet)

| Item | Reden | Prioriteit |
|---|---|---|
| Meerdere admingebruikers (monteurs kunnen inloggen) | Nodig voor bedrijven met personeel | Middel |
| Rollen/rechten (monteur ziet alleen eigen klussen) | Privacy en gebruiksgemak | Middel |
| Automatische e-mailherinnering voor offertes | Nu handmatig of via cron | Middel |
| Productcatalogus / prijslijst | Nu worden prijzen per regel handmatig ingevoerd | Middel |
| Herhalende facturen (onderhoudscontracten) | Relevant voor onderhoudsbedrijven | Laag |
| Notificaties via WhatsApp (in plaats van alleen e-mail) | Klanten reageren beter op WA | Middel |
| Exportfunctie (CSV, Excel) | Sommige klanten willen data exporteren | Laag |
| Mobiele app (PWA of native) | Monteurs op locatie | Later |

### Later bouwen (pas als er klanten zijn)

- Multi-tenancy in één database (tenant_id per tabel)
- Automatische onboarding (klant registreert zichzelf)
- Betaalde abonnementen via Stripe (eigen CRM betaalt zichzelf)
- Rapportagedashboard met exportfunctie
- Integratie met andere boekhoudpakketten (Exact, Twinfield, SnelStart)
- API voor externe koppelingen
- Onderhoud-/servicecontract module
- Meerdere vestigingen per bedrijf
- Kalenderintegratie (Google Agenda, Outlook)

### Niet bouwen (leidt af of is niet nodig)

- Eigen boekhoudsoftware (Moneybird is beter)
- Chat-module (WhatsApp/e-mail is genoeg)
- CRM voor B2B-verkoop (verkeerde markt)
- Tijdregistratie-app voor medewerkers (te breed)
- Eigen betalingsgateway bouwen (Mollie/Moneybird is genoeg)

---

## 10. Technische Risico's en Verbeteringen

### Eerlijke technische beoordeling

| Vraag | Beoordeling |
|---|---|
| Is de codebase netjes genoeg om door te verkopen? | **Ja** — Next.js 14, TypeScript, geparametriseerde queries, schone structuur, weinig technische schuld |
| Is het veilig genoeg? | **Grotendeels** — JWT, bcrypt, magic links, parameterized SQL, httpOnly cookies. Twee risico's: geen Mollie webhook signature verification, geen CSRF tokens expliciet aanwezig |
| Is het schaalbaar? | **Beperkt** — Vercel + Neon schalen automatisch, maar multi-tenancy ontbreekt volledig |
| Is het afhankelijk van Ozvolt-specifieke dingen? | **Ja, significant** — bedrijfsnaam, KVK, BTW, e-mail, logo, SMTP-afzender overal hardcoded |
| Hoeveel werk om generiek te maken? | **2–4 weken** full-time (of 4–8 weken parttime) — voornamelijk branding centraliseren en config-systeem bouwen |
| Is multi-tenancy aanwezig? | **Nee** — single-tenant, één admin per deployment |
| Kan elke klant eigen branding, producten, tarieven en workflows krijgen? | **Nog niet** — tarieven wel (uurloon per klus), branding en producten niet |
| Is er documentatie? | **Beperkt** — CRM_AUDIT.md beschrijft routes en tabellen, geen setup-handleiding voor nieuwe klanten |
| Kan dit makkelijk gehost worden? | **Ja** — Vercel + Neon is ideaal voor serverless, eenvoudige deployment |
| Grootste technische risico's | Zie prioriteitenlijst hieronder |

### Prioriteitenlijst

#### Kritiek (direct aanpakken)
1. **Alle Ozvolt-branding centraliseren** — naar env vars en/of database config-tabel
2. **Mollie webhook signature verificatie toevoegen** — betalingsfrauderisico
3. **GDPR-logging implementeren** — wie heeft wanneer welke persoonsgegevens gezien? (minimaal audit trail)
4. **Multi-admin gebruikers** — nu slechts één admin via env vars, niet schaalbaar
5. **Klantdata-isolatie bij multi-tenant** — klanten van bedrijf A mogen bedrijf B nooit zien

#### Belangrijk (binnen 3 maanden)
6. **Config-tabel in database** voor bedrijfsgegevens (naam, KVK, BTW, kleuren, logo-URL)
7. **Onboarding-flow** — nieuwe klant kan eigen gegevens invullen bij eerste login
8. **Eigen factuurmodule** — jij factureert jouw SaaS-klanten (los van Moneybird van de klant)
9. **Rollen en rechten** — monteur ziet andere UI dan eigenaar/backoffice
10. **E-mailtemplate configuratie** — SMTP-gegevens per tenant

#### Later (zodra er klanten zijn)
11. Multi-tenancy architectuur (gedeelde database met tenant_id)
12. Productcatalogus / vaste prijslijsten per tenant
13. Automatische onboarding (self-service registratie)
14. Performance monitoring (Sentry, Vercel Analytics)
15. Volledige auditlog voor AVG-compliance

---

## 11. Juridisch, Privacy en AVG

### Welke persoonsgegevens worden opgeslagen

| Categorie | Velden | Risico |
|---|---|---|
| Klantgegevens | naam, e-mail, telefoon, locatie | Basale identificatiedata — AVG-plichtig |
| Handtekeningen | PNG data-URL van handtekening | Biometrische-achtige data — hoog risico |
| IP-adressen | `accepted_ip` bij offerte/afspraakacceptatie | Persoonsgegevens onder AVG |
| Communicatiegeschiedenis | WhatsApp-berichten, e-mailinhoud | Hoog risico als opgeslagen |
| Betaalinformatie | Mollie payment ID's, Moneybird links | Gevoelig — maar niet rekeningnummers zelf |
| Foto's | Foto's van installaties, soms ook van interieur | Mogelijk personen op foto — AVG-risico |

### AVG-risico's

1. **Geen expliciete toestemming voor verwerking** — klanten worden aangemaakt zonder opt-in
2. **Recht op vergetelheid niet geïmplementeerd** — geen self-service verwijder-functie
3. **Data-bewaarbeleid ontbreekt** — hoe lang wordt data bewaard?
4. **Klantdata niet geïsoleerd per bedrijf** in multi-tenant scenario
5. **Geen cookie-policy** — portaal gebruikt cookies (sessie), geen banner

### Benodigde juridische documenten

| Document | Prioriteit | Opmerking |
|---|---|---|
| **Verwerkersovereenkomst (DPA)** | Kritiek | Jij verwerkt persoonsgegevens namens de installateur → verplicht |
| **Privacyverklaring** | Kritiek | Voor eigen website en voor klantportaal |
| **Algemene voorwaarden** | Kritiek | Aansprakelijkheid, betaling, opzegtermijn |
| **SLA (Service Level Agreement)** | Middel | Uptime garantie, support-reactietijden |
| **Bewaarbeleid** | Middel | Hoe lang bewaar je data? |
| **Cookie-verklaring** | Laag | Voor portaal en website |

### Minimale securitymaatregelen (al aanwezig of nog toe te voegen)

| Maatregel | Status |
|---|---|
| Wachtwoorden gehasht (bcrypt) | ✅ Aanwezig |
| JWT-sessies (httpOnly cookies) | ✅ Aanwezig |
| Parameterized SQL queries | ✅ Aanwezig |
| HTTPS via Vercel | ✅ Aanwezig |
| Brute-force bescherming | ✅ Aanwezig |
| Mollie webhook signature | ❌ Ontbreekt |
| CSRF-bescherming | ⚠️ Onzeker — Next.js middleware aanwezig maar niet expliciet zichtbaar |
| Audit logging | ❌ Ontbreekt |
| Data encryptie at rest | ⚠️ Afhankelijk van Neon/Vercel (waarschijnlijk aanwezig maar niet expliciet) |
| Klantdata isolatie (multi-tenant) | ❌ Ontbreekt (single-tenant) |

---

## 12. Concurrentie en Onderscheid

### Vergelijking met bestaande tools

| Tool | Doelgroep | Prijs | Sterk punt | Zwak punt t.o.v. dit systeem |
|---|---|---|---|---|
| **Teamleader** | KMO's breed | €50–200+/mnd | Volledig CRM-pakket, grote naam | Niet niche, geen oplevering/portaal, te duur voor kleine installateurs |
| **HubSpot** | B2B sales | Gratis–€500+/mnd | Geweldig voor sales-pipelines | Geen vakspecifieke workflows, geen offerte-PDF, geen portaal |
| **Odoo** | Middelgrote bedrijven | €15–€50/gebruiker | Alles-in-één, breed inzetbaar | Complexe implementatie, niet specifiek genoeg, leercurve |
| **Monday.com** | Projectmanagement | €10–20/gebruiker | Visueel, projectoverzicht | Geen offertes, geen facturen, geen klantportaal |
| **WerkbonApp** | Servicetechnici | €30–80/mnd | Werkbonnen, planning voor servicebedrijven | Geen offertesysteem, geen klantportaal, minder compleet |
| **Simpro** | Grotere installateurs | €200–500+/mnd | Feature-rijk, echt voor installateurs | Te duur en complex voor kleine bedrijven, Australische tool |
| **Moneybird** | Boekhouding | €15–40/mnd | Beste Nederlandse boekhoudtool | Geen CRM, geen planning, geen portaal — complementair aan dit systeem |
| **SnelStart / Exact** | Boekhoud-administratie | €20–100+/mnd | Volledige boekhouding | Geen CRM, planning of portaal |
| **Offorte / PandaDoc** | Offerte-tools | €25–100/mnd | Mooie offerte-editors | Geen klantportaal, geen facturering, geen installatiespecifieke workflows |

### Waarom een installateur hier wél voor zou kiezen

1. **Niche-specifieke workflows** — opleveringsrapporten, meerwerk-acceptatie, vakspecifieke termen
2. **Volledig geïntegreerd** — van lead tot betaling in één systeem, niet 5 losse tools
3. **Klantportaal met magic link** — geen gedoe met accounts voor klanten
4. **Online betaling via portaal** — direct op factuur, zonder extra stap
5. **Betaalbaar** — €89–149/mnd vs. €200–500/mnd voor Simpro of Teamleader
6. **Nederlandse boekhoudsync** — Moneybird-integratie standaard ingebakken
7. **WhatsApp-integratie** — essentieel voor Nederlands klantcontact
8. **AI e-mailgenerator** — voor installateurs die geen copywriters zijn

### Waar dit systeem zwakker is

- Geen multi-gebruiker (monteurs kunnen niet inloggen)
- Geen mobiele app (alleen browser)
- Geen kalenderintegratie (Google Agenda / Outlook)
- Geen onderhoudscontract-module
- Geen eigen facturering voor SaaS-klanten
- Geen geavanceerde rapportage

### Hoe niche-specifiek positioneren

**Niet:** "CRM voor MKB" (te breed, verlies je van HubSpot en Teamleader)
**Wel:** "Het enige systeem waarbij jouw klant de offerte tekent, het werk bevestigt, de factuur betaalt en het opleveringsrapport ondertekent — zonder ook maar één telefoontje"

---

## 13. Validatieplan (14 Dagen)

### Doel
- Minimaal 30 gesprekken of reacties
- Minimaal 5 demo-afspraken
- Minimaal 1–3 betalende pilotklanten

### Dag-tot-dag plan

| Dag | Actie | Wie benaderen | Wat zeggen | Wat meten |
|---|---|---|---|---|
| **1** | Lijst maken van 100 installateurs (Google Maps, LinkedIn, KvK) | Laadpaalinstallateurs + elektrotechnische bedrijven in jouw regio | — | Lijst compleet |
| **2** | 20 LinkedIn-verbindingsverzoeken sturen + 10 koude e-mails | Eigenaren 2–10 man bedrijven | "Ik help installateurs met offerte- en klantopvolging" | Reacties, acceptaties |
| **3** | 10 WhatsApp-berichten via Google Maps telefoonnummers | Zelfde doelgroep | DM 1 of DM 2 uit marketingplan | Reacties |
| **4** | Follow-up op dag 2 e-mails + 20 nieuwe LinkedIn DMs | Zelfde doelgroep | Follow-up script | Demo-afspraken |
| **5** | Eerste demo's geven (target: 2 afspraken) | Geïnteresseerden | Demo-script | Feedback, interesse, bezwaren |
| **6** | 15 nieuwe koude e-mails + 10 LinkedIn DMs | Uitbreiden naar andere regio's | E-mail 2 of 3 uit marketingplan | Reacties |
| **7** | Gratis lead magnet posten op LinkedIn | Breed publiek | "Gratis offerte-checklist voor installateurs" | Likes, comments, DMs |
| **8** | Follow-up op alle openstaande gesprekken | Iedereen die reageerde | Follow-up script | Demo-afspraken |
| **9** | 2–3 demo's geven | Geïnteresseerden | Demo-script | Interesse in pilot, bezwaren |
| **10** | Eerste pilot-aanbod doen (€0 setup, €49 eerste maand) | Meest enthousiaste contacten | "Ik stel het gratis in voor jou in ruil voor feedback en een testimonial" | Pilotacceptatie |
| **11** | 20 nieuwe LinkedIn DMs + 10 e-mails | Zonnepaneelinstallateurs toevoegen | E-mail 4 of 5 | Reacties |
| **12** | Demo's geven + follow-up op pilotaanbod | Alle openstaande leads | — | Betalende klanten |
| **13** | Evaluatie: wat werkt, wat niet? Aanpassen benadering | — | — | Statistieken bijhouden |
| **14** | Eindmeting + beslissing | — | — | Zie onderstaand |

### Wanneer is er genoeg bewijs om door te gaan?
- ✅ 5+ demo-afspraken gepland of gehad
- ✅ Minimaal 2 mensen die zeggen "dit zou ik willen gebruiken"
- ✅ Minimaal 1 betalende pilotklant

### Wanneer stoppen of aanpassen?
- ❌ Na 100 berichten: minder dan 5 reacties → boodschap aanpassen
- ❌ Na 5 demo's: niemand wil betalen → prijsstrategie of doelgroep herzien
- ❌ Enige bezwaar is technisch (geen multi-user, geen mobiel) → bouw dat eerst

---

## 14. Demo-Aanbod

### Naam van het aanbod
**"Installatix Pilot — Jouw CRM live in 7 Werkdagen"**
*(of met jouw gekozen merknaam)*

### Wat inbegrepen is
- ✅ Volledig CRM-systeem opgezet met jouw bedrijfsnaam, logo en kleuren
- ✅ Jouw KVK- en BTW-nummer in alle PDF's
- ✅ SMTP-integratie (jouw e-maildomein als afzender)
- ✅ Moneybird-koppeling (als gewenst)
- ✅ 2 uur onboarding-training (via Zoom)
- ✅ Eigen domeinnaam: `crm.jouwbedrijf.nl`
- ✅ Eerste 3 klanten samen invoeren
- ✅ Eerste offerte samen versturen
- ✅ 30 dagen directe support via WhatsApp

### Wat niet inbegrepen is
- ❌ Mollie-account aanmaken (klant doet dit zelf, gratis)
- ❌ Moneybird-abonnement (klant heeft dit al of neemt het zelf)
- ❌ Maatwerk-functionaliteiten buiten het systeem
- ❌ Koppelingen met andere tools (Exact, Outlook, etc.)

### Prijs
- **Pilot-prijs:** €299 setup (eenmalig) + €89/maand (opzegbaar per maand)
- **Eerste pilotklanten (1–3):** €0 setup + €49 eerste 2 maanden (in ruil voor feedback en testimonial)

### Garantie
"Als het systeem na 7 werkdagen niet naar tevredenheid werkt, of als je binnen 30 dagen besluit dat het niks voor jou is, betaal je niets."

### Voorwaarden
- Klant levert: logo (PNG/SVG), bedrijfskleur (HEX), KVK/BTW-nummer, SMTP-logingegevens
- Klant reserveert 2 uur voor onboarding
- Klant geeft feedback na 30 dagen gebruik

### Waarom dit aantrekkelijk is
- Extreem laag risico (gratis terugkeergarantie)
- Concreet en snel (7 werkdagen, niet "ergens in Q2")
- Specifiek voor hun sector (geen generieke CRM-pitch)
- Bewijs van waarde nog voor betaling (demo-first aanpak)

### Hoe te presenteren
"Ik zet het systeem voor jouw bedrijf live in één week. Jij hoeft niks te doen behalve 2 uur vrij te maken voor de training. Daarna stuur je de eerste offerte vanuit het systeem. Als het je niet bevalt, betaal je niks. Als het werkt — en dat gaat het — betaal je €89 per maand. Geen contract, geen jaarlijkse betaling, gewoon maand tot maand."

---

## 15. Namen en Branding

### 20 mogelijke namen

1. **Installatix** — installatie + -ix suffix (professioneel, tech-feel)
2. **Klusflow** — klus + workflow (herkenbaar voor de sector)
3. **Tekno CRM** — techniek + CRM (duidelijk positionering)
4. **Vakflow** — vakman + workflow (breed, niche-gevoel)
5. **Werkwise** — werk + wise (slim werken, internationaal bruikbaar)
6. **Installo** — installatie + -o suffix (kort, memorabel)
7. **Klanto** — klant + -o suffix (klantgericht, friendly)
8. **TechPortal** — technisch portaal (generiek maar duidelijk)
9. **Fixhub** — fix + hub (snelle hulp, centraal punt)
10. **Vaktool** — vakman + tool (simpel en eerlijk)
11. **Crafthub** — ambacht + hub (internationaal schaalbaar)
12. **Servicely** — service + -ly suffix (SaaS-gevoel, schaalbaar)
13. **Monteo** — monteur + -eo suffix (herkenbaar voor doelgroep)
14. **Offertix** — offerte + -ix (functiegericht, duidelijk)
15. **Bouwwise** — bouwen + wise (bredere markt mogelijk)
16. **Klusmate** — klus + mate (friendly, partner-gevoel)
17. **Werkio** — werk + -io suffix (modern, tech-startup)
18. **Portavio** — portaal + via + -o (portaal-focus, internationaal)
19. **Installeader** — installatie + leader (premium positioning)
20. **Nexwork** — next + work (toekomstgericht, professioneel)

### Top 5 met uitleg

| Naam | Score | Reden |
|---|---|---|
| **Installatix** | ⭐⭐⭐⭐⭐ | Duidelijk voor de sector, tech-gevoel, internationaal inzetbaar als "Installatix.io", beschikbare domeinnamen waarschijnlijk vrij |
| **Klusflow** | ⭐⭐⭐⭐ | Herkenbaarheid in NL-markt hoog, legt accent op workflow (kernwaarde), minder internationaal |
| **Vakflow** | ⭐⭐⭐⭐ | Breed genoeg voor meerdere vakken, duidelijk, kan met Vakflow.nl en Vakflow.io |
| **Monteo** | ⭐⭐⭐⭐ | Herkenbaar voor doelgroep (monteurs), kort, vriendelijk, goed als app-naam |
| **Werkwise** | ⭐⭐⭐⭐ | Internationaal bruikbaar (smart work), professioneel, niet te sectorgebonden voor latere uitbreiding |

**Aanbeveling: Installatix** — het combineert herkenbaarheid voor de doelgroep met een professionele uitstraling en internationale schaalbaarheid.

---

## 16. Eindadvies

### Moeten we dit project wel of niet proberen te verkopen?
**Ja — maar doe het gefaseerd en realistisch.**

Het systeem is technisch goed gebouwd, lost echte problemen op en heeft geen directe niche-concurrent. De twee grootste blokkades (hardcoded branding en single-tenant) zijn oplosbaar. Begin met handmatige done-for-you deployments en bouw parallel aan automatisering.

### Beste doelgroep
**Laadpaalinstallateurs en elektrotechnische bedrijven, 2–10 medewerkers, eigenaar doet zelf de offertes.**

### Beste positionering
**"Het offerte- en klantbeheersysteem speciaal voor installateurs — van eerste contact tot getekende oplevering."**

### Beste verkoopmodel
**Hybride: €299 setup fee + €119/maand (Professional pakket).** Voor eerste 3 klanten: gratis setup in ruil voor feedback en testimonial.

### Juiste eerste prijs
- Eerste 3 klanten: €0 setup + €49/maand (pilotprijs)
- Klanten 4–10: €299 setup + €89–119/maand
- Na 10 klanten: standaard tarief invoeren

### Welke marketingkanalen eerst?
1. LinkedIn koude DMs (eigenaren installatiebedrijven)
2. Google Maps telefoonnummers → WhatsApp/bel outreach
3. Koude e-mail (zakelijk e-mailadres van website)
4. Organische LinkedIn content (posts over offertepijn)
5. Persoonlijk netwerk (ken je installateurs?)

### 10 acties deze week

1. **Dag 1:** Maak lijst van 100 installateurs in jouw regio (Google Maps, LinkedIn)
2. **Dag 1:** Vervang alle Ozvolt-branding in `.env` zodat je het systeem als demo kunt tonen
3. **Dag 2:** Stuur 20 LinkedIn-verbindingsverzoeken + 10 koude DMs
4. **Dag 2:** Schrijf 3 LinkedIn-posts (offertepijn, klantportaal, admin-besparing)
5. **Dag 3:** Stuur 10 koude e-mails (gebruik e-mail 1 en 2 uit dit plan)
6. **Dag 3:** Maak een demo-omgeving klaar (nep-bedrijf, nep-offertes, nep-klant)
7. **Dag 4:** Geef eerste demo (aan iemand uit netwerk of koude lead)
8. **Dag 4:** Schrijf verwerkersovereenkomst en algemene voorwaarden (of laat opstellen)
9. **Dag 5:** Follow-up op alle openstaande berichten
10. **Dag 5:** Kies je merknaam en registreer het domein

### 5 fouten die je moet vermijden

1. **Te lang wachten op het "perfecte" systeem.** Multi-tenancy en rollen hoef je nu nog niet. Doe het handmatig en leer wat klanten echt willen.
2. **Prijs te laag zetten uit onzekerheid.** €49/maand klinkt veilig maar trekt klanten aan die niet serieus zijn. €89 of €119 filter serieuze kopers.
3. **Te breed targeten.** Niet "alle installateurs" — begin met laadpaal en elektro. Als je die snapt, ga je uitbreiden.
4. **Niet om betaling vragen.** Een gratis pilot zonder commitment levert nul omzet en nul bewijs. Vraag altijd iets — ook al is het €49.
5. **Alles zelf proberen te bouwen voor je het probeert te verkopen.** Valideer eerst dat mensen willen betalen, bouw daarna.

---

## Samenvatting (max. 500 woorden — klaar voor ChatGPT)

Ik heb een volledig CRM/portaalsysteem gebouwd voor mijn eigen elektrotechnisch installatiebedrijf (Ozvolt Elektrotechniek). Het systeem is gebouwd op Next.js 14, PostgreSQL (Neon), en gedeployed op Vercel. Het bevat: leadbeheer, offertes met PDF en digitale handtekening, facturen, klantportaal (magic link, geen wachtwoord nodig), planning, opleveringsrapporten met foto's en handtekeningen, meerwerk-acceptatie via portaal, WhatsApp-integratie, AI e-mailgenerator (Claude Haiku), Moneybird-boekhoudingssync en Mollie-betaalintegratie.

Ik wil dit systeem gaan verkopen aan andere installatiebedrijven in Nederland — specifiek laadpaalinstallateurs, elektrotechnische bedrijven en zonnepaneelinstallateurs met 2–10 medewerkers.

**Technische situatie:** Het systeem is single-tenant (één admin, één bedrijf per deployment). Alle bedrijfsbranding is hardcoded (naam, KVK, BTW, e-mail, logo). Multi-tenancy bestaat nog niet. Er zijn 58+ API routes, 14 database tabellen en 40+ frontend pagina's.

**Verkoopstrategie:** Starten met een done-for-you aanpak: voor elke klant een aparte deployment opzetten (eigen branding, eigen Vercel-project, eigen database). Setup fee van €299, dan €119/maand. Eerste 3 klanten gratis setup in ruil voor feedback en testimonial.

**Positionering:** "Het offerte- en klantbeheersysteem speciaal voor installateurs — van eerste contact tot getekende oplevering." De hook is de offertepijn: klanten reageren niet op offertes, installateurs verliezen omzet. Oplossing: klant tekent digitaal via link op zijn telefoon, geen account nodig.

**Doelgroep:** Laadpaalinstallateurs en elektrotechnische bedrijven, eigenaar doet zelf de offertes, gebruikt Excel of Word, heeft 3–8 medewerkers.

**Marketing (fase 1, 0 budget):** LinkedIn koude DMs (eigenaren), Google Maps bel/WhatsApp outreach, koude e-mail, organische LinkedIn content over offertepijn en tijdsbesparing. Doel: 30 reacties, 5 demo's, 1–3 pilotklanten in 14 dagen.

**Prioritaire tekortkomingen:** (1) branding centraliseren via env vars/database, (2) AVG/GDPR-documenten opstellen (verwerkersovereenkomst, voorwaarden, privacyverklaring), (3) multi-user ondersteuning voor monteurs.

**Concurrentiepositie:** Nagenoeg geen directe concurrent in Nederland voor dit specifieke niche-profiel. Teamleader en Odoo zijn te breed en te duur. Simpro is te groot. WerkbonApp mist offertes en portaal. Dit systeem combineert alles specifiek voor de installatiesector.

**Merknaam advies:** Installatix (of Klusflow / Vakflow)

**Eindbeslissing:** Ja, dit is verkoopbaar. Begin nu met handmatige implementaties, valideer in 14 dagen of mensen willen betalen, en bouw daarna de multi-tenant SaaS-versie. Internationalisering (BE, DE) is later mogelijk op dezelfde technische basis.

**Vraag voor ChatGPT:** Help me met [specifiek onderdeel: koude e-mailsequenties / LinkedIn-contentstrategie / prijsmodel / technische roadmap voor multi-tenancy / onboarding-flow voor eerste klanten].

---

*Dit document is automatisch gegenereerd op basis van volledige codebase-analyse van het Ozvolt CRM (Next.js 14 · PostgreSQL · Vercel · 58+ API routes · 14 tabellen · 40+ pagina's).*
