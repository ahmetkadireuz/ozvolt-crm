'use client'

import { useState } from 'react'

interface Props {
  factuurId: number
  totaal: string
  termijn?: 1 | 2
  label?: string
}

// iDEAL via Moneybird (optioneel; uitbetaling duurt ± 2 werkdagen)
export default function BetaalKnop({ factuurId, totaal, termijn, label }: Props) {
  const [bezig, setBezig] = useState(false)
  const [error, setError] = useState('')

  async function betaal() {
    setBezig(true)
    setError('')
    const qs = termijn ? `?termijn=${termijn}` : ''
    const res = await fetch(`/api/facturen/${factuurId}/betaal-link${qs}`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error ?? 'Betaallink kon niet worden aangemaakt.')
      setBezig(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={betaal} disabled={bezig} className="kp-btn kp-btn-ghost" style={{ width: '100%', cursor: bezig ? 'wait' : 'pointer' }}>
        {bezig ? 'Betaallink aanmaken…' : `${label ?? 'Betalen met iDEAL'} — ${totaal}`}
      </button>
      {error && <p style={{ color: 'var(--kp-red)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
