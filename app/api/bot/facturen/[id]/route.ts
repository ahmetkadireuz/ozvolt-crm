import { NextRequest } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { botAuth, botJson, botAlleenLezen, parseId, parseRegels, rond, datumStr } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

// GET /api/bot/facturen/[id] — één CRM-factuur compleet, alleen-lezen
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const geweigerd = botAuth(req)
  if (geweigerd) return geweigerd

  const factuurId = parseId((await params).id)
  if (factuurId === null) return botJson({ fout: 'Ongeldig id' }, 400)

  try {
    const rows = await sql`
      SELECT f.*,
             (f.factuurdatum + COALESCE(f.betalingstermijn, 14) * INTERVAL '1 day')::date AS vervaldatum,
             k.naam AS klant_naam, k.locatie AS klant_locatie, k.type AS klant_type,
             k.email AS klant_email, k.telefoon AS klant_telefoon
      FROM facturen f
      JOIN klanten k ON k.id = f.klant_id
      WHERE f.id = ${factuurId}
    `
    const f: any = rows[0]
    if (!f) return botJson({ fout: 'Niet gevonden' }, 404)

    const btwPct = Number(f.btw_pct ?? 21)
    const ruweRegels = parseRegels(f.regels)
    const t = berekenTotalen(ruweRegels, 0, btwPct)

    return botJson({
      id: f.id,
      factuurnummer: f.factuurnummer,
      soort: f.soort ?? 'normaal',
      status: f.status,
      betaald: f.status === 'betaald',
      factuurdatum: datumStr(f.factuurdatum),
      leverdatum: datumStr(f.leverdatum),
      betalingstermijn_dagen: Number(f.betalingstermijn ?? 14),
      vervaldatum: datumStr(f.vervaldatum),
      in_moneybird: !!f.moneybird_id,
      notities: f.notities ?? null,
      regels: ruweRegels.map((r: any) => {
        const aantal = Number(r.aantal ?? 0)
        const prijs = Number(r.prijs ?? 0)
        return {
          omschrijving: r.omschrijving ?? '',
          beschrijving: r.beschrijving || null,
          aantal,
          prijs_ex_btw: prijs,
          btw_tarief: btwPct,
          regeltotaal_ex_btw: rond(aantal * prijs),
        }
      }),
      totalen: {
        totaal_ex_btw: rond(t.naTotaal),
        btw_pct: btwPct,
        btw: rond(t.btw),
        totaal_incl_btw: rond(t.inclBtw),
      },
      klant: {
        id: f.klant_id,
        naam: f.klant_naam,
        plaats: f.klant_locatie ?? null,
        type: f.klant_type ?? null,
        email: f.klant_email ?? null,
        telefoon: f.klant_telefoon ?? null,
      },
      klus_id: f.klus_id ?? null,
      offerte_id: f.offerte_id ?? null,
      gekoppelde_factuur_id: f.gekoppelde_factuur_id ?? null,
    })
  } catch (err) {
    console.error('[bot/facturen/id] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
