'use client'

import { useState } from 'react'

export default function AccepteerKnop({ offerteId, totaal }: { offerteId: number; totaal: string }) {
  const [naam, setNaam] = useState('')
  const [bezig, setBezig] = useState(false)
  const [geaccepteerd, setGeaccepteerd] = useState(false)
  const [error, setError] = useState('')

  async function accepteer() {
    if (!naam.trim()) { setError('Vul uw naam in om te accepteren'); return }
    setBezig(true)
    setError('')
    const res = await fetch(`/api/offertes/${offerteId}/accepteren-klant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ naam }),
    })
    if (res.ok) {
      setGeaccepteerd(true)
      setTimeout(() => window.location.reload(), 2500)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data?.error ?? 'Er is iets misgegaan. Probeer het opnieuw.')
    }
    setBezig(false)
  }

  if (geaccepteerd) {
    return (
      <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', textAlign: 'center' }}>
        <div style={{ fontSize: 28 }}>✅</div>
        <div style={{ fontWeight: 700, color: '#15803d', marginTop: 8 }}>Offerte geaccepteerd!</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>U ontvangt een bevestiging per e-mail.</div>
      </div>
    )
  }

  return (
    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
      <p style={{ margin: '0 0 16px', fontWeight: 600, fontSize: 14, color: '#0d1b3e' }}>
        Offerte accepteren — {totaal}
      </p>
      <input
        type="text"
        placeholder="Uw volledige naam"
        value={naam}
        onChange={e => setNaam(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8,
          border: '1px solid #cbd5e1', fontSize: 14,
          outline: 'none', marginBottom: 12,
          fontFamily: 'Inter, sans-serif',
        }}
      />
      {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 8px' }}>{error}</p>}
      <button
        onClick={accepteer}
        disabled={bezig}
        style={{
          width: '100%', padding: '12px', borderRadius: 8,
          background: bezig ? '#94a3b8' : '#0d1b3e',
          color: '#fff', fontWeight: 700, fontSize: 14,
          border: 'none', cursor: bezig ? 'wait' : 'pointer',
        }}
      >
        {bezig ? 'Bezig...' : 'Offerte digitaal accepteren'}
      </button>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '10px 0 0', textAlign: 'center' }}>
        Door te accepteren gaat u akkoord met de offerte en geplande werkzaamheden.
      </p>
    </div>
  )
}
