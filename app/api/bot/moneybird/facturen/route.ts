import { NextRequest } from 'next/server'
import { mbLijst } from '@/lib/moneybird'
import { botAuth, botJson, botAlleenLezen, lijstParams, rond } from '@/lib/bot-auth'
import { periodeFilter, verkoopFactuur, OPEN_STATES, mbFout } from '@/lib/bot-moneybird'

export const dynamic = 'force-dynamic'

const STATUS_FILTER: Record<string, (s: string) => boolean> = {
  open: s => OPEN_STATES.has(s),
  te_laat: s => s === 'late',
  betaald: s => s === 'paid',
  concept: s => s === 'draft',
}

// GET /api/bot/moneybird/facturen?van=&tot=&status=open|te_laat|betaald|concept&zoek=&limit=
// Verkoopfacturen uit Moneybird (standaard het lopende jaar), nieuwste eerst, met open posten.
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req, 'finance')
  if (geweigerd) return geweigerd

  const { zoek, limit, status, van, tot } = lijstParams(req)
  const periode = periodeFilter(van, tot)

  try {
    const alle = (await mbLijst<any>(`/sales_invoices?filter=${periode.filter}`, 10)).map(verkoopFactuur)
    const z = zoek.toLowerCase()
    const gefilterd = alle
      .filter(f => !status || !STATUS_FILTER[status] || STATUS_FILTER[status](f.status))
      .filter(f => !z || [f.klant, f.factuurnummer, f.referentie].some(v => v && String(v).toLowerCase().includes(z)))
      .sort((a, b) => String(b.factuurdatum ?? '').localeCompare(String(a.factuurdatum ?? '')))

    const open = alle.filter(f => f.open_post)
    return botJson({
      periode: { van: periode.van, tot: periode.tot },
      aantal: Math.min(gefilterd.length, limit),
      aantal_totaal: gefilterd.length,
      open_posten: {
        aantal: open.length,
        openstaand_totaal: rond(open.reduce((s, f) => s + f.openstaand, 0)),
        te_laat: open.filter(f => f.status === 'late').length,
      },
      facturen: gefilterd.slice(0, limit),
    })
  } catch (err) {
    console.error('[bot/moneybird/facturen] ophalen mislukt:', mbFout(err))
    return botJson({ fout: 'Moneybird ophalen mislukt', detail: mbFout(err) }, 502)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
