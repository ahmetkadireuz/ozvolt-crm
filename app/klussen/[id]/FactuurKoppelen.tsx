'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  klusId: number
  facturen: { id: number; factuurnummer: string }[]
}

export default function FactuurKoppelen({ klusId, facturen }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)

  async function koppel() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ koppel_factuur_id: selected }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="card">
      <div className="section-label">Bestaande factuur koppelen</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          className="form-ctrl"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          <option value="">— Kies factuur —</option>
          {facturen.map(f => (
            <option key={f.id} value={f.id}>
              {f.factuurnummer}
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
