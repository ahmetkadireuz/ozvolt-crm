'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatEuro } from '@/lib/utils'
import type { SplitsingControle } from '@/lib/facturen'

/** Waarschuwing als de voorschotfactuur niet (meer) precies de helft is, met herstel in één stap. */
export default function SplitsingHerstellen({ factuurId, controle }: { factuurId: number; controle: SplitsingControle }) {
  const router = useRouter()
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  async function herstel() {
    if (!confirm(`Splitsing herstellen? Voorschotfactuur ${controle.voorschotNummer} wordt ${formatEuro(controle.voorschotHoort)} (50%) en eindfactuur ${controle.eindNummer} krijgt alle regels minus dat voorschot. Een eerder aangemaakte Tikkie voor het oude bedrag wordt niet meer getoond.`)) return
    setBezig(true)
    setFout(null)
    const res = await fetch(`/api/facturen/${factuurId}/50-50`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ herstel: true }),
    })
    const data = await res.json().catch(() => ({}))
    setBezig(false)
    if (!res.ok) { setFout(data?.error ?? 'Herstellen mislukt'); return }
    router.refresh()
  }

  return (
    <div className="alert alert-warn">
      <strong>De splitsing klopt niet meer.</strong>{' '}
      Voorschotfactuur {controle.voorschotNummer} staat op {formatEuro(controle.voorschotNu)} incl. btw, maar hoort{' '}
      {formatEuro(controle.voorschotHoort)} (50%) te zijn
      {Math.abs(controle.aftrekNu - controle.voorschotHoort) >= 0.005
        ? <>; op eindfactuur {controle.eindNummer} is {formatEuro(controle.aftrekNu)} als voorschot afgetrokken.</>
        : '.'}
      {controle.blokkade ? (
        <div style={{ fontWeight: 400, marginTop: 6 }}>Automatisch herstellen kan niet: {controle.blokkade}.</div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={herstel} disabled={bezig}>
            {bezig ? 'Herstellen…' : 'Splitsing herstellen'}
          </button>
        </div>
      )}
      {fout && <div style={{ marginTop: 8, fontWeight: 400 }}>{fout}</div>}
    </div>
  )
}
