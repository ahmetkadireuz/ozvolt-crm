export type RegelItem = {
  omschrijving: string
  aantal: number
  prijs: number
  btw: number
}

export function berekenTotalen(regels: RegelItem[], kortingPct: number, btwPct: number) {
  const subtotaal = regels.reduce((s, r) => s + Number(r.aantal) * Number(r.prijs), 0)
  const korting = subtotaal * (Number(kortingPct) / 100)
  const naTotaal = subtotaal - korting
  const btw = naTotaal * (Number(btwPct) / 100)
  const inclBtw = naTotaal + btw
  return { subtotaal, korting, naTotaal, btw, inclBtw }
}

export function formatEuro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}
