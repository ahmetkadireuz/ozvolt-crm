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
