'use client'

import { useState, useRef } from 'react'

export interface WaItem {
  omschrijving: string
  door: 'ozvolt' | 'klant' | 'gezamenlijk'
  toelichting: string
}

export interface Bijlage {
  naam: string
  url: string
  type: string
  grootte: number
}

interface Props {
  initialItems?: WaItem[]
  initialBijlagen?: Bijlage[]
  offerteId: number
  onChange?: (items: WaItem[], bijlagen: Bijlage[]) => void
}

const DOOR_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ozvolt:      { label: 'Ozvolt',      color: '#1b2d4a', bg: '#e8edf5' },
  klant:       { label: 'Klant',       color: '#7c3aed', bg: '#f3f0ff' },
  gezamenlijk: { label: 'Gezamenlijk', color: '#0f7a3a', bg: '#f0fdf4' },
}

export default function WerkafsprakenEditor({ initialItems = [], initialBijlagen = [], offerteId, onChange }: Props) {
  const [items, setItems] = useState<WaItem[]>(
    initialItems.length > 0 ? initialItems : []
  )
  const [bijlagen, setBijlagen] = useState<Bijlage[]>(initialBijlagen)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function updateItem(index: number, field: keyof WaItem, value: string) {
    const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    setItems(updated)
    onChange?.(updated, bijlagen)
  }

  function addItem() {
    const updated = [...items, { omschrijving: '', door: 'ozvolt' as const, toelichting: '' }]
    setItems(updated)
    onChange?.(updated, bijlagen)
  }

  function removeItem(index: number) {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
    onChange?.(updated, bijlagen)
  }

  async function uploadFile(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/offertes/${offerteId}/upload`, { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.bijlage) {
      const updated = [...bijlagen, data.bijlage]
      setBijlagen(updated)
      onChange?.(items, updated)
    } else {
      alert('Upload mislukt: ' + (data.error ?? 'Onbekend'))
    }
  }

  async function verwijderBijlage(url: string) {
    if (!confirm('Bijlage verwijderen?')) return
    await fetch(`/api/offertes/${offerteId}/upload`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const updated = bijlagen.filter(b => b.url !== url)
    setBijlagen(updated)
    onChange?.(items, updated)
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div>
      {/* Werkafspraken items */}
      <div style={{ marginBottom: 16 }}>
        {/* Kolomheader */}
        {items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 36px', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.06em' }}>Omschrijving</span>
            <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.06em' }}>Uitgevoerd door</span>
            <span />
          </div>
        )}

        {items.map((item, i) => (
          <div key={i} style={{ marginBottom: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 36px', gap: 6, alignItems: 'flex-start' }}>
              <div>
                <input
                  className="form-ctrl"
                  placeholder="Bijv. Meterkast vervangen"
                  value={item.omschrijving}
                  onChange={e => updateItem(i, 'omschrijving', e.target.value)}
                  style={{ padding: '7px 10px', fontWeight: 600, marginBottom: 4 }}
                />
                <input
                  className="form-ctrl"
                  placeholder="Toelichting (optioneel)"
                  value={item.toelichting}
                  onChange={e => updateItem(i, 'toelichting', e.target.value)}
                  style={{ padding: '5px 10px', fontSize: '.8rem', color: '#64748b', borderStyle: 'dashed' }}
                />
              </div>
              <select
                className="form-ctrl"
                value={item.door}
                onChange={e => updateItem(i, 'door', e.target.value)}
                style={{ padding: '7px 8px' }}
              >
                <option value="ozvolt">Ozvolt</option>
                <option value="klant">Klant</option>
                <option value="gezamenlijk">Gezamenlijk</option>
              </select>
              <button
                type="button"
                onClick={() => removeItem(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px', marginTop: 2 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
              </button>
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} style={{ marginTop: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Afspraak toevoegen
        </button>
      </div>

      {/* Bijlagen */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 6 }}>
        <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
          Bijlagen (KLIC, goedkeuringen, etc.)
        </div>

        {bijlagen.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#dc2626' }}>picture_as_pdf</span>
            <a href={b.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: '.82rem', fontWeight: 600, color: '#1b2d4a', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.naam}
            </a>
            <span style={{ fontSize: '.72rem', color: '#8ba8c4', whiteSpace: 'nowrap' }}>{formatBytes(b.grootte)}</span>
            <button type="button" onClick={() => verwijderBijlage(b.url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>
        ))}

        <input
          type="file"
          ref={fileRef}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload_file</span>
          {uploading ? 'Uploaden…' : 'Bijlage uploaden'}
        </button>
      </div>
    </div>
  )
}
