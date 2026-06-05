'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function KlantActions({ klant, klantId }: { klant: any; klantId: number }) {
  const router = useRouter()
  const [form, setForm] = useState({ naam: klant.naam, email: klant.email ?? '', telefoon: klant.telefoon ?? '', locatie: klant.locatie ?? '', type: klant.type ?? 'Particulier', status_notitie: klant.status_notitie ?? '' })
  const [saving, setSaving] = useState(false)
  const [portaalLink, setPortaalLink] = useState('')
  const [linkBezig, setLinkBezig] = useState(false)

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

  async function maakPortaalLink() {
    setLinkBezig(true)
    const res = await fetch('/api/klant/sessie-aanmaken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klantId }),
    })
    const data = await res.json()
    setPortaalLink(data.link ?? '')
    setLinkBezig(false)
  }

  async function deleteKlant() {
    if (!confirm(`${klant.naam} verwijderen? Alle klussen, offertes en facturen worden ook verwijderd.`)) return
    await fetch(`/api/klanten/${klantId}`, { method: 'DELETE' })
    router.refresh()
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
        <div className="form-group">
          <label className="form-label">Situatie / notitie</label>
          <textarea
            className="form-ctrl"
            rows={3}
            placeholder="bijv. Wachten op akkoord woningcorporatie..."
            value={form.status_notitie}
            onChange={e => setForm(prev => ({ ...prev, status_notitie: e.target.value }))}
            style={{ resize: 'vertical', fontSize: '.82rem' }}
          />
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          {saving ? 'Opslaan…' : 'Wijzigingen opslaan'}
        </button>
      </div>

      {/* Klantportaal link */}
      <div className="card">
        <div className="section-label">Klantportaal</div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
          Stuur de klant een beveiligde link zodat hij zijn dossier kan bekijken (geldig 30 dagen).
        </p>
        <button type="button" className="btn btn-primary btn-sm" onClick={maakPortaalLink} disabled={linkBezig} style={{ width: '100%', justifyContent: 'center' }}>
          {linkBezig ? 'Aanmaken...' : '🔗 Portaallink aanmaken'}
        </button>
        {portaalLink && (
          <div style={{ marginTop: 10 }}>
            <input
              readOnly
              value={portaalLink}
              onClick={e => (e.target as HTMLInputElement).select()}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(portaalLink); alert('Link gekopieerd!') }}
              style={{ marginTop: 6, width: '100%', padding: '7px', borderRadius: 6, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 12, cursor: 'pointer' }}
            >
              📋 Kopiëren
            </button>
          </div>
        )}
      </div>

      <button type="button" className="btn btn-danger btn-sm" onClick={deleteKlant} style={{ width: '100%', justifyContent: 'center' }}>
        <span className="nav-ico" style={{ fontSize: 16 }}>delete</span>
        Klant verwijderen
      </button>
    </div>
  )
}
