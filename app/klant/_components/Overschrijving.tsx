'use client'

import { useState } from 'react'

type Props = {
  bedrag: string
  kenmerk: string
  iban: string
  tenaamstelling: string
  qrSvg: string | null
  titel?: string
}

// Directe overschrijving naar de zakelijke rekening: binnen enkele seconden binnen
export default function Overschrijving({ bedrag, kenmerk, iban, tenaamstelling, qrSvg, titel }: Props) {
  const [gekopieerd, setGekopieerd] = useState<string | null>(null)

  async function kopieer(label: string, waarde: string) {
    try {
      await navigator.clipboard.writeText(waarde)
      setGekopieerd(label)
      setTimeout(() => setGekopieerd(g => (g === label ? null : g)), 1600)
    } catch { /* klembord niet beschikbaar */ }
  }

  const rijen: { label: string; waarde: string; kopie: string }[] = [
    { label: 'IBAN', waarde: iban, kopie: iban.replace(/\s+/g, '') },
    { label: 'Ten name van', waarde: tenaamstelling, kopie: tenaamstelling },
    { label: 'Bedrag', waarde: bedrag, kopie: bedrag.replace(/[^\d,]/g, '') },
    { label: 'Omschrijving', waarde: kenmerk, kopie: kenmerk },
  ]

  return (
    <div className="kp-pay">
      <div className="kp-pay-head">
        <div>
          <div className="kp-pay-title">{titel ?? 'Betalen via uw bank-app'}</div>
          <div className="kp-pay-sub">Maak het bedrag over; het is binnen enkele seconden bij ons binnen.</div>
        </div>
      </div>
      <div className="kp-pay-body">
        <div className="kp-pay-rows">
          {rijen.map(r => (
            <div key={r.label} className="kp-pay-row">
              <div>
                <div className="kp-pay-label">{r.label}</div>
                <div className="kp-pay-value">{r.waarde}</div>
              </div>
              <button type="button" className="kp-copy" onClick={() => kopieer(r.label, r.kopie)} aria-label={`${r.label} kopiëren`}>
                {gekopieerd === r.label ? 'Gekopieerd ✓' : 'Kopieer'}
              </button>
            </div>
          ))}
          <p className="kp-pay-note">Vermeld de omschrijving, dan verwerken we uw betaling automatisch.</p>
        </div>
        {qrSvg && (
          <div className="kp-qr">
            <div className="kp-qr-img" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div className="kp-qr-text">Scan met de app van uw bank (o.a. ABN AMRO, ING, Rabobank, bunq, ASN, SNS)</div>
          </div>
        )}
      </div>
    </div>
  )
}
