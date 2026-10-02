import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { botAuth, botJson, botAlleenLezen, lijstParams, datumStr } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

// GET /api/bot/klussen?zoek=&status=&limit= — projecten (klussen), nieuwste eerst
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req)
  if (geweigerd) return geweigerd

  const { patroon, limit, status } = lijstParams(req)

  try {
    const rows = await sql`
      SELECT ks.id, ks.type_werk, ks.status, ks.product, ks.aangemaakt_op, ks.bijgewerkt_op,
             k.id AS klant_id, k.naam AS klant_naam, k.locatie AS klant_locatie,
             COALESCE((SELECT json_agg(o.id ORDER BY o.datum DESC, o.id DESC) FROM offertes o WHERE o.klus_id = ks.id), '[]'::json) AS offerte_ids,
             COALESCE((SELECT json_agg(f.id ORDER BY f.factuurdatum DESC, f.id DESC) FROM facturen f WHERE f.klus_id = ks.id), '[]'::json) AS factuur_ids
      FROM klussen ks
      JOIN klanten k ON k.id = ks.klant_id
      WHERE (${status}::text IS NULL OR ks.status = ${status})
        AND (${patroon}::text IS NULL OR k.naam ILIKE ${patroon} OR ks.type_werk ILIKE ${patroon}
             OR ks.omschrijving ILIKE ${patroon} OR ks.product ILIKE ${patroon})
      ORDER BY ks.aangemaakt_op DESC, ks.id DESC
      LIMIT ${limit}
    `

    const klussen = rows.map((r: any) => ({
      id: r.id,
      titel: r.type_werk ?? null,
      status: r.status,
      product: r.product ?? null,
      aangemaakt_op: datumStr(r.aangemaakt_op),
      klant_id: r.klant_id,
      klant_naam: r.klant_naam,
      plaats: r.klant_locatie ?? null,
      offerte_ids: Array.isArray(r.offerte_ids) ? r.offerte_ids : [],
      factuur_ids: Array.isArray(r.factuur_ids) ? r.factuur_ids : [],
    }))

    return botJson({ aantal: klussen.length, klussen })
  } catch (err) {
    console.error('[bot/klussen] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
