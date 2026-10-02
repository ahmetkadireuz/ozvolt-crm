import { NextRequest } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { mbLijst } from '@/lib/moneybird'
import { botAuth, botJson, botAlleenLezen, parseRegels, rond, datumStr } from '@/lib/bot-auth'
import { crmStatusVoor, num, contactNaam, mbFout } from '@/lib/bot-moneybird'

export const dynamic = 'force-dynamic'

// GET /api/bot/moneybird/sync-status?jaar=2026 — CRM-facturen vs Moneybird: wat is gekoppeld,
// wat ontbreekt en waar verschillen status of bedrag. Alleen lezen; er wordt niets gesynchroniseerd.
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req, 'finance')
  if (geweigerd) return geweigerd

  const jaarRaw = req.nextUrl.searchParams.get('jaar') ?? ''
  const jaar = /^\d{4}$/.test(jaarRaw) ? parseInt(jaarRaw) : new Date().getFullYear()

  try {
    const [crmRows, laatsteRows] = await Promise.all([
      sql`
        SELECT f.id, f.factuurnummer, f.status, f.factuurdatum, f.regels, f.btw_pct, f.moneybird_id, k.naam AS klant_naam
        FROM facturen f JOIN klanten k ON k.id = f.klant_id
        WHERE EXTRACT(YEAR FROM f.factuurdatum) = ${jaar}
        ORDER BY f.factuurdatum DESC, f.id DESC
      `,
      sql`SELECT MAX(bijgewerkt_op) AS laatst FROM facturen WHERE moneybird_id IS NOT NULL`,
    ])
    const mb = await mbLijst<any>(`/sales_invoices?filter=period:${jaar}0101..${jaar}1231`, 10)
    const mbPerId = new Map(mb.map(f => [String(f.id), f]))

    const crm = crmRows.map((f: any) => {
      const t = berekenTotalen(parseRegels(f.regels), 0, Number(f.btw_pct ?? 21))
      return {
        id: f.id, factuurnummer: f.factuurnummer, status: f.status, factuurdatum: datumStr(f.factuurdatum),
        klant_naam: f.klant_naam, moneybird_id: f.moneybird_id ? String(f.moneybird_id) : null,
        totaal_incl_btw: rond(t.inclBtw),
      }
    })

    const gekoppeld = crm.filter(f => f.moneybird_id)
    const nietInMoneybird = crm.filter(f => !f.moneybird_id && f.status !== 'concept')
    const nietGevonden: any[] = []
    const statusVerschillen: any[] = []
    const bedragVerschillen: any[] = []

    for (const f of gekoppeld) {
      const m = mbPerId.get(f.moneybird_id!)
      if (!m) { nietGevonden.push({ id: f.id, factuurnummer: f.factuurnummer }); continue }
      const verwacht = crmStatusVoor(m.state)
      if (verwacht && verwacht !== f.status) {
        statusVerschillen.push({ id: f.id, factuurnummer: f.factuurnummer, crm_status: f.status, moneybird_status: m.state })
      }
      const mbIncl = rond(num(m.total_price_incl_tax))
      if (Math.abs(mbIncl - f.totaal_incl_btw) > 0.01) {
        bedragVerschillen.push({ id: f.id, factuurnummer: f.factuurnummer, crm_incl_btw: f.totaal_incl_btw, moneybird_incl_btw: mbIncl })
      }
    }

    const gekoppeldeIds = new Set(gekoppeld.map(f => f.moneybird_id))
    const alleenInMoneybird = mb
      .filter(m => !gekoppeldeIds.has(String(m.id)))
      .map(m => ({
        moneybird_id: String(m.id), factuurnummer: m.invoice_id ?? null, klant: contactNaam(m.contact),
        factuurdatum: m.invoice_date ?? null, status: m.state, totaal_incl_btw: rond(num(m.total_price_incl_tax)),
      }))

    return botJson({
      jaar,
      laatst_bijgewerkte_gekoppelde_factuur: laatsteRows[0]?.laatst ?? null,
      crm_facturen: crm.length,
      moneybird_facturen: mb.length,
      gekoppeld: gekoppeld.length,
      niet_in_moneybird: nietInMoneybird.map(f => ({ id: f.id, factuurnummer: f.factuurnummer, status: f.status, klant_naam: f.klant_naam })),
      gekoppeld_maar_niet_gevonden: nietGevonden,
      status_verschillen: statusVerschillen,
      bedrag_verschillen: bedragVerschillen,
      alleen_in_moneybird: alleenInMoneybird,
      toelichting: 'Het CRM houdt geen apart sync-tijdstip bij; "laatst_bijgewerkte_gekoppelde_factuur" is de laatste wijziging van een factuur met Moneybird-koppeling. "Gekoppeld maar niet gevonden" kan ook een Moneybird-factuurdatum buiten het jaar zijn.',
    })
  } catch (err) {
    console.error('[bot/moneybird/sync-status] ophalen mislukt:', mbFout(err))
    return botJson({ fout: 'Ophalen mislukt', detail: mbFout(err) }, 502)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
