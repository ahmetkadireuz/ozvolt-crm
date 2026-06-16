'use client'

import { useState } from 'react'

interface Props {
  factuurId: number
  totaal: string
  termijn?: 1 | 2
  label?: string
}

export default function BetaalKnop({ factuurId, totaal, termijn, label }: Props) {
  const [bezig, setBezig] = useState(false)
  const [error, setError] = useState('')

  async function betaal() {
    setBezig(true)
    setError('')
    const qs = termijn ? `?termijn=${termijn}` : ''
    const res = await fetch(`/api/facturen/${factuurId}/betaal-link${qs}`, { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error ?? 'Betaallink kon niet worden aangemaakt.')
      setBezig(false)
    }
  }

  return (
    <div>
      <button
        onClick={betaal}
        disabled={bezig}
        style={{
          width: '100%', padding: 14, borderRadius: 8,
          background: bezig ? '#94a3b8' : '#16a34a',
          color: '#fff', fontWeight: 700, fontSize: 15,
          border: 'none', cursor: bezig ? 'wait' : 'pointer',
        }}
      >
        {bezig ? 'Betaallink aanmaken...' : `${label ?? '💳 Nu betalen'} — ${totaal}`}
      </button>
      {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
