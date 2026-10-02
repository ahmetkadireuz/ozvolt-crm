'use client'

import { useState } from 'react'

// Kleine kopieerknop (o.a. IBAN/bedrag/kenmerk op de factuur in het klantportaal)
export default function KopieerKnop({ waarde, label, className }: { waarde: string; label: string; className?: string }) {
  const [klaar, setKlaar] = useState(false)

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(waarde)
      setKlaar(true)
      setTimeout(() => setKlaar(false), 1600)
    } catch { /* klembord niet beschikbaar */ }
  }

  return (
    <button type="button" className={className} onClick={kopieer} aria-label={`${label} kopiëren`}>
      {klaar ? 'Gekopieerd ✓' : 'Kopieer'}
    </button>
  )
}
