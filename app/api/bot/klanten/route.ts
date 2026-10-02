import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { botAuth, botJson, botAlleenLezen } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

// GET /api/bot/klanten?zoek=<tekst> — klanten zoeken incl. id's van hun offertes
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req)
  if (geweigerd) return geweigerd

  const sp = req.nextUrl.searchParams
  const zoek = (sp.get('zoek') ?? '').trim().slice(0, 100)
  const limitRaw = parseInt(sp.get('limit') ?? '20')
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 100)
  const patroon = zoek ? `%${zoek.replace(/[\\%_]/g, m => '\\' + m)}%` : null

  try {
    const rows = await sql`
      SELECT k.id, k.naam, k.locatie, k.type,
             COALESCE(
               (SELECT json_agg(o.id ORDER BY o.datum DESC, o.id DESC) FROM offertes o WHERE o.klant_id = k.id),
               '[]'::json
             ) AS offerte_ids
      FROM klanten k
      WHERE ${patroon}::text IS NULL OR k.naam ILIKE ${patroon} OR k.locatie ILIKE ${patroon}
      ORDER BY k.naam ASC
      LIMIT ${limit}
    `

    const klanten = rows.map((k: any) => ({
      id: k.id,
      naam: k.naam,
      plaats: k.locatie ?? null,
      type: k.type ?? null,
      offerte_ids: Array.isArray(k.offerte_ids) ? k.offerte_ids : [],
    }))

    return botJson({ aantal: klanten.length, klanten })
  } catch (err) {
    console.error('[bot/klanten] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
