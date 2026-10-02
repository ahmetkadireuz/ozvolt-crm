import { NextRequest } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { botSleutelGeldig, botJson, botGeenToegang, botAlleenLezen, offerteNummer, parseRegels, rond, datumStr } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

// GET /api/bot/offertes?zoek=<tekst>&status=<status>&limit=<n> — alleen-lezen lijst voor de Claude-bots
export async function GET(req: NextRequest) {
  if (!botSleutelGeldig(req)) return botGeenToegang()

  const sp = req.nextUrl.searchParams
  const zoek = (sp.get('zoek') ?? '').trim().slice(0, 100)
  const status = (sp.get('status') ?? '').trim().slice(0, 30)
  const limitRaw = parseInt(sp.get('limit') ?? '20')
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 100)

  // "OZVT-0012", "0012" of "12" → zoek ook op offertenummer
  const nrMatch = zoek.match(/^(?:ozvt-?)?0*(\d+)$/i)
  const nummer = nrMatch ? parseInt(nrMatch[1]) : null
  const patroon = zoek ? `%${zoek.replace(/[\\%_]/g, m => '\\' + m)}%` : null

  try {
    const rows = await sql`
      SELECT o.id, o.offertenummer, o.status, o.datum, o.regels, o.korting_pct, o.btw_pct,
             k.id AS klant_id, k.naam AS klant_naam, ks.type_werk AS klus_titel
      FROM offertes o
      JOIN klanten k ON k.id = o.klant_id
      LEFT JOIN klussen ks ON ks.id = o.klus_id
      WHERE (${status || null}::text IS NULL OR o.status = ${status || null})
        AND (
          ${patroon}::text IS NULL
          OR k.naam ILIKE ${patroon}
          OR ks.type_werk ILIKE ${patroon}
          OR o.regels->0->>'omschrijving' ILIKE ${patroon}
          OR ('OZVT-' || LPAD(o.offertenummer::text, 4, '0')) ILIKE ${patroon}
          OR (${nummer}::int IS NOT NULL AND o.offertenummer = ${nummer})
        )
      ORDER BY o.datum DESC, o.id DESC
      LIMIT ${limit}
    `

    const offertes = rows.map((o: any) => {
      const regels = parseRegels(o.regels)
      const t = berekenTotalen(regels, Number(o.korting_pct ?? 0), Number(o.btw_pct ?? 21))
      return {
        id: o.id,
        offertenummer: offerteNummer(o.offertenummer),
        titel: o.klus_titel || regels[0]?.omschrijving || null,
        status: o.status,
        datum: datumStr(o.datum),
        klant_id: o.klant_id,
        klant_naam: o.klant_naam,
        totaal_ex_btw: rond(t.naTotaal),
        totaal_incl_btw: rond(t.inclBtw),
      }
    })

    return botJson({ aantal: offertes.length, offertes })
  } catch (err) {
    console.error('[bot/offertes] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
