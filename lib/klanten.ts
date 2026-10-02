import { sql } from '@/lib/db'
import { normEmail, normNaam, normTelefoon, zoekDubbeleKlant, type KlantOptie } from '@/lib/klant-match'

/* ============================================================
   Klanten: één plek om een klant te vinden of aan te maken.
   Gebruikt door klanten/nieuw, klussen/nieuw, offertes/nieuw,
   facturen/nieuw en het wijzigen van de klant van een project,
   zodat een bestaande klant nooit een tweede keer ontstaat.
   ============================================================ */

export type NieuweKlant = {
  naam?: string | null
  email?: string | null
  telefoon?: string | null
  locatie?: string | null
  type?: string | null
}

const leeg = (s: string | null | undefined) => {
  const t = String(s ?? '').trim()
  return t ? t : null
}

/** Bestaande klant met dezelfde naam, e-mail of telefoon (zie lib/klant-match.ts), of null. */
export async function zoekBestaandeKlant(inv: NieuweKlant): Promise<KlantOptie | null> {
  const naam = normNaam(inv.naam)
  const email = normEmail(inv.email)
  const tel = normTelefoon(inv.telefoon)
  if (!naam && !email && !tel) return null

  const rows = await sql`
    SELECT id, naam, email, telefoon, locatie FROM klanten
    WHERE (${naam} <> '' AND lower(regexp_replace(trim(naam), '\\s+', ' ', 'g')) = ${naam})
       OR (${email} <> '' AND lower(trim(email)) = ${email})
       OR (${tel} <> '' AND right(regexp_replace(COALESCE(telefoon, ''), '[^0-9]', '', 'g'), 9) = ${tel})
    ORDER BY id
  `
  return zoekDubbeleKlant(rows as KlantOptie[], inv)
}

/**
 * Geeft de bestaande klant terug als die er al is (lege velden worden aangevuld),
 * anders wordt een nieuwe klant aangemaakt. `bestaand` zegt welke van de twee.
 */
export async function vindOfMaakKlant(inv: NieuweKlant): Promise<{ id: number; naam: string; bestaand: boolean }> {
  const naam = leeg(inv.naam)
  const email = leeg(inv.email)
  const telefoon = leeg(inv.telefoon)
  const locatie = leeg(inv.locatie)

  const gevonden = await zoekBestaandeKlant({ naam, email, telefoon })
  if (gevonden) {
    // Alleen ontbrekende gegevens aanvullen; niets overschrijven
    await sql`
      UPDATE klanten SET
        email = COALESCE(NULLIF(email, ''), ${email}),
        telefoon = COALESCE(NULLIF(telefoon, ''), ${telefoon}),
        locatie = COALESCE(NULLIF(locatie, ''), ${locatie})
      WHERE id = ${gevonden.id}
    `
    return { id: gevonden.id, naam: gevonden.naam, bestaand: true }
  }

  if (!naam) throw new Error('Naam van de klant ontbreekt')
  const type = inv.type === 'Zakelijk' ? 'Zakelijk' : 'Particulier'
  const rows = await sql`
    INSERT INTO klanten (naam, email, telefoon, locatie, type)
    VALUES (${naam.slice(0, 255)}, ${email}, ${telefoon}, ${locatie}, ${type})
    RETURNING id, naam
  `
  return { id: rows[0].id, naam: rows[0].naam, bestaand: false }
}

/** Alle klanten voor de klantzoeker (met e-mail/plaats om gelijke namen te onderscheiden). */
export async function klantOpties(): Promise<KlantOptie[]> {
  const rows = await sql`SELECT id, naam, email, telefoon, locatie FROM klanten ORDER BY naam`
  return JSON.parse(JSON.stringify(rows))
}
