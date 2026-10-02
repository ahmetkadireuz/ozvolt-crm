'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'

// Opent het klantportaal zoals de klant het ziet (inloggen als klant via een portaallink).
// Het venster wordt direct bij de klik geopend: Safari op iPhone blokkeert vensters die pas na een netwerkverzoek openen.
export default function PortaalOpenKnop({ klantId, naar, label = 'Bekijk in klantportaal', className = 'btn btn-ghost btn-sm', style }: {
  klantId: number; naar?: string; label?: string; className?: string; style?: React.CSSProperties
}) {
  const [bezig, setBezig] = useState(false)

  async function open() {
    const venster = window.open('', '_blank')
    setBezig(true)
    try {
      const res = await fetch('/api/klant/sessie-aanmaken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klantId, naar }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.link) throw new Error(data.error ?? 'Onbekende fout')
      if (venster) venster.location.href = data.link
      else window.location.href = data.link
    } catch (err: any) {
      venster?.close()
      alert('Klantportaal openen mislukt: ' + (err?.message ?? 'Onbekende fout'))
    } finally {
      setBezig(false)
    }
  }

  return (
    <button type="button" className={className} style={style} onClick={open} disabled={bezig}>
      <Icon name="external" size={14} />
      {bezig ? 'Openen…' : label}
    </button>
  )
}
