'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  meerwerkId: number
  omschrijving: string
  bedrag: number
}

const eur = (n: number) => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function MeerwerkAccepteren({ meerwerkId, omschrijving, bedrag }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function accepteer() {
    if (!confirm(`Meerwerk "${omschrijving}" (${eur(bedrag)}) accepteren?`)) return
    setBusy(true)
    setError('')
    const res = await fetch('/api/klant/meerwerk/accepteren', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meerwerk_id: meerwerkId }),
    })
    setBusy(false)
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Accepteren mislukt — probeer het opnieuw.')
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        onClick={accepteer}
        disabled={busy}
        style={{ border: 'none', borderRadius: 8, padding: '7px 14px', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {busy ? 'Bezig…' : 'Akkoord'}
      </button>
      {error && <span style={{ fontSize: 11, color: '#c0392b', fontWeight: 600 }}>{error}</span>}
    </span>
  )
}
