import { NextRequest } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { botAuth, botJson, botAlleenLezen, lijstParams, parseRegels, rond, datumStr } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

// GET /api/bot/facturen?zoek=&status=&van=&tot=&klus_id=&limit= — CRM-facturen, nieuwste eerst
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req)
  if (geweigerd) return geweigerd

  const { patroon, limit, status, van, tot, klusId } = lijstParams(req)

  try {
    const rows = await sql`
      SELECT f.id, f.factuurnummer, f.status, f.factuurdatum, f.betalingstermijn, f.regels, f.btw_pct,
             f.klus_id, f.offerte_id, k.id AS klant_id, k.naam AS klant_naam,
             (f.factuurdatum + COALESCE(f.betalingstermijn, 14) * INTERVAL '1 day')::date AS vervaldatum
      FROM facturen f
      JOIN klanten k ON k.id = f.klant_id
      WHERE (${status}::text IS NULL OR f.status = ${status})
        AND (${van}::date IS NULL OR f.factuurdatum >= ${van}::date)
        AND (${tot}::date IS NULL OR f.factuurdatum <= ${tot}::date)
        AND (${klusId}::int IS NULL OR f.klus_id = ${klusId})
        AND (${patroon}::text IS NULL OR k.naam ILIKE ${patroon} OR f.factuurnummer ILIKE ${patroon})
      ORDER BY f.factuurdatum DESC, f.id DESC
      LIMIT ${limit}
    `

    const facturen = rows.map((f: any) => {
      const t = berekenTotalen(parseRegels(f.regels), 0, Number(f.btw_pct ?? 21))
      return {
        id: f.id,
        factuurnummer: f.factuurnummer,
        status: f.status,
        betaald: f.status === 'betaald',
        factuurdatum: datumStr(f.factuurdatum),
        vervaldatum: datumStr(f.vervaldatum),
        klant_id: f.klant_id,
        klant_naam: f.klant_naam,
        klus_id: f.klus_id ?? null,
        offerte_id: f.offerte_id ?? null,
        totaal_ex_btw: rond(t.naTotaal),
        totaal_incl_btw: rond(t.inclBtw),
      }
    })

    return botJson({ aantal: facturen.length, facturen })
  } catch (err) {
    console.error('[bot/facturen] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
