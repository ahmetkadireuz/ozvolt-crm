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

export function formatEuro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export type KlantFactuurVelden = {
  naam?: string | null
  locatie?: string | null
  factuur_naam?: string | null
  factuur_adres?: string | null
  factuur_postcode?: string | null
  factuur_plaats?: string | null
}

function leeg(v?: string | null) {
  return !v || !String(v).trim()
}

// Naam zoals die op de factuur hoort: factuurnaam wanneer ingevuld,
// anders de klantnaam.
export function factuurTenaamstelling(k: KlantFactuurVelden): string {
  return leeg(k.factuur_naam) ? String(k.naam ?? '') : String(k.factuur_naam).trim()
}

// Adresregels voor de factuur. Zijn de factuurvelden leeg, dan valt dit
// terug op `locatie`, zodat klanten zonder factuuradres blijven werken
// zoals voorheen.
export function factuurAdresRegels(k: KlantFactuurVelden): string[] {
  const straat = leeg(k.factuur_adres) ? '' : String(k.factuur_adres).trim()
  const postcodePlaats = [k.factuur_postcode, k.factuur_plaats]
    .filter(v => !leeg(v))
    .map(v => String(v).trim())
    .join(' ')

  if (straat || postcodePlaats) {
    return [straat, postcodePlaats].filter(Boolean)
  }
  return leeg(k.locatie) ? [] : String(k.locatie).split('\n').map(r => r.trim()).filter(Boolean)
}

// Zelfde adres als enkele string met regeleindes, voor de PDF-generator
// die zelf op \n splitst.
export function factuurAdresTekst(k: KlantFactuurVelden): string | null {
  const regels = factuurAdresRegels(k)
  return regels.length ? regels.join('\n') : null
}

// ── Documenttype offerte ────────────────────────────────────────────────────
// Grote klussen gaan als werkvoorstel naar de klant, kleine als offerte.
// De keuze staat per offerte in de database.

export type Documenttype = 'offerte' | 'werkvoorstel'

export function isWerkvoorstel(type?: string | null): boolean {
  return String(type ?? '').toLowerCase() === 'werkvoorstel'
}

// 'Offerte' of 'Werkvoorstel', voor koppen en onderwerpregels.
export function documentLabel(type?: string | null): string {
  return isWerkvoorstel(type) ? 'Werkvoorstel' : 'Offerte'
}

// Zelfde woord met kleine letter, voor midden in een zin.
export function documentLabelKlein(type?: string | null): string {
  return isWerkvoorstel(type) ? 'werkvoorstel' : 'offerte'
}

// Lidwoord + woord, bijvoorbeeld "uw werkvoorstel".
export function documentLabelBezit(type?: string | null): string {
  return `uw ${documentLabelKlein(type)}`
}
