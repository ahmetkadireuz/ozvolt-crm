/* ============================================================
   Klant-matching zonder database: gedeeld door de server
   (lib/klanten.ts) en de klantzoeker in de browser, zodat de
   melding "Deze klant bestaat al" en de server dezelfde regels
   volgen.

   Dezelfde klant = gelijke naam (hoofdletters/spaties genegeerd),
   gelijk e-mailadres of gelijk telefoonnummer (laatste 9 cijfers,
   zodat 06…, +316… en 00316… gelijk zijn).
   ============================================================ */

export type KlantOptie = {
  id: number
  naam: string
  email?: string | null
  telefoon?: string | null
  locatie?: string | null
}

export type KlantInvoer = {
  naam?: string | null
  email?: string | null
  telefoon?: string | null
}

export function normNaam(s: string | null | undefined): string {
  return String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function normEmail(s: string | null | undefined): string {
  return String(s ?? '').trim().toLowerCase()
}

/** Laatste 9 cijfers van een telefoonnummer, of '' als het te kort is om op te matchen. */
export function normTelefoon(s: string | null | undefined): string {
  const cijfers = String(s ?? '').replace(/\D/g, '')
  return cijfers.length >= 9 ? cijfers.slice(-9) : ''
}

/** Zoekt in een lijst klanten naar dezelfde klant; e-mail en telefoon wegen zwaarder dan naam. */
export function zoekDubbeleKlant<T extends KlantOptie>(klanten: T[], inv: KlantInvoer): T | null {
  const naam = normNaam(inv.naam)
  const email = normEmail(inv.email)
  const tel = normTelefoon(inv.telefoon)
  if (email) {
    const k = klanten.find(k => normEmail(k.email) === email)
    if (k) return k
  }
  if (tel) {
    const k = klanten.find(k => normTelefoon(k.telefoon) === tel)
    if (k) return k
  }
  if (naam) {
    const k = klanten.find(k => normNaam(k.naam) === naam)
    if (k) return k
  }
  return null
}

/** Korte extra info om gelijke namen uit elkaar te houden: "e-mail · plaats". */
export function klantDetail(k: KlantOptie): string {
  return [k.email, k.locatie].filter(Boolean).join(' · ')
}
