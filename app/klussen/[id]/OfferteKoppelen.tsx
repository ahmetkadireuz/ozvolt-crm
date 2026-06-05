'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  klusId: number
  offertes: { id: number; offertenummer: number }[]
}

export default function OfferteKoppelen({ klusId, offertes }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)

  async function koppel() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ koppel_offerte_id: selected }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="card">
      <div className="section-label">Bestaande offerte koppelen</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          className="form-ctrl"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          <option value="">— Kies offerte —</option>
          {offertes.map(o => (
            <option key={o.id} value={o.id}>
              OZVT-{String(o.offertenummer).padStart(4, '0')}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={koppel}
          disabled={!selected || saving}
        >
          {saving ? 'Bezig…' : 'Koppelen'}
        </button>
      </div>
    </div>
  )
}
