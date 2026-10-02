import { NextRequest } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { botAuth, botJson, botAlleenLezen, parseId, parseRegels, offerteNummer, rond, datumStr, leeg } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

// GET /api/bot/klussen/[id] — één project met offertes, facturen, uren, kosten, inkoop en meerwerk (nacalculatie)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const geweigerd = botAuth(req)
  if (geweigerd) return geweigerd

  const klusId = parseId((await params).id)
  if (klusId === null) return botJson({ fout: 'Ongeldig id' }, 400)

  try {
    // Projectbeheer- en inkooptabellen worden lazy aangemaakt; ontbreken ze → leeg (de bot-API maakt niets aan)
    const [klusRows, offerteRows, factuurRows, urenRows, kostenRows, inkoopRows, meerwerkRows] = await Promise.all([
      sql`
        SELECT ks.*, k.naam AS klant_naam, k.locatie AS klant_locatie, k.type AS klant_type,
               k.email AS klant_email, k.telefoon AS klant_telefoon
        FROM klussen ks JOIN klanten k ON k.id = ks.klant_id
        WHERE ks.id = ${klusId}
      `,
      sql`SELECT id, offertenummer, status, datum, regels, korting_pct, btw_pct FROM offertes WHERE klus_id = ${klusId} ORDER BY datum DESC, id DESC`,
      sql`SELECT id, factuurnummer, status, factuurdatum, regels, btw_pct FROM facturen WHERE klus_id = ${klusId} ORDER BY factuurdatum DESC, id DESC`,
      sql`SELECT id, datum, uren, uurloon, omschrijving FROM project_uren WHERE klus_id = ${klusId} ORDER BY datum DESC, id DESC`.catch(leeg),
      sql`SELECT id, datum, categorie, leverancier, omschrijving, bedrag FROM kosten WHERE klus_id = ${klusId} ORDER BY datum DESC, id DESC`.catch(leeg),
      sql`
        SELECT l.id AS lijst_id, l.titel, l.aangemaakt_op,
               i.id AS item_id, i.omschrijving, i.artikelnummer, i.aantal, i.eenheid, i.leverancier, i.prijs_ex_btw, i.afgevinkt
        FROM inkoop_lijsten l LEFT JOIN inkoop_items i ON i.lijst_id = l.id
        WHERE l.klus_id = ${klusId}
        ORDER BY l.aangemaakt_op DESC, l.id DESC, i.id ASC
      `.catch(leeg),
      sql`SELECT id, omschrijving, bedrag, status, accepted_at, aangemaakt_op FROM project_meerwerk WHERE klus_id = ${klusId} ORDER BY aangemaakt_op DESC`.catch(leeg),
    ])

    const ks: any = klusRows[0]
    if (!ks) return botJson({ fout: 'Niet gevonden' }, 404)

    const offertes = offerteRows.map((o: any) => {
      const t = berekenTotalen(parseRegels(o.regels), Number(o.korting_pct ?? 0), Number(o.btw_pct ?? 21))
      return {
        id: o.id, offertenummer: offerteNummer(o.offertenummer), status: o.status, datum: datumStr(o.datum),
        totaal_ex_btw: rond(t.naTotaal), totaal_incl_btw: rond(t.inclBtw),
      }
    })
    const facturen = factuurRows.map((f: any) => {
      const t = berekenTotalen(parseRegels(f.regels), 0, Number(f.btw_pct ?? 21))
      return {
        id: f.id, factuurnummer: f.factuurnummer, status: f.status, betaald: f.status === 'betaald',
        factuurdatum: datumStr(f.factuurdatum), totaal_ex_btw: rond(t.naTotaal), totaal_incl_btw: rond(t.inclBtw),
      }
    })
    const uren = urenRows.map((u: any) => ({
      id: u.id, datum: datumStr(u.datum), uren: Number(u.uren), uurloon: Number(u.uurloon),
      omschrijving: u.omschrijving ?? null, bedrag: rond(Number(u.uren) * Number(u.uurloon)),
    }))
    const kosten = kostenRows.map((k: any) => ({
      id: k.id, datum: datumStr(k.datum), categorie: k.categorie, leverancier: k.leverancier ?? null,
      omschrijving: k.omschrijving, bedrag: Number(k.bedrag),
    }))

    const lijsten = new Map<number, any>()
    for (const r of inkoopRows as any[]) {
      let l = lijsten.get(r.lijst_id)
      if (!l) {
        l = { id: r.lijst_id, titel: r.titel, aangemaakt_op: datumStr(r.aangemaakt_op), items: [], totaal_ex_btw: 0 }
        lijsten.set(r.lijst_id, l)
      }
      if (r.item_id) {
        const aantal = Number(r.aantal ?? 1)
        const prijs = r.prijs_ex_btw !== null && r.prijs_ex_btw !== undefined ? Number(r.prijs_ex_btw) : null
        l.items.push({
          omschrijving: r.omschrijving, artikelnummer: r.artikelnummer ?? null, aantal, eenheid: r.eenheid ?? null,
          leverancier: r.leverancier ?? null, prijs_ex_btw: prijs, afgevinkt: !!r.afgevinkt,
        })
        if (prijs !== null) l.totaal_ex_btw = rond(l.totaal_ex_btw + aantal * prijs)
      }
    }
    const inkoop = Array.from(lijsten.values())

    const meerwerk = meerwerkRows.map((m: any) => ({
      id: m.id, omschrijving: m.omschrijving, bedrag: Number(m.bedrag), status: m.status,
      geaccepteerd_op: m.accepted_at ?? null,
    }))

    // Nacalculatie (alles excl. btw, behalve kosten: die staan in het CRM zonder btw-splitsing)
    const som = (arr: any[], f: (x: any) => number) => rond(arr.reduce((s, x) => s + f(x), 0))
    const omzetOffertes = som(offertes.filter(o => o.status === 'geaccepteerd'), o => o.totaal_ex_btw)
    const omzetMeerwerk = som(meerwerk.filter(m => m.status === 'geaccepteerd'), m => m.bedrag)
    const urenTotaal = som(uren, u => u.uren)
    const urenBedrag = som(uren, u => u.bedrag)
    const kostenTotaal = som(kosten, k => k.bedrag)
    const inkoopTotaal = som(inkoop, l => l.totaal_ex_btw)

    return botJson({
      id: ks.id,
      titel: ks.type_werk ?? null,
      status: ks.status,
      product: ks.product ?? null,
      omschrijving: ks.omschrijving ?? null,
      bron: ks.bron ?? null,
      notities_intern: ks.notities ?? null,
      aangemaakt_op: datumStr(ks.aangemaakt_op),
      klant: {
        id: ks.klant_id, naam: ks.klant_naam, plaats: ks.klant_locatie ?? null, type: ks.klant_type ?? null,
        email: ks.klant_email ?? null, telefoon: ks.klant_telefoon ?? null,
      },
      offertes,
      facturen,
      uren,
      kosten,
      inkoop,
      meerwerk,
      nacalculatie: {
        omzet_geaccepteerde_offertes_ex_btw: omzetOffertes,
        omzet_geaccepteerd_meerwerk: omzetMeerwerk,
        gefactureerd_ex_btw: som(facturen, f => f.totaal_ex_btw),
        uren_totaal: urenTotaal,
        uren_bedrag: urenBedrag,
        kosten_totaal: kostenTotaal,
        inkoop_totaal_ex_btw: inkoopTotaal,
        toelichting: 'Kosten en meerwerk staan in het CRM zonder btw-splitsing; inkoop telt alleen items met een prijs. Kosten en inkooplijsten kunnen overlappen.',
      },
    })
  } catch (err) {
    console.error('[bot/klussen/id] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
