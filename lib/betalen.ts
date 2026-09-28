import QRCode from 'qrcode'

/* ============================================================
   Betalen via bankoverschrijving naar de Knab-rekening.
   Een overschrijving is in Nederland binnen enkele seconden
   binnen (instant payments); iDEAL via Moneybird wordt pas na
   ± 2 werkdagen uitbetaald.
   ============================================================ */

export const BEDRIJF = {
  naam: 'Ozvolt Elektrotechniek',
  iban: process.env.BEDRIJF_IBAN ?? 'NL69KNAB0780987179',
  bic: process.env.BEDRIJF_BIC ?? 'KNABNL2H',
}

/** IBAN in groepjes van 4: NL69 KNAB 0780 9871 79 */
export function ibanLeesbaar(iban = BEDRIJF.iban) {
  return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

/** iDEAL via Moneybird alleen tonen als dat expliciet aanstaat (BETAAL_IDEAL=aan) */
export function idealAan() {
  return (process.env.BETAAL_IDEAL ?? '').toLowerCase() === 'aan'
}

/**
 * EPC-QR (SEPA Credit Transfer). Scanbaar met o.a. de apps van ING, Knab, bunq,
 * ASN/SNS/RegioBank: de overschrijving staat dan al klaar met bedrag en kenmerk.
 */
export function epcPayload(bedrag: number, kenmerk: string) {
  return [
    'BCD',
    '002',
    '1',
    'SCT',
    BEDRIJF.bic,
    BEDRIJF.naam.slice(0, 70),
    BEDRIJF.iban.replace(/\s+/g, ''),
    `EUR${bedrag.toFixed(2)}`,
    '',
    '',
    kenmerk.slice(0, 140),
  ].join('\n')
}

export async function betaalQrSvg(bedrag: number, kenmerk: string) {
  if (!(bedrag > 0) || bedrag > 999_999_999) return null
  return QRCode.toString(epcPayload(bedrag, kenmerk), { type: 'svg', errorCorrectionLevel: 'M', margin: 1, width: 180 })
}
