'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

export default function KlantActions({ klant, klantId }: { klant: any; klantId: number }) {
  const router = useRouter()
  const [form, setForm] = useState({ naam: klant.naam, email: klant.email ?? '', telefoon: klant.telefoon ?? '', locatie: klant.locatie ?? '', type: klant.type ?? 'Particulier', status_notitie: klant.status_notitie ?? '' })
  const [saving, setSaving] = useState(false)
  const [portaalLink, setPortaalLink] = useState('')
  const [linkBezig, setLinkBezig] = useState(false)

  // Groenverklaring
  const gvFileRef = useRef<HTMLInputElement>(null)
  const [gvNaam, setGvNaam] = useState('')
  const [gvUploading, setGvUploading] = useState(false)
  const [gvOk, setGvOk] = useState(false)
  const [gvFout, setGvFout] = useState('')

  async function uploadGroenverklaring(file: File) {
    setGvUploading(true)
    setGvFout('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('klant_id', String(klantId))
    fd.append('naam', gvNaam || file.name)
    const res = await fetch('/api/groenverklaring', { method: 'POST', body: fd })
    if (res.ok) {
      setGvOk(true)
      setGvNaam('')
      setTimeout(() => setGvOk(false), 3000)
      router.refresh()
    } else {
      setGvFout('Upload mislukt')
    }
    setGvUploading(false)
  }

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
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(portaalLink); alert('Link gekopieerd!') }}
                style={{ flex: 1, padding: '7px', borderRadius: 6, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 12, cursor: 'pointer' }}
              >
                📋 Kopiëren
              </button>
              {klant.telefoon && (() => {
                const tel = (klant.telefoon ?? '').replace(/[^0-9+]/g, '')
                const waNum = tel.startsWith('0') ? '31' + tel.slice(1) : tel.replace(/^\+/, '')
                const waMsg = `Goedendag ${klant.naam.split(' ')[0]}, hier is Ozvolt Elektrotechniek. Via deze link kunt u uw dossier bekijken: ${portaalLink}`
                return (
                  <a
                    href={`https://wa.me/${waNum}?text=${encodeURIComponent(waMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex: 1, padding: '7px', borderRadius: 6, background: '#dcfce7', border: '1px solid #86efac', fontSize: 12, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', color: '#15803d', fontWeight: 600 }}
                  >
                    💬 WhatsApp
                  </a>
                )
              })()}
              {klant.email && (
                <a
                  href={`mailto:${klant.email}?subject=${encodeURIComponent('Uw dossier bij Ozvolt Elektrotechniek')}&body=${encodeURIComponent(`Goedendag ${klant.naam.split(' ')[0]},\n\nVia onderstaande link kunt u uw dossier bekijken:\n${portaalLink}\n\nMet vriendelijke groet,\nOzvolt Elektrotechniek`)}`}
                  style={{ flex: 1, padding: '7px', borderRadius: 6, background: '#dbeafe', border: '1px solid #93c5fd', fontSize: 12, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', color: '#1d4ed8', fontWeight: 600 }}
                >
                  ✉️ E-mail
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Groenverklaring / dossier */}
      <div className="card">
        <div className="section-label">Groenverklaring / dossier</div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
          Upload een PDF of document dat de klant kan downloaden in zijn portaal.
        </p>
        <div className="form-group">
          <label className="form-label">Documentnaam (optioneel)</label>
          <input
            className="form-ctrl"
            value={gvNaam}
            onChange={e => setGvNaam(e.target.value)}
            placeholder="bijv. Groenverklaring 2025"
          />
        </div>
        <input
          ref={gvFileRef}
          type="file"
          accept=".pdf,.doc,.docx,image/*"
          style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && uploadGroenverklaring(e.target.files[0])}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => gvFileRef.current?.click()}
          disabled={gvUploading}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <span className="nav-ico" style={{ fontSize: 16 }}>upload_file</span>
          {gvUploading ? 'Uploaden…' : 'Document uploaden'}
        </button>
        {gvOk && <p style={{ color: '#16a34a', fontSize: 12, margin: '6px 0 0' }}>✓ Document geüpload</p>}
        {gvFout && <p style={{ color: '#dc2626', fontSize: 12, margin: '6px 0 0' }}>{gvFout}</p>}
      </div>

      <button type="button" className="btn btn-danger btn-sm" onClick={deleteKlant} style={{ width: '100%', justifyContent: 'center' }}>
        <span className="nav-ico" style={{ fontSize: 16 }}>delete</span>
        Klant verwijderen
      </button>
    </div>
  )
}
