import { sql, berekenTotalen } from '@/lib/db'
import { idealAan } from '@/lib/betalen'
import { ensureTikkieKolommen, factuurBedragCenten, tikkieLinkMetAanmaken } from '@/lib/tikkie'

/* ============================================================
   Betaalknoppen op een offerte

   De knop op de offerte wijst naar de Tikkie van de factuur die bij
   de offerte hoort (facturen.offerte_id), niet meer naar een
   Moneybird-iDEAL-link op de offerte. Die oude links
   (offertes.betaal_url / betaal_url_2) gebruiken we alleen nog als
   iDEAL expliciet aanstaat (BETAAL_IDEAL=aan) en er geen Tikkie is.

   Alleen server-side aanroepen, en alleen nadat gecontroleerd is dat
   de bezoeker de offerte mag zien (geldig token of klantsessie).
   ============================================================ */

export type OfferteTermijn = {
  /** 'link' = knop; 'betaald' = ✓ Betaald; 'na_oplevering' = eindfactuur volgt; 'binnenkort' = factuur volgt */
  status: 'link' | 'betaald' | 'na_oplevering' | 'binnenkort'
  bedrag: number
  url?: string
  factuurnummer?: string
}

export type OfferteBetaling = {
  is50_50: boolean
  termijnen: OfferteTermijn[]
}

async function termijnVoorFactuur(f: any | undefined, bedragFallback: number, legacyUrl: string | null, leeg: OfferteTermijn['status']): Promise<OfferteTermijn> {
  if (!f || f.status === 'concept') {
    if (legacyUrl) return { status: 'link', bedrag: bedragFallback, url: legacyUrl }
    return { status: leeg, bedrag: bedragFallback }
  }
  const bedrag = factuurBedragCenten(f) / 100
  if (f.status === 'betaald') return { status: 'betaald', bedrag, factuurnummer: f.factuurnummer }
  const tikkie = await tikkieLinkMetAanmaken(f)
  // Tikkie gelukt → Tikkie; anders oude iDEAL-link (alleen als iDEAL aan staat);
  // anders de factuurpagina in het klantportaal (IBAN + QR)
  const url = tikkie ?? legacyUrl ?? `/klant/factuur/${f.id}`
  return { status: 'link', bedrag, url, factuurnummer: f.factuurnummer }
}

/** Bepaalt de betaalknoppen voor een offerte op basis van de bijbehorende facturen. */
export async function offerteBetaling(o: any): Promise<OfferteBetaling> {
  await ensureTikkieKolommen()
  const facturen = await sql`
    SELECT f.*, o.offertenummer
    FROM facturen f LEFT JOIN offertes o ON o.id = f.offerte_id
    WHERE f.offerte_id = ${o.id}
    ORDER BY f.id
  `
  const regels = Array.isArray(o.regels) ? o.regels : JSON.parse(o.regels ?? '[]')
  const totaal = berekenTotalen(regels, Number(o.korting_pct ?? 0), Number(o.btw_pct ?? 21)).inclBtw
  const ideal = idealAan()
  const legacy1: string | null = ideal ? (o.betaal_url ?? null) : null
  const legacy2: string | null = ideal ? (o.betaal_url_2 ?? null) : null

  const voorschot = facturen.find((f: any) => f.soort === 'voorschot')
  const eind = facturen.find((f: any) => f.soort === 'eind')
  const normaal = facturen.find((f: any) => (f.soort ?? 'normaal') === 'normaal')
  const is50_50 = !!o.betaling_50_50 || !!voorschot

  if (is50_50) {
    // Oude 50/50-factuur (twee termijnen op één factuur): geen Tikkie mogelijk → factuurpagina
    if (!voorschot && normaal && normaal.betaling_50_50) {
      const t1 = await termijnVoorFactuur(normaal, totaal / 2, legacy1, 'binnenkort')
      const t2 = await termijnVoorFactuur(normaal, totaal / 2, legacy2, 'na_oplevering')
      return { is50_50: true, termijnen: [{ ...t1, bedrag: totaal / 2 }, { ...t2, bedrag: totaal / 2 }] }
    }
    return {
      is50_50: true,
      termijnen: [
        await termijnVoorFactuur(voorschot, totaal / 2, legacy1, 'binnenkort'),
        await termijnVoorFactuur(eind, totaal / 2, legacy2, 'na_oplevering'),
      ],
    }
  }

  return { is50_50: false, termijnen: [await termijnVoorFactuur(normaal, totaal, legacy1, 'binnenkort')] }
}

/** Voor de offertemail: één directe betaallink als die er is (anders niets). */
export async function offerteMailBetaalUrl(o: any): Promise<string | undefined> {
  try {
    const b = await offerteBetaling(o)
    const t = b.termijnen[0]
    if (t?.status !== 'link' || !t.url) return undefined
    return t.url.startsWith('/') ? (process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl') + t.url : t.url
  } catch (err) {
    console.error('[offerte betaallink mail]', err)
    return idealAan() ? (o.betaal_url || undefined) : undefined
  }
}
