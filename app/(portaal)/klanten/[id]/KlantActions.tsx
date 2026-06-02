'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function KlantActions({ klant, klantId }: { klant: any; klantId: number }) {
  const router = useRouter()
  const [form, setForm] = useState({ naam: klant.naam, email: klant.email ?? '', telefoon: klant.telefoon ?? '', locatie: klant.locatie ?? '', type: klant.type ?? 'Particulier' })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/klanten/${klantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    router.refresh()
  }

  async function deleteKlant() {
    if (!confirm(`${klant.naam} verwijderen? Alle klussen, offertes en facturen worden ook verwijderd.`)) return
    await fetch(`/api/klanten/${klantId}`, { method: 'DELETE' })
    router.push('/klanten')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <div className="section-label">Gegevens bewerken</div>
        {[
          { label: 'Naam', key: 'naam', type: 'text' },
          { label: 'Telefoon', key: 'telefoon', type: 'tel' },
          { label: 'E-mail', key: 'email', type: 'email' },
          { label: 'Locatie', key: 'locatie', type: 'text' },
        ].map(f => (
          <div key={f.key} className="form-group">
            <label className="form-label">{f.label}</label>
            <input
              className="form-ctrl"
              type={f.type}
              value={(form as any)[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-ctrl" value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}>
            <option>Particulier</option>
            <option>Zakelijk</option>
          </select>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          {saving ? 'Opslaan…' : 'Wijzigingen opslaan'}
        </button>
      </div>

      <button type="button" className="btn btn-danger btn-sm" onClick={deleteKlant} style={{ width: '100%', justifyContent: 'center' }}>
        <span className="nav-ico" style={{ fontSize: 16 }}>delete</span>
        Klant verwijderen
      </button>
    </div>
  )
}
