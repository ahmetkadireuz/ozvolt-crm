import { tarievenVoor, tarievenBekend, type FiscaleTarieven } from './tarieven'
import { belastingDoorOnderneming, berekenInkomstenbelasting, type FiscaleUitkomst } from './berekening'
import { schatAfschrijving, type Boeking, type JaarCijfers } from './moneybird-data'
import { verwachtLoon, type FiscaalProfiel } from './profiel'

/* ============================================================
   Combineert Moneybird-cijfers + profiel tot één advies:
   belastingreserve, KIA-status, urencriterium en signalen.
   ============================================================ */

export type Signaal = {
  niveau: 'actie' | 'kans' | 'waarschuwing' | 'info'
  titel: string
  tekst: string
  items?: { label: string; bedrag?: number; docId?: string }[]
}

// Aftrekbare kostensoorten die bij een elektrotechnisch bedrijf bijna altijd voorkomen
const VERWACHTE_KOSTEN: { naam: string; woorden: string[]; uitleg: string }[] = [
  { naam: 'Bedrijfsaansprakelijkheidsverzekering (AVB)', woorden: ['verzekering', 'avb', 'aansprakelijk', 'polis'],
    uitleg: 'Als installateur is een AVB (en eventueel beroepsaansprakelijkheid) vrijwel onmisbaar; de premie is volledig aftrekbaar.' },
  { naam: 'Telefoon / mobiel abonnement', woorden: ['telefoon', 'mobiel', 'kpn', 'vodafone', 'odido', 't-mobile', 'simyo', 'ben ', 'lebara', 'youfone'],
    uitleg: 'Gebruik je je telefoon ook zakelijk? Dan mag je het zakelijke deel (bijv. 50%) als kosten boeken en de btw daarover terugvragen.' },
  { naam: 'Website / domeinnaam / e-mail', woorden: ['domein', 'hosting', 'website', 'transip', 'strato', 'one.com', 'google workspace', 'microsoft 365', 'vimexx', 'hostnet', 'vercel'],
    uitleg: 'Kosten voor je domein (ozvoltelektro.nl), hosting, e-mail en je CRM zijn zakelijke kosten.' },
  { naam: 'Boekhoudsoftware & bankkosten', woorden: ['moneybird', 'knab', 'bankkosten', 'rabobank', 'ing ', 'bunq'],
    uitleg: 'Je Moneybird-abonnement en de kosten van je zakelijke rekening (Knab) zijn aftrekbaar.' },
  { naam: 'Werkkleding & PBM', woorden: ['werkkleding', 'werkschoen', 'veiligheidsschoen', 's3', 'handschoen', 'helm', 'bril', 'pbm', 'havep', 'snickers', 'blaklader', 'mascot'],
    uitleg: 'Werkkleding met logo (≥ 70 cm²) of beschermende kleding (S3-schoenen, handschoenen, bril) is aftrekbaar.' },
  { naam: 'Opleiding & certificering', woorden: ['cursus', 'opleiding', 'training', 'nen 3140', 'nen3140', 'nen 1010', 'vca', 'examen', 'scios', 'certificaat'],
    uitleg: 'Cursussen zoals NEN 3140/1010, VCA of SCIOS-scope 8 zijn aftrekbaar (incl. hercertificering).' },
  { naam: 'Kalibratie / keuring meetapparatuur', woorden: ['kalibr', 'keuring', 'ijking', 'calibrat'],
    uitleg: 'Jaarlijkse kalibratie van je installatietester en keuring van gereedschap zijn aftrekbaar.' },
  { naam: 'Reiskosten / kilometers', woorden: ['kilometer', 'km ', 'reiskosten', 'brandstof', 'tank', 'shell', 'bp ', 'esso', 'tinq', 'parkeer'],
    uitleg: 'Rijd je met je privéauto naar klanten of groothandels? Dan mag je €0,23 per zakelijke km als kosten opvoeren. Houd een rittenregistratie bij.' },
]

