/* Checklists voor opleveringsrapporten, overgenomen uit het PHP-pakket.
   Types: groepenkast, laadpaal, werkzaamheden (op basis van offerte/klus). */

export type ChecklistSectie = { titel: string; punten: string[] }

export const RAPPORT_TYPES = ['groepenkast', 'laadpaal', 'werkzaamheden'] as const
export type RapportType = (typeof RAPPORT_TYPES)[number]

export const RAPPORT_TYPE_LABELS: Record<RapportType, string> = {
  groepenkast: 'Groepenkast',
  laadpaal: 'Laadpaal',
  werkzaamheden: 'Werkzaamheden',
}

export function checklistSecties(type: RapportType): ChecklistSectie[] {
  if (type === 'groepenkast') return [
    { titel: '1. Demontage oude installatie', punten: [
      'Installatie spanningsloos gemaakt',
      'Oude groepenkast verwijderd',
      'Oude bekabeling gecontroleerd op staat',
      'Asbest/gevaarlijke stoffen gecontroleerd',
    ]},
    { titel: '2. Nieuwe groepenkast — Montage', punten: [
      'Kast waterpas en stevig gemonteerd',
      'Hoofdschakelaar geplaatst en functioneel',
      'Aardlekschakelaars geplaatst (30mA)',
      'Automaten correct gedimensioneerd (A)',
      'Groepenverdeling conform schema',
      'Alle groepen gelabeld',
      'DIN-rail componenten vast gemonteerd',
    ]},
    { titel: '3. Bekabeling & aansluitingen', punten: [
      'Aansluitingen vast en correct moment',
      'Adereindhulzen gebruikt waar vereist',
      'Juiste kabeldoorsnede per groep',
      'PE-aarding correct aangesloten',
      'Aardingsrail correct verbonden',
      'Nul- en fasegeleiders correct gemerkt',
      'Kabels netjes gebundeld en vastgezet',
    ]},
    { titel: '4. Metingen & testen (NEN 1010)', punten: [
      'Isolatieweerstand gemeten (≥ 1 MΩ)',
      'Aardlekschakelaar getest (uitschakeltest)',
      'Kortsluitvastheid gecontroleerd',
      'Lus-impedantie gemeten',
      'Spanningsverlies binnen norm (≤ 3%)',
      'Fasebelasting gebalanceerd (3-fase)',
      'Alle groepen spanningsvoerend getest',
    ]},
    { titel: '5. Afwerking & veiligheid', punten: [
      'Kastdeur sluit goed en vergrendelt',
      'Afdichtingen/doorvoeren waterdicht',
      'Wanddoorvoeren netjes afgewerkt',
      'Werkplek schoon opgeleverd',
      'Groepenverdeling schema bijgevoegd',
      'Klant geïnstrueerd over nieuwe kast',
      "Foto's gemaakt (voor/na)",
    ]},
  ]

  if (type === 'laadpaal') return [
    { titel: '1. Voorinspectie & voorbereiding', punten: [
      'Meterkast gecontroleerd op capaciteit',
      'Voldoende aansluitwaarde beschikbaar',
      'Kabelroute bepaald en haalbaar',
      'Montagelocatie geschikt en vlak',
    ]},
    { titel: '2. Elektrische installatie', punten: [
      'Aparte groep in meterkast geplaatst',
      'Aardlekschakelaar type A/B geplaatst',
      'Automaat correct gedimensioneerd',
      'Juiste kabeldoorsnede gebruikt',
      'PE-aarding correct aangesloten',
      'Aansluitingen vast en goed afgewerkt',
      'Kabelgoot/buis netjes gemonteerd',
    ]},
    { titel: '3. Laadpaal — Montage', punten: [
      'Laadpaal stevig en waterpas gemonteerd',
      'Muurbeugel/paal correct bevestigd',
      'Kabel netjes aangesloten in laadpaal',
      'Laadpaal waterdicht afgewerkt',
      'LED-indicatie/scherm functioneert',
    ]},
    { titel: '4. Configuratie & testen', punten: [
      'WiFi/netwerk gekoppeld',
      'App geïnstalleerd en gekoppeld',
      'RFID-pas/tag geactiveerd',
      'Load balancing / dynamisch vermogen ingesteld',
      'Maximaal laadvermogen correct ingesteld',
      'Testlading uitgevoerd met voertuig',
      'Laadpaal schakelt correct in/uit',
      'Aardlekschakelaar uitschakeltest OK',
    ]},
    { titel: '5. Afwerking & oplevering', punten: [
      'Wanddoorvoeren/gaten afgedicht',
      'Kabels/leidingen netjes afgewerkt',
      'Werkplek schoon opgeleverd',
      'Klant geïnstrueerd over bediening',
      'Laadpaal geregistreerd bij fabrikant',
      "Foto's gemaakt (voor/na)",
    ]},
  ]

  // werkzaamheden: basisstructuur — punten worden gevuld vanuit offerte/klus
  return [
    { titel: '1. Uitgevoerde werkzaamheden', punten: [] },
    { titel: '2. Afwerking & oplevering', punten: [
      'Werkplek schoon achtergelaten',
      'Materiaalresten afgevoerd',
      'Klant geïnformeerd over uitgevoerd werk',
      'Fotodocumentatie gemaakt',
    ]},
  ]
}

/** Vult de werkzaamheden-checklist met offerte-regels of klusgegevens. */
export function werkzaamhedenSecties(
  regels: { omschrijving?: string }[],
  klus: { type_werk?: string | null; omschrijving?: string | null } | null,
): ChecklistSectie[] {
  const punten: string[] = []
  for (const r of regels) {
    const o = (r.omschrijving ?? '').trim()
    if (o) punten.push(o)
  }
  if (!punten.length && klus) {
    if (klus.type_werk) punten.push(klus.type_werk.trim())
    for (const line of (klus.omschrijving ?? '').split('\n')) {
      if (line.trim()) punten.push(line.trim())
    }
  }
  if (!punten.length) punten.push('Werkzaamheden conform afspraak')

  const secties = checklistSecties('werkzaamheden')
  secties[0].punten = punten
  return secties
}
