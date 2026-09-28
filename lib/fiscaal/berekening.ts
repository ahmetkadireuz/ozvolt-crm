import type { FiscaleTarieven } from './tarieven'

/* ============================================================
   Inkomstenbelasting box 1 + Zvw voor loondienst + eenmanszaak.
   Vereenvoudigd model: geen fiscaal partner, geen eigen woning,
   geen box 2/3, geen overige aftrekposten.
   ============================================================ */

const r2 = (n: number) => Math.round(n * 100) / 100

export function belastingBox1(inkomen: number, t: FiscaleTarieven) {
  let rest = Math.max(0, inkomen)
  let vorige = 0
  let totaal = 0
  for (const s of t.box1) {
    const grens = s.tot ?? Infinity
    const deel = Math.min(rest, grens - vorige)
    if (deel <= 0) break
    totaal += deel * s.tarief
    rest -= deel
    vorige = grens
  }
  return totaal
}

export function algemeneHeffingskorting(inkomen: number, t: FiscaleTarieven) {
  const a = t.algemeneHeffingskorting
  const afbouw = Math.max(0, inkomen - a.afbouwVanaf) * a.afbouwPct
  return Math.max(0, a.max - afbouw)
}

export function arbeidskorting(arbeidsinkomen: number, t: FiscaleTarieven) {
  const a = t.arbeidskorting
  const ai = Math.max(0, arbeidsinkomen)
  if (ai > a.afbouwVanaf) {
    return Math.max(0, a.max - (ai - a.afbouwVanaf) * a.afbouwPct)
  }
  let korting = 0
  let vorige = 0
  for (const k of a.knikpunten) {
    const deel = Math.min(ai, k.tot) - vorige
    if (deel <= 0) break
    korting += deel * k.pct
    vorige = k.tot
  }
  return Math.min(korting, a.max)
}

/** KIA volgens de tabel van het jaar. `totaal` = som van bedrijfsmiddelen ≥ minimum. */
export function berekenKia(totaal: number, t: FiscaleTarieven) {
  const k = t.kia
  if (totaal < k.ondergrens || totaal > k.bovengrens) return 0
  if (totaal <= k.pctTot) return totaal * k.pct
  if (totaal <= k.vastBedragTot) return k.vastBedrag
  return Math.max(0, k.vastBedrag - (totaal - k.vastBedragTot) * k.afbouwPct)
}

export type FiscaleInvoer = {
  /** Fiscaal loon uit dienstbetrekking (jaar) */
  loon: number
  /** Winst vóór ondernemersaftrek en MKB-vrijstelling, ná KIA niet — KIA apart */
  winst: number
  /** Totaal geïnvesteerd in bedrijfsmiddelen ≥ €450 */
  investeringen: number
  /** Voldoet aan urencriterium + grotendeelscriterium */
  urencriterium: boolean
  /** Startersaftrek van toepassing (alleen met urencriterium) */
  starter: boolean
}

export type FiscaleUitkomst = {
  kia: number
  zelfstandigenaftrek: number
  startersaftrek: number
  winstNaOndernemersaftrek: number
  mkbVrijstelling: number
  belastbareWinst: number
  verzamelinkomen: number
  box1Belasting: number
  tariefsaanpassing: number
  algemeneHeffingskorting: number
  arbeidskorting: number
  inkomstenbelasting: number
  zvw: number
  totaal: number
}

export function berekenInkomstenbelasting(inv: FiscaleInvoer, t: FiscaleTarieven): FiscaleUitkomst {
  const kia = berekenKia(inv.investeringen, t)
  const winstNaKia = inv.winst - kia

  // Ondernemersaftrek (alleen bij urencriterium) kan geen verlies veroorzaken
  const za = inv.urencriterium ? Math.min(t.zelfstandigenaftrek, Math.max(0, winstNaKia)) : 0
  const sa = inv.urencriterium && inv.starter ? Math.min(t.startersaftrek, Math.max(0, winstNaKia - za)) : 0
  const winstNaOndernemersaftrek = winstNaKia - za - sa

  const mkbVrijstelling = winstNaOndernemersaftrek * t.mkbWinstvrijstellingPct
  const belastbareWinst = winstNaOndernemersaftrek - mkbVrijstelling

  const verzamelinkomen = Math.max(0, inv.loon + belastbareWinst)
  const box1Belasting = belastingBox1(verzamelinkomen, t)

  // Aftrekposten werken maximaal tegen het tarief van schijf 2
  const topGrens = t.box1[t.box1.length - 2]?.tot ?? Infinity
  const topTarief = t.box1[t.box1.length - 1].tarief
  const aftrekposten = za + sa + Math.max(0, mkbVrijstelling)
  const inTopSchijf = Math.max(0, verzamelinkomen - topGrens)
  const tariefsaanpassing = Math.min(aftrekposten, inTopSchijf) * (topTarief - t.aftrekTariefMax)

  const ahk = algemeneHeffingskorting(verzamelinkomen, t)
  // Arbeidsinkomen: loon + winst na ondernemersaftrek (vóór MKB-vrijstelling)
  const ak = arbeidskorting(inv.loon + Math.max(0, winstNaOndernemersaftrek), t)

  const inkomstenbelasting = Math.max(0, box1Belasting + tariefsaanpassing - ahk - ak)

  // Zvw: loon met werkgeversheffing telt eerst mee voor het maximum
  const zvwGrondslag = Math.min(Math.max(0, belastbareWinst), Math.max(0, t.zvw.maxBijdrageInkomen - inv.loon))
  const zvw = zvwGrondslag * t.zvw.pct

  return {
    kia: r2(kia),
    zelfstandigenaftrek: r2(za),
    startersaftrek: r2(sa),
    winstNaOndernemersaftrek: r2(winstNaOndernemersaftrek),
    mkbVrijstelling: r2(mkbVrijstelling),
    belastbareWinst: r2(belastbareWinst),
    verzamelinkomen: r2(verzamelinkomen),
    box1Belasting: r2(box1Belasting),
    tariefsaanpassing: r2(tariefsaanpassing),
    algemeneHeffingskorting: r2(ahk),
    arbeidskorting: r2(ak),
    inkomstenbelasting: r2(inkomstenbelasting),
    zvw: r2(zvw),
    totaal: r2(inkomstenbelasting + zvw),
  }
}

/**
 * Belasting die door de onderneming ontstaat: IB+Zvw met winst minus IB zonder winst.
 * Dit is het bedrag dat je apart moet zetten; je werkgever houdt het niet in.
 */
export function belastingDoorOnderneming(inv: FiscaleInvoer, t: FiscaleTarieven) {
  const met = berekenInkomstenbelasting(inv, t)
  const zonder = berekenInkomstenbelasting({ ...inv, winst: 0, investeringen: 0 }, t)
  const extra = met.totaal - zonder.totaal
  return {
    met,
    zonder,
    extra: r2(Math.max(0, extra)),
    effectiefPct: inv.winst > 0 ? extra / inv.winst : 0,
  }
}
