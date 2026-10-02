import { NextRequest } from 'next/server'
import { mbLijst } from '@/lib/moneybird'
import { botAuth, botJson, botAlleenLezen, rond } from '@/lib/bot-auth'
import { kwartaalPeriode, num, mbFout } from '@/lib/bot-moneybird'

export const dynamic = 'force-dynamic'

// GET /api/bot/moneybird/btw?kwartaal=2026-Q3 — btw-overzicht per kwartaal (standaard het lopende).
// Moneybird heeft geen btw-aangifte-endpoint in de API; het overzicht wordt samengesteld
// uit verkoopfacturen (af te dragen) en inkoopfacturen + bonnen (voorbelasting).
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req, 'finance')
  if (geweigerd) return geweigerd

  const p = kwartaalPeriode(req.nextUrl.searchParams.get('kwartaal'))

  try {
    const [verkoop, inkoop, bonnen] = await Promise.all([
      mbLijst<any>(`/sales_invoices?filter=${p.filter}`, 10),
      mbLijst<any>(`/documents/purchase_invoices?filter=${p.filter}`, 10),
      mbLijst<any>(`/documents/receipts?filter=${p.filter}`, 10),
    ])

    const definitief = verkoop.filter(f => f.state !== 'draft')
    const som = (docs: any[]) => {
      const excl = docs.reduce((s, d) => s + num(d.total_price_excl_tax), 0)
      const incl = docs.reduce((s, d) => s + num(d.total_price_incl_tax), 0)
      return { aantal: docs.length, totaal_ex_btw: rond(excl), btw: rond(incl - excl) }
    }
    const omzet = som(definitief)
    const inkoopSom = som(inkoop)
    const bonnenSom = som(bonnen)
    const voorbelasting = rond(inkoopSom.btw + bonnenSom.btw)

    return botJson({
      kwartaal: p.kwartaal,
      periode: { van: p.van, tot: p.tot },
      bron: 'samengesteld uit Moneybird-verkoopfacturen, inkoopfacturen en bonnen',
      omzet: { ...omzet, concepten_niet_meegeteld: verkoop.length - definitief.length },
      inkoop: { inkoopfacturen: inkoopSom, bonnen: bonnenSom },
      af_te_dragen_btw: omzet.btw,
      voorbelasting,
      saldo: rond(omzet.btw - voorbelasting),
      toelichting: 'Indicatie op factuur-/documentdatum. Verlegde btw, niet-aftrekbare btw en correcties staan hier niet apart in — controleer de aangifte in Moneybird.',
    })
  } catch (err) {
    console.error('[bot/moneybird/btw] ophalen mislukt:', mbFout(err))
    return botJson({ fout: 'Moneybird ophalen mislukt', detail: mbFout(err) }, 502)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