export type Advies = {
  jaar: number
  tarieven: FiscaleTarieven
  tarievenOnbekend: boolean
  // Winst
  omzet: number
  kosten: number
  afschrijving: number
  winstYtd: number
  prognoseFactor: number
  prognoseWinst: number
  // Loon
  loon: number
  loonheffing: number | null
  loonIsAanname: boolean
  // Belasting
  nu: ReturnType<typeof belastingDoorOnderneming>
  prognose: ReturnType<typeof belastingDoorOnderneming>
  totaalPrognose: FiscaleUitkomst
  teBetalenBijAangifte: number | null
  resterendeMaanden: number
  perMaand: number
  // KIA
  kiaTotaal: number
  kiaPotentieel: number
  kiaAftrek: number
  kiaVoordeel: number
  kiaTekort: number
  // Uren
  urenLoondienstJaar: number
  urenNodig: number
  // Signalen
  signalen: Signaal[]
}

const LOON_AANNAME = 45000

function dagenTussen(a: Date, b: Date) {
  return Math.max(0, (b.getTime() - a.getTime()) / 86400000)
}

export function maakAdvies(c: JaarCijfers, p: FiscaalProfiel, vandaag = new Date()): Advies {
  const jaar = c.jaar
  const t = tarievenVoor(jaar)

  // ── Winst ──
  const afschrijving = schatAfschrijving(c.investeringen, jaar)
  const winstYtd = c.omzet - c.kosten - afschrijving

  const start = p.start_datum ? new Date(p.start_datum) : new Date(jaar, 0, 1)
  const eind = new Date(jaar, 11, 31, 23, 59)
  const nu = vandaag > eind ? eind : vandaag
  const verstreken = dagenTussen(start, nu)
  const totaalDagen = dagenTussen(start, eind)
  // Pas doortrekken als er minstens een maand aan cijfers is
  const prognoseFactor = verstreken >= 30 && totaalDagen > 0 ? Math.max(1, totaalDagen / verstreken) : 1
  const prognoseWinst = (c.omzet - c.kosten) * prognoseFactor - afschrijving

  // ── Loon ──
  const vl = verwachtLoon(p)
  const loon = vl?.loon ?? LOON_AANNAME
  const loonheffing = vl?.loonheffing ?? null

  // ── KIA ──
  const kiaRegels = c.investeringen.filter(b => b.bedrag >= t.kia.minPerBedrijfsmiddel)
  const kiaTotaal = kiaRegels.reduce((s, b) => s + b.bedrag, 0)
  const kiaPotentieel = kiaTotaal + c.mogelijkeInvesteringen.reduce((s, b) => s + b.bedrag, 0)

  const basis = { loon, urencriterium: p.urencriterium, starter: p.starter }
  const nuB = belastingDoorOnderneming({ ...basis, winst: winstYtd, investeringen: kiaTotaal }, t)
  const progB = belastingDoorOnderneming({ ...basis, winst: prognoseWinst, investeringen: kiaTotaal }, t)
  const zonderKia = belastingDoorOnderneming({ ...basis, winst: prognoseWinst, investeringen: 0 }, t)
  const kiaVoordeel = Math.max(0, zonderKia.extra - progB.extra)

  const totaalPrognose = berekenInkomstenbelasting({ ...basis, winst: prognoseWinst, investeringen: kiaTotaal }, t)
  const teBetalenBijAangifte = loonheffing != null ? totaalPrognose.totaal - loonheffing : null

  const resterendeMaanden = vandaag.getFullYear() === jaar ? 12 - vandaag.getMonth() : 0
  const nogApartTeZetten = Math.max(0, progB.extra - p.reserve_apart)
  const perMaand = resterendeMaanden > 0 ? nogApartTeZetten / resterendeMaanden : nogApartTeZetten

  // ── Uren ── (grotendeelscriterium: > helft van totale arbeidstijd, ± 46 werkweken)
  const urenLoondienstJaar = Math.round(p.uren_loondienst_per_week * 46)
  const urenNodig = Math.max(t.urencriterium, urenLoondienstJaar + 1)

  // ── Signalen ──
  const s: Signaal[] = []
  const euro = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  if (!tarievenBekend(jaar)) {
    s.push({ niveau: 'waarschuwing', titel: `Tarieven ${jaar} nog niet ingesteld`,
      tekst: `De berekening gebruikt de tarieven van ${t.jaar}. Werk lib/fiscaal/tarieven.ts bij met de officiële bedragen.` })
  }

  if (!vl) {
    s.push({ niveau: 'actie', titel: 'Vul je loongegevens in',
      tekst: `Zonder je loon rekent het dashboard met een aanname van ${euro(LOON_AANNAME)}. Je winst wordt belast bovenop je salaris, dus je loon bepaalt je tarief. Vul de cumulatieve bedragen van je laatste loonstrook in onder "Profiel".` })
  }

  if (nuB.extra > p.reserve_apart + 50) {
    s.push({ niveau: 'actie', titel: `Zet nu ${euro(nuB.extra - p.reserve_apart)} apart voor de belasting`,
      tekst: `Over je winst tot vandaag (${euro(winstYtd)}) betaal je naar schatting ${euro(nuB.extra)} inkomstenbelasting + Zvw. Je werkgever houdt dit niet in. Je hebt ${euro(p.reserve_apart)} als apart gezet opgegeven.` })
  }

  if (progB.extra > 1000) {
    s.push({ niveau: 'info', titel: 'Overweeg een voorlopige aanslag aan te vragen',
      tekst: `Verwachte extra belasting over ${jaar}: ${euro(progB.extra)}. Met een voorlopige aanslag betaal je dit in maandtermijnen en voorkom je belastingrente na afloop van het jaar. Aanvragen of wijzigen kan via Mijn Belastingdienst.` })
  }

  // KIA
  if (kiaTotaal >= t.kia.ondergrens) {
    s.push({ niveau: 'kans', titel: `KIA van toepassing: ${euro(kiaTotaal * t.kia.pct)} extra aftrek`,
      tekst: `Je investeringen (${euro(kiaTotaal)}) zitten boven de KIA-drempel van ${euro(t.kia.ondergrens)}. Dat levert ongeveer ${euro(kiaVoordeel)} minder belasting op. Vergeet dit niet bij je aangifte in te vullen.` })
  } else if (kiaPotentieel >= t.kia.ondergrens) {
    s.push({ niveau: 'kans', titel: 'KIA binnen bereik als investeringen goed geboekt worden',
      tekst: `Op de categorie "investeringen" staat ${euro(kiaTotaal)}, maar er staan ook aankopen ≥ €450 tussen de kosten die op bedrijfsmiddelen lijken. Samen ${euro(kiaPotentieel)} — boven de drempel van ${euro(t.kia.ondergrens)}. Laat je boekhouder bevestigen welke het zijn.` })
  } else if (kiaTotaal >= t.kia.ondergrens * 0.85) {
    s.push({ niveau: 'kans', titel: `Nog ${euro(t.kia.ondergrens - kiaTotaal)} tot de KIA-drempel`,
      tekst: `Staat er een noodzakelijke aankoop (≥ €450 per stuk) op de planning? Door die vóór 31 december te doen haal je de KIA: 28% extra aftrek over alle investeringen. Koop niets alléén voor de aftrek — het netto voordeel is ongeveer 10% van het bedrag.` })
  }

  if (c.mogelijkeInvesteringen.length > 0) {
    s.push({ niveau: 'kans', titel: `${c.mogelijkeInvesteringen.length} aankoop/aankopen ≥ €450 geboekt als kosten`,
      tekst: 'Deze aankopen lijken op bedrijfsmiddelen (gaan meerdere jaren mee). Die horen op een activa-rekening met afschrijving, en tellen dan mee voor de KIA. Wijzig dit pas na akkoord (van jou of je boekhouder).',
      items: c.mogelijkeInvesteringen.map((b: Boeking) => ({ label: `${b.datum} · ${b.leverancier} — ${b.omschrijving}`, bedrag: b.bedrag, docId: b.docId })) })
  }

  if (c.zonderGrootboek.length > 0) {
    s.push({ niveau: 'actie', titel: `${c.zonderGrootboek.length} boekingsregel(s) zonder categorie`,
      tekst: 'Regels zonder grootboekrekening tellen niet mee als kosten, waardoor je winst te hoog uitvalt. Geef ze een categorie in Moneybird.',
      items: c.zonderGrootboek.slice(0, 15).map(b => ({ label: `${b.datum} · ${b.leverancier} — ${b.omschrijving}`, bedrag: b.bedrag, docId: b.docId })) })
  }

  if (c.zonderBijlage.length > 0) {
    s.push({ niveau: 'actie', titel: `${c.zonderBijlage.length} inkoopdocument(en) zonder bon/factuur`,
      tekst: 'Je moet bonnen 7 jaar bewaren. Zonder bijlage kan de Belastingdienst de aftrek (en btw-teruggave) weigeren. Upload de pdf of foto in Moneybird.',
      items: c.zonderBijlage.slice(0, 15).map(b => ({ label: `${b.datum} · ${b.leverancier}`, docId: b.docId })) })
  }

  if (c.conceptFacturen > 0) {
    s.push({ niveau: 'info', titel: `${c.conceptFacturen} conceptfactuur/facturen in Moneybird`,
      tekst: 'Concepten tellen niet mee in de omzet hierboven. Verstuur ze of verwijder ze als ze niet meer nodig zijn.' })
  }

  // Urencriterium
  if (p.urencriterium) {
    s.push({ niveau: 'waarschuwing', titel: 'Urencriterium staat aan — alleen met bewijs',
      tekst: `Met ${p.uren_loondienst_per_week} uur loondienst moet je als starter méér dan de helft van je werktijd aan je bedrijf besteden: ruim ${urenNodig.toLocaleString('nl-NL')} uur. Zonder sluitende urenregistratie schrapt de Belastingdienst de zelfstandigen- en startersaftrek (met naheffing).` })
  } else {
    s.push({ niveau: 'info', titel: 'Zelfstandigen- en startersaftrek niet meegerekend',
      tekst: `Naast 1.225 uur moet je als starter meer dan de helft van je totale werktijd aan je bedrijf besteden (grotendeelscriterium). Met ${p.uren_loondienst_per_week} uur loondienst is dat ruim ${urenNodig.toLocaleString('nl-NL')} uur — niet realistisch. De MKB-winstvrijstelling (${Math.round(t.mkbWinstvrijstellingPct * 1000) / 10}%) en KIA krijg je wél zonder urencriterium.` })
  }

  // Ontbrekende kostensoorten
  const corpus = c.teksten.join(' | ')
  const ontbrekend = VERWACHTE_KOSTEN.filter(k => !k.woorden.some(w => corpus.includes(w)))
  for (const k of ontbrekend) {
    s.push({ niveau: 'kans', titel: `Geen kosten gevonden voor: ${k.naam}`, tekst: k.uitleg })
  }

  // KOR-check
  const prognoseOmzet = c.omzet * prognoseFactor
  if (prognoseOmzet > 0 && prognoseOmzet < 20000) {
    s.push({ niveau: 'info', titel: 'Omzet onder de KOR-grens van €20.000',
      tekst: 'Met de kleineondernemersregeling hoef je geen btw te rekenen, maar mag je ook geen btw terugvragen op inkopen en gereedschap. Voor een installateur met veel materiaalinkoop en zakelijke klanten is dat meestal níet voordelig. Alleen overwegen als je vooral particulieren bedient en weinig inkoopt.' })
  }

  const volgorde = { actie: 0, waarschuwing: 1, kans: 2, info: 3 }
  s.sort((a, b) => volgorde[a.niveau] - volgorde[b.niveau])

  return {
    jaar, tarieven: t, tarievenOnbekend: !tarievenBekend(jaar),
    omzet: c.omzet, kosten: c.kosten, afschrijving, winstYtd, prognoseFactor, prognoseWinst,
    loon, loonheffing, loonIsAanname: !vl,
    nu: nuB, prognose: progB, totaalPrognose, teBetalenBijAangifte,
    resterendeMaanden, perMaand,
    kiaTotaal, kiaPotentieel, kiaAftrek: progB.met.kia, kiaVoordeel, kiaTekort: Math.max(0, t.kia.ondergrens - kiaTotaal),
    urenLoondienstJaar, urenNodig,
    signalen: s,
  }
}
