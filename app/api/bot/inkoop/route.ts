import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { botAuth, botJson, botAlleenLezen, lijstParams, rond, datumStr, leeg } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

// GET /api/bot/inkoop?van=&tot=&klus_id=&zoek=&limit= — inkooplijsten (materiaal) met items, nieuwste eerst.
// van/tot filteren op de aanmaakdatum van de lijst.
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req)
  if (geweigerd) return geweigerd

  const { patroon, limit, van, tot, klusId } = lijstParams(req)

  try {
    // Inkooptabellen kunnen nog ontbreken → lege lijst
    const lijstRows = await sql`
      SELECT l.id, l.titel, l.aangemaakt_op, l.klus_id, l.klant_id,
             k.naam AS klant_naam, ks.type_werk AS klus_titel
      FROM inkoop_lijsten l
      LEFT JOIN klanten k ON k.id = l.klant_id
      LEFT JOIN klussen ks ON ks.id = l.klus_id
      WHERE (${van}::date IS NULL OR l.aangemaakt_op::date >= ${van}::date)
        AND (${tot}::date IS NULL OR l.aangemaakt_op::date <= ${tot}::date)
        AND (${klusId}::int IS NULL OR l.klus_id = ${klusId})
        AND (${patroon}::text IS NULL OR l.titel ILIKE ${patroon} OR k.naam ILIKE ${patroon}
             OR EXISTS (SELECT 1 FROM inkoop_items i WHERE i.lijst_id = l.id
                        AND (i.omschrijving ILIKE ${patroon} OR i.leverancier ILIKE ${patroon} OR i.artikelnummer ILIKE ${patroon})))
      ORDER BY l.aangemaakt_op DESC, l.id DESC
      LIMIT ${limit}
    `.catch(leeg)

    const ids = lijstRows.map((l: any) => l.id)
    const itemRows = ids.length
      ? await sql`
          SELECT lijst_id, omschrijving, artikelnummer, aantal, eenheid, leverancier, prijs_ex_btw, afgevinkt
          FROM inkoop_items WHERE lijst_id = ANY(${ids}::int[]) ORDER BY id ASC
        `
      : []

    const inkoop = lijstRows.map((l: any) => {
      const items = itemRows.filter((i: any) => i.lijst_id === l.id).map((i: any) => ({
        omschrijving: i.omschrijving,
        artikelnummer: i.artikelnummer ?? null,
        aantal: Number(i.aantal ?? 1),
        eenheid: i.eenheid ?? null,
        leverancier: i.leverancier ?? null,
        prijs_ex_btw: i.prijs_ex_btw !== null && i.prijs_ex_btw !== undefined ? Number(i.prijs_ex_btw) : null,
        afgevinkt: !!i.afgevinkt,
      }))
      return {
        id: l.id,
        titel: l.titel,
        aangemaakt_op: datumStr(l.aangemaakt_op),
        klus_id: l.klus_id ?? null,
        klus_titel: l.klus_titel ?? null,
        klant_id: l.klant_id ?? null,
        klant_naam: l.klant_naam ?? null,
        items,
        totaal_ex_btw: rond(items.reduce((s: number, i: any) => s + (i.prijs_ex_btw ?? 0) * i.aantal, 0)),
      }
    })

    return botJson({ aantal: inkoop.length, inkoop })
  } catch (err) {
    console.error('[bot/inkoop] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
