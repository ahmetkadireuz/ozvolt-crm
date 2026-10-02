import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { botAuth, botJson, botAlleenLezen, lijstParams, rond, datumStr } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

// GET /api/bot/kosten?van=&tot=&klus_id=&zoek=&limit= — kosten uit het CRM, nieuwste eerst
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req)
  if (geweigerd) return geweigerd

  const { patroon, limit, van, tot, klusId } = lijstParams(req)

  try {
    const [rows, som] = await Promise.all([
      sql`
        SELECT ko.id, ko.datum, ko.categorie, ko.leverancier, ko.omschrijving, ko.bedrag,
               ko.klus_id, ko.klant_id, k.naam AS klant_naam, ks.type_werk AS klus_titel
        FROM kosten ko
        LEFT JOIN klanten k ON k.id = ko.klant_id
        LEFT JOIN klussen ks ON ks.id = ko.klus_id
        WHERE (${van}::date IS NULL OR ko.datum >= ${van}::date)
          AND (${tot}::date IS NULL OR ko.datum <= ${tot}::date)
          AND (${klusId}::int IS NULL OR ko.klus_id = ${klusId})
          AND (${patroon}::text IS NULL OR ko.omschrijving ILIKE ${patroon} OR ko.leverancier ILIKE ${patroon}
               OR ko.categorie ILIKE ${patroon} OR k.naam ILIKE ${patroon})
        ORDER BY ko.datum DESC, ko.id DESC
        LIMIT ${limit}
      `,
      // Totaal over álle treffers (niet alleen de eerste `limit`)
      sql`
        SELECT COUNT(*)::int AS n, COALESCE(SUM(ko.bedrag), 0) AS totaal
        FROM kosten ko
        LEFT JOIN klanten k ON k.id = ko.klant_id
        WHERE (${van}::date IS NULL OR ko.datum >= ${van}::date)
          AND (${tot}::date IS NULL OR ko.datum <= ${tot}::date)
          AND (${klusId}::int IS NULL OR ko.klus_id = ${klusId})
          AND (${patroon}::text IS NULL OR ko.omschrijving ILIKE ${patroon} OR ko.leverancier ILIKE ${patroon}
               OR ko.categorie ILIKE ${patroon} OR k.naam ILIKE ${patroon})
      `,
    ])

    const kosten = rows.map((r: any) => ({
      id: r.id,
      datum: datumStr(r.datum),
      categorie: r.categorie,
      leverancier: r.leverancier ?? null,
      omschrijving: r.omschrijving,
      bedrag: Number(r.bedrag),
      klus_id: r.klus_id ?? null,
      klus_titel: r.klus_titel ?? null,
      klant_id: r.klant_id ?? null,
      klant_naam: r.klant_naam ?? null,
    }))

    return botJson({
      aantal: kosten.length,
      aantal_totaal: Number(som[0]?.n ?? 0),
      totaal_bedrag: rond(Number(som[0]?.totaal ?? 0)),
      toelichting: 'Bedragen zoals ingevoerd in het CRM (geen btw-splitsing).',
      kosten,
    })
  } catch (err) {
    console.error('[bot/kosten] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
