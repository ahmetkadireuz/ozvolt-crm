import { NextRequest } from 'next/server'
import { mbLijst } from '@/lib/moneybird'
import { botAuth, botJson, botAlleenLezen, lijstParams, rond } from '@/lib/bot-auth'
import { periodeFilter, haalGrootboeken, inkoopDocument, mbFout } from '@/lib/bot-moneybird'

export const dynamic = 'force-dynamic'

// GET /api/bot/moneybird/inkoop?van=&tot=&soort=inkoopfactuur|bon&zoek=&limit=
// Inkoopfacturen en bonnetjes uit Moneybird (standaard het lopende jaar), nieuwste eerst.
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req, 'finance')
  if (geweigerd) return geweigerd

  const { sp, zoek, limit, van, tot } = lijstParams(req)
  const soort = sp.get('soort')
  const periode = periodeFilter(van, tot)

  try {
    const [grootboek, facturen, bonnen] = await Promise.all([
      haalGrootboeken(),
      soort === 'bon' ? Promise.resolve([]) : mbLijst<any>(`/documents/purchase_invoices?filter=${periode.filter}`, 10),
      soort === 'inkoopfactuur' ? Promise.resolve([]) : mbLijst<any>(`/documents/receipts?filter=${periode.filter}`, 10),
    ])

    const alle = [
      ...facturen.map(d => inkoopDocument(d, 'inkoopfactuur', grootboek)),
      ...bonnen.map(d => inkoopDocument(d, 'bon', grootboek)),
    ]
    const z = zoek.toLowerCase()
    const gefilterd = alle
      .filter(d => !z || [d.leverancier, d.referentie, ...d.regels.map((r: any) => r.omschrijving)].some(v => v && String(v).toLowerCase().includes(z)))
      .sort((a, b) => String(b.datum ?? '').localeCompare(String(a.datum ?? '')))

    return botJson({
      periode: { van: periode.van, tot: periode.tot },
      aantal: Math.min(gefilterd.length, limit),
      aantal_totaal: gefilterd.length,
      totaal_ex_btw: rond(gefilterd.reduce((s, d) => s + d.totaal_ex_btw, 0)),
      totaal_btw: rond(gefilterd.reduce((s, d) => s + d.btw, 0)),
      zonder_bijlage: gefilterd.filter(d => !d.heeft_bijlage).length,
      documenten: gefilterd.slice(0, limit),
    })
  } catch (err) {
    console.error('[bot/moneybird/inkoop] ophalen mislukt:', mbFout(err))
    return botJson({ fout: 'Moneybird ophalen mislukt', detail: mbFout(err) }, 502)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
