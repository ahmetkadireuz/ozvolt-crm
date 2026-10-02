'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'

// Eenmalig: Tikkie laten melden aan het CRM wanneer er betaald is
export default function TikkieAbonneerKnop() {
  const [status, setStatus] = useState<'idle' | 'bezig' | 'ok' | 'fout'>('idle')
  const [melding, setMelding] = useState('')

  async function abonneer() {
    setStatus('bezig')
    const res = await fetch('/api/tikkie/abonneren', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { setStatus('ok'); setMelding('Betaalmeldingen staan aan.') }
    else { setStatus('fout'); setMelding(data.error ?? 'Aanzetten mislukt') }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={abonneer} disabled={status === 'bezig'}>
        <Icon name={status === 'ok' ? 'check' : 'bell'} size={15} />
        {status === 'bezig' ? 'Bezig…' : 'Betaalmeldingen aanzetten'}
      </button>
      {melding && <span style={{ fontSize: '.78rem', color: status === 'ok' ? '#16a34a' : '#dc2626' }}>{melding}</span>}
    </div>
  )
}
