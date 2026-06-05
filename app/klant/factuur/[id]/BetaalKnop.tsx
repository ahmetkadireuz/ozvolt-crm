'use client'

import { useState } from 'react'

export default function BetaalKnop({ factuurId, totaal }: { factuurId: number; totaal: string }) {
  const [bezig, setBezig] = useState(false)
  const [error, setError] = useState('')

  async function betaal() {
    setBezig(true)
    setError('')
    const res = await fetch(`/api/facturen/${factuurId}/betaal-link`, { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setError('Betaallink kon niet worden aangemaakt. Probeer het opnieuw.')
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
        {bezig ? 'Betaallink aanmaken...' : `💳 Nu betalen — ${totaal}`}
      </button>
      {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
