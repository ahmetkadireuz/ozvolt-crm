'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'
import { formatEuro } from '@/lib/utils'
import type { ProjectOfferte } from '@/lib/facturen'

const nr = (n: number) => `OZVT-${String(n).padStart(4, '0')}`

/** Conceptfactuur vullen met de regels (+ korting) van een offerte uit hetzelfde project. */
export default function RegelsUitOfferte({ factuurId, offertes, standaardId, heeftRegels }: {
  factuurId: number; offertes: ProjectOfferte[]; standaardId: number | null; heeftRegels: boolean
}) {
  const router = useRouter()
  const [gekozen, setGekozen] = useState(String(standaardId ?? offertes[0]?.id ?? ''))
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const offerte = offertes.find(o => String(o.id) === gekozen)

  async function overnemen() {
    if (!offerte) return
    const vragen: string[] = []
    if (heeftRegels) vragen.push(`De huidige regels van deze factuur worden vervangen door die van offerte ${nr(offerte.offertenummer)}.`)
    if (!offerte.geaccepteerd) vragen.push('Offerte is nog niet geaccepteerd.')
    if (vragen.length > 0 && !confirm(`${vragen.join(' ')} Doorgaan?`)) return
    setBezig(true)
    setFout(null)
    const res = await fetch(`/api/facturen/${factuurId}/uit-offerte`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerte_id: offerte.id }),
    })
    const data = await res.json().catch(() => ({}))
    setBezig(false)
    if (!res.ok) { setFout(data?.error ?? 'Overnemen mislukt'); return }
    // Formulier opnieuw opbouwen met de nieuwe regels
    window.location.reload()
  }

  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--accent)' }}>
      <div className="section-label">Regels uit offerte</div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-2)', margin: '0 0 10px' }}>
        {heeftRegels
          ? 'Neem de regels en korting van de offerte over; de huidige regels worden vervangen.'
          : 'Deze factuur heeft nog geen regels. Neem de regels en korting van de offerte van dit project over.'}
      </p>
      {fout && <div className="alert alert-err" style={{ fontSize: '.8rem', padding: '8px 12px' }}>{fout}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {offertes.length > 1 && (
          <select className="form-ctrl" style={{ flex: '1 1 220px' }} value={gekozen} onChange={e => setGekozen(e.target.value)}>
            {offertes.map(o => (
              <option key={o.id} value={o.id}>
                {nr(o.offertenummer)} — {formatEuro(o.inclBtw)} incl. btw{o.geaccepteerd ? ' · geaccepteerd' : ''}
              </option>
            ))}
          </select>
        )}
        <button type="button" className={`btn btn-sm ${heeftRegels ? 'btn-ghost' : 'btn-primary'}`} onClick={overnemen} disabled={!offerte || bezig}>
          <Icon name="file-text" size={15} />
          {bezig ? 'Overnemen…' : offertes.length > 1 ? 'Regels uit offerte overnemen'
            : `Regels uit offerte ${offerte ? nr(offerte.offertenummer) : ''} overnemen (${offerte ? formatEuro(offerte.inclBtw) : ''})`}
        </button>
      </div>
    </div>
  )
}
