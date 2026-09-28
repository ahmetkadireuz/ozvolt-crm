import { sql } from '@/lib/db'
import { mbHaalOfMaakContact, mbMaakFactuur, mbVerstuurFactuur, mbHaalFactuur, mbBetaalUrl } from '@/lib/moneybird'

/* ============================================================
   Eén CRM-factuur = één Moneybird-factuur.
   Maakt de factuur aan als dat nog niet is gebeurd, zet hem op
   'verstuurd' (handmatig — Moneybird mailt niet zelf) en geeft
   de betaallink terug. Voorkomt dubbele omzet in de boekhouding.
   ============================================================ */

export async function zorgVoorMoneybirdFactuur(factuurId: number): Promise<{ moneybirdId: string; betaalUrl: string | null }> {
  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_tel, k.type AS klant_type
    FROM facturen f JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${factuurId}
  `
  const f = rows[0]
  if (!f) throw new Error('Factuur niet gevonden')

  let mb: any
  if (f.moneybird_id) {
    mb = await mbHaalFactuur(f.moneybird_id)
  } else {
    const contact = await mbHaalOfMaakContact({
      id: f.klant_id, naam: f.klant_naam, email: f.klant_email, telefoon: f.klant_tel, type: f.klant_type,
    })
    const regels = Array.isArray(f.regels) ? f.regels : []
    mb = await mbMaakFactuur({
      contactId: contact.id,
      factuurNummer: f.factuurnummer,
      factuurdatum: f.factuurdatum,
      betalingstermijn: f.betalingstermijn ?? 14,
      // De CRM rekent met één btw-percentage per factuur — Moneybird moet hetzelfde totaal tonen
      regels: regels.map((r: any) => ({
        omschrijving: r.omschrijving,
        aantal: Number(r.aantal),
        prijs: Number(r.prijs),
        btw: Number(f.btw_pct ?? 21),
      })),
      notities: f.notities,
    })
    await sql`UPDATE facturen SET moneybird_id = ${String(mb.id)}, moneybird_url = ${mb.url ?? null} WHERE id = ${factuurId}`
  }

  // Concept in Moneybird telt niet mee in de boekhouding en heeft geen werkende betaallink
  if (mb?.state === 'draft') {
    mb = await mbVerstuurFactuur(String(mb.id)) ?? await mbHaalFactuur(String(mb.id))
  }

  return { moneybirdId: String(mb.id), betaalUrl: mbBetaalUrl(mb) }
}
