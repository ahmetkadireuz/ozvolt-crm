export type RegelItem = {
  omschrijving: string
  beschrijving?: string
  aantal: number
  prijs: number
  btw: number
}

export function berekenTotalen(regels: RegelItem[], kortingBedrag: number, btwPct: number) {
  const subtotaal = regels.reduce((s, r) => s + Number(r.aantal) * Number(r.prijs), 0)
  const korting = Math.min(Number(kortingBedrag), subtotaal)
  const naTotaal = subtotaal - korting
  const btw = naTotaal * (Number(btwPct) / 100)
  const inclBtw = naTotaal + btw
  return { subtotaal, korting, naTotaal, btw, inclBtw }
}

/** 50/50-betaalplan: twee termijnen incl. btw die samen exact het totaal zijn. */
export function betaalplanTermijnen(inclBtw: number): [number, number] {
  const eerste = Math.round((Number(inclBtw) / 2) * 100) / 100
  return [eerste, Math.round((Number(inclBtw) - eerste) * 100) / 100]
}

/**
 * Het betaalplan (in één keer / 50-50) ligt vast zodra er een factuur bij de offerte de deur uit is
 * (verstuurd, betaald of in Moneybird). Geeft de reden terug, of null als het nog gewijzigd mag worden.
 */
export function betaalplanVergrendeld(offerte: { status?: string | null }, facturen: { status?: string | null; moneybird_id?: unknown; in_moneybird?: unknown; factuurnummer?: string }[]): string | null {
  if (offerte.status === 'vervangen') return 'deze offerte is vervangen door een nieuwere versie'
  const verstuurd = facturen.find(f => (f.status ?? 'concept') !== 'concept' || f.moneybird_id || f.in_moneybird)
  return verstuurd ? `factuur ${verstuurd.factuurnummer ?? ''} bij deze offerte is al verstuurd`.replace('  ', ' ') : null
}

export function formatEuro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}
