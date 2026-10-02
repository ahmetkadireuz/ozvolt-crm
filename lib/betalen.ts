import QRCode from 'qrcode'

/* ============================================================
   Betalen via bankoverschrijving naar de zakelijke rekening
   (ABN AMRO). Rekeningnummer komt uit BEDRIJF_IBAN / BEDRIJF_BIC.
   Een overschrijving is in Nederland binnen enkele seconden
   binnen (instant payments); iDEAL via Moneybird wordt pas na
   ± 2 werkdagen uitbetaald. Tikkie staat in lib/tikkie.ts.
   ============================================================ */

export const BEDRIJF = {
  naam: 'Ozvolt Elektrotechniek',
  // Bewust geen fallback naar een oud nummer: liever geen IBAN tonen dan een verkeerde
  iban: (process.env.BEDRIJF_IBAN ?? '').replace(/\s+/g, '').toUpperCase(),
  bic: (process.env.BEDRIJF_BIC || 'ABNANL2A').replace(/\s+/g, '').toUpperCase(),
}

let _ibanGemeld = false

/** true als BEDRIJF_IBAN is ingesteld; logt anders (eenmalig) een duidelijke fout */
export function ibanAanwezig() {
  if (BEDRIJF.iban) return true
  if (!_ibanGemeld) {
    console.error('[betalen] BEDRIJF_IBAN ontbreekt: IBAN en betaal-QR worden niet getoond. Stel BEDRIJF_IBAN in (Vercel → Environment Variables).')
    _ibanGemeld = true
  }
  return false
}

/** IBAN in groepjes van 4 (NL00 ABNA 0123 4567 89); leeg als er geen IBAN is ingesteld */
export function ibanLeesbaar(iban = BEDRIJF.iban) {
  return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

/** iDEAL via Moneybird alleen tonen als dat expliciet aanstaat (BETAAL_IDEAL=aan) */
export function idealAan() {
  return (process.env.BETAAL_IDEAL ?? '').toLowerCase() === 'aan'
}

/**
 * EPC-QR (SEPA Credit Transfer). Scanbaar met de apps van de meeste Nederlandse banken:
 * de overschrijving staat dan al klaar met bedrag en kenmerk.
 */
export function epcPayload(bedrag: number, kenmerk: string) {
  return [
    'BCD',
    '002',
    '1',
    'SCT',
    BEDRIJF.bic,
    BEDRIJF.naam.slice(0, 70),
    BEDRIJF.iban,
    `EUR${bedrag.toFixed(2)}`,
    '',
    '',
    kenmerk.slice(0, 140),
  ].join('\n')
}

export async function betaalQrSvg(bedrag: number, kenmerk: string) {
  if (!ibanAanwezig()) return null
  if (!(bedrag > 0) || bedrag > 999_999_999) return null
  return QRCode.toString(epcPayload(bedrag, kenmerk), { type: 'svg', errorCorrectionLevel: 'M', margin: 1, width: 180 })
}

/** QR-code (svg) van een willekeurige link, bv. een Tikkie */
export async function linkQrSvg(url: string) {
  return QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, width: 180 })
}
