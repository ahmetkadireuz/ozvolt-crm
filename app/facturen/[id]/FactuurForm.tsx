'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RegelEditor from '@/components/RegelEditor'
import type { RegelItem } from '@/lib/db'

export default function FactuurForm({ factuur, klanten, factuurId }: { factuur: any; klanten: any[]; factuurId: number }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [regels, setRegels] = useState<RegelItem[]>(factuur.regels ?? [])
  const [btwPct, setBtwPct] = useState(Number(factuur.btw_pct))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    await fetch(`/api/facturen/${factuurId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        klant_id: fd.get('klant_id'),
        factuurdatum: fd.get('factuurdatum'),
        betalingstermijn: fd.get('betalingstermijn'),
        notities: fd.get('notities'),
        regels,
        btw_pct: btwPct,
      }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Gegevens</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Klant</label>
            <select className="form-ctrl" name="klant_id" defaultValue={factuur.klant_id}>
              {klanten.map((k: any) => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Factuurdatum</label>
            <input className="form-ctrl" type="date" name="factuurdatum" defaultValue={factuur.factuurdatum?.slice(0, 10)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Betalingstermijn (dagen)</label>
            <input className="form-ctrl" type="number" name="betalingstermijn" defaultValue={factuur.betalingstermijn ?? 14} min={1} max={90} />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
          <label className="form-label">Notities</label>
          <textarea className="form-ctrl" name="notities" defaultValue={factuur.notities ?? ''} rows={3} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Regeloverzicht</div>
        <RegelEditor
          initialRegels={factuur.regels ?? []}
          kortingBedrag={0}
          btwPct={Number(factuur.btw_pct)}
          onChange={(r, _k, b) => { setRegels(r); setBtwPct(b) }}
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        <span className="nav-ico" style={{ fontSize: 18 }}>save</span>
        {saving ? 'Opslaan…' : 'Factuur opslaan'}
      </button>
    </form>
  )
}
