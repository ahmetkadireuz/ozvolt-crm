/* ============================================================
   Fiscale parameters per jaar (inkomstenbelasting, niet-AOW).
   Alle bedragen komen uit de officiële tabellen van de
   Belastingdienst; controleer ze elk jaar opnieuw.
   ============================================================ */

export type Schijf = { tot: number | null; tarief: number }

export type FiscaleTarieven = {
  jaar: number
  box1: Schijf[]
  /** Tarief waartegen aftrekposten (ondernemersaftrek, MKB) maximaal werken */
  aftrekTariefMax: number
  algemeneHeffingskorting: { max: number; afbouwVanaf: number; afbouwPct: number }
  /** Arbeidskorting: opbouw in knikpunten, daarna afbouw */
  arbeidskorting: {
    knikpunten: { tot: number; pct: number }[]
    max: number
    afbouwVanaf: number
    afbouwPct: number
  }
  zelfstandigenaftrek: number
  startersaftrek: number
  mkbWinstvrijstellingPct: number
  zvw: { pct: number; maxBijdrageInkomen: number }
  kia: {
    minPerBedrijfsmiddel: number
    ondergrens: number
    pctTot: number        // 28% tot dit bedrag
    pct: number
    vastBedragTot: number // vast bedrag tot dit bedrag
    vastBedrag: number
    afbouwPct: number     // daarna afbouw tot bovengrens
    bovengrens: number
  }
  urencriterium: number
  kilometervergoeding: number
  bronnen: string[]
}

export const TARIEVEN: Record<number, FiscaleTarieven> = {
  2026: {
    jaar: 2026,
    box1: [
      { tot: 38883, tarief: 0.3575 },
      { tot: 78426, tarief: 0.3756 },
      { tot: null,  tarief: 0.495 },
    ],
    aftrekTariefMax: 0.3756,
    algemeneHeffingskorting: { max: 3115, afbouwVanaf: 29736, afbouwPct: 0.06398 },
    arbeidskorting: {
      knikpunten: [
        { tot: 11965, pct: 0.08324 },
        { tot: 25845, pct: 0.31009 },
        { tot: 45592, pct: 0.0195 },
      ],
      max: 5685,
      afbouwVanaf: 45592,
      afbouwPct: 0.0651,
    },
    zelfstandigenaftrek: 1200,
    startersaftrek: 2123,
    mkbWinstvrijstellingPct: 0.127,
    zvw: { pct: 0.0485, maxBijdrageInkomen: 79409 },
    kia: {
      minPerBedrijfsmiddel: 450,
      ondergrens: 2901,
      pctTot: 71683,
      pct: 0.28,
      vastBedragTot: 132746,
      vastBedrag: 20072,
      afbouwPct: 0.0756,
      bovengrens: 398236,
    },
    urencriterium: 1225,
    kilometervergoeding: 0.23,
    bronnen: [
      'Belastingdienst — tarieven box 1 2026',
      'Belastingdienst — tabel algemene heffingskorting 2026',
      'Belastingdienst — tabel arbeidskorting 2026',
      'Belastingdienst — mkb-winstvrijstelling 2026',
      'Belastingdienst — kleinschaligheidsinvesteringsaftrek 2026',
      'Belastingdienst — percentages inkomensafhankelijke bijdrage Zvw 2026',
    ],
  },
}

export function tarievenVoor(jaar: number): FiscaleTarieven {
  if (TARIEVEN[jaar]) return TARIEVEN[jaar]
  // Terugvallen op het meest recente bekende jaar (met waarschuwing in de UI)
  const laatste = Math.max(...Object.keys(TARIEVEN).map(Number))
  return TARIEVEN[laatste]
}

export function tarievenBekend(jaar: number) {
  return !!TARIEVEN[jaar]
}
