import { NextRequest } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { parseUoItems } from '@/lib/uitgangspunten'
import { botAuth, botJson, botAlleenLezen, offerteNummer, parseRegels, rond, datumStr } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

// GET /api/bot/offertes/[id] — één offerte compleet, alleen-lezen
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const geweigerd = botAuth(req)
  if (geweigerd) return geweigerd

  const { id } = await params
  if (!/^\d+$/.test(id)) return botJson({ fout: 'Ongeldig id' }, 400)
  const offerteId = parseInt(id)

  try {
    const rows = await sql`
      SELECT o.*,
             k.naam AS klant_naam, k.locatie AS klant_locatie, k.type AS klant_type,
             k.email AS klant_email, k.telefoon AS klant_telefoon,
             ks.id AS project_id, ks.type_werk AS project_type_werk, ks.status AS project_status,
             ks.omschrijving AS project_omschrijving, ks.product AS project_product
      FROM offertes o
      JOIN klanten k ON k.id = o.klant_id
      LEFT JOIN klussen ks ON ks.id = o.klus_id
      WHERE o.id = ${offerteId}
    `
    const o: any = rows[0]
    if (!o) return botJson({ fout: 'Niet gevonden' }, 404)

    const btwPct = Number(o.btw_pct ?? 21)
    const korting = Number(o.korting_pct ?? 0)
    const ruweRegels = parseRegels(o.regels)
    const t = berekenTotalen(ruweRegels, korting, btwPct)

    const regels = ruweRegels.map((r: any) => {
      const aantal = Number(r.aantal ?? 0)
      const prijs = Number(r.prijs ?? 0)
      return {
        omschrijving: r.omschrijving ?? '',
        beschrijving: r.beschrijving || null,
        aantal,
        prijs_ex_btw: prijs,
        btw_tarief: r.btw !== undefined && r.btw !== null && r.btw !== '' ? Number(r.btw) : btwPct,
        regeltotaal_ex_btw: rond(aantal * prijs),
      }
    })

    const uo = parseUoItems(o.uo_items)
    const vijftigVijftig = !!o.betaling_50_50
    const betaalplan = vijftigVijftig
      ? {
          type: '50/50',
          termijnen: [
            { omschrijving: 'Eerste termijn (50%) bij akkoord', bedrag_incl_btw: rond(t.inclBtw / 2) },
            { omschrijving: 'Tweede termijn (50%) na oplevering', bedrag_incl_btw: rond(t.inclBtw - rond(t.inclBtw / 2)) },
          ],
        }
      : {
          type: 'volledig',
          termijnen: [{ omschrijving: 'Volledig bedrag', bedrag_incl_btw: rond(t.inclBtw) }],
        }

    return botJson({
      id: o.id,
      offertenummer: offerteNummer(o.offertenummer),
      titel: o.project_type_werk || ruweRegels[0]?.omschrijving || null,
      status: o.status,
      status_notitie: o.status_notitie ?? null,
      datum: datumStr(o.datum),
      geldig_tot: datumStr(o.geldig_tot),
      verstuurd_op: o.sent_at ?? null,
      geaccepteerd_op: o.accepted_at ?? null,
      geaccepteerd_door: o.accepted_name ?? null,
      notities_intern: o.notities ?? null,
      regels,
      uitgangspunten: uo.filter(i => i.soort === 'uitgangspunt').map(i => ({ titel: i.titel, tekst: i.tekst })),
      opties: uo.filter(i => i.soort === 'optie').map(i => ({ titel: i.titel, tekst: i.tekst, meerprijs_ex_btw: i.meerprijs })),
      betaalplan,
      totalen: {
        subtotaal_ex_btw: rond(t.subtotaal),
        korting: rond(t.korting),
        totaal_ex_btw: rond(t.naTotaal),
        btw_pct: btwPct,
        btw: rond(t.btw),
        totaal_incl_btw: rond(t.inclBtw),
      },
      klant: {
        id: o.klant_id,
        naam: o.klant_naam,
        plaats: o.klant_locatie ?? null,
        type: o.klant_type ?? null,
        email: o.klant_email ?? null,
        telefoon: o.klant_telefoon ?? null,
      },
      project: o.project_id
        ? {
            id: o.project_id,
            type_werk: o.project_type_werk ?? null,
            status: o.project_status ?? null,
            omschrijving: o.project_omschrijving ?? null,
            product: o.project_product ?? null,
          }
        : null,
    })
  } catch (err) {
    console.error('[bot/offertes/id] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
