'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Punt {
  omschrijving: string
  toelichting: string
  door: 'ozvolt' | 'klant' | 'gezamenlijk'
}

interface Props {
  klusId: number
  initialPunten: Punt[]
}

export default function PuntenEditor({ klusId, initialPunten }: Props) {
  const router = useRouter()
  const [punten, setPunten] = useState<Punt[]>(initialPunten)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  function update(i: number, field: keyof Punt, value: string) {
    setPunten(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function add() {
    setPunten(prev => [...prev, { omschrijving: '', toelichting: '', door: 'ozvolt' }])
  }

  function remove(i: number) {
    setPunten(prev => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portaal_punten: punten }),
    })
    setSaving(false)
    setOk(true)
    setTimeout(() => setOk(false), 3000)
    router.refresh()
  }

  return (
    <div className="card">
      <div className="section-label">Afspraken voor klant portaal</div>
      <p style={{ fontSize: '.78rem', color: '#8ba8c4', marginBottom: 12 }}>
        Alleen zichtbaar voor de klant in het portaal.
      </p>

      {punten.length === 0 && (
        <p style={{ fontSize: '.82rem', color: '#94a3b8', marginBottom: 12 }}>Nog geen afspraken toegevoegd.</p>
      )}

      {punten.map((p, i) => (
        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#0d1b3e', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 8 }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                className="form-ctrl"
                placeholder="Afspraak (bijv. Meterkast vervangen)"
                value={p.omschrijving}
                onChange={e => update(i, 'omschrijving', e.target.value)}
                style={{ fontWeight: 600 }}
              />
              <input
                className="form-ctrl"
                placeholder="Toelichting (optioneel)"
                value={p.toelichting}
                onChange={e => update(i, 'toelichting', e.target.value)}
                style={{ fontSize: '.8rem', borderStyle: 'dashed' }}
              />
              <select
                className="form-ctrl"
                value={p.door}
                onChange={e => update(i, 'door', e.target.value as Punt['door'])}
                style={{ fontSize: '.8rem', width: 180 }}
              >
                <option value="ozvolt">Door Ozvolt</option>
                <option value="klant">Door klant</option>
                <option value="gezamenlijk">Gezamenlijk</option>
              </select>
            </div>
            <button type="button" onClick={() => remove(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4, marginTop: 4 }}>
              <span className="nav-ico" style={{ fontSize: 16 }}>delete</span>
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-ghost btn-sm" onClick={add} style={{ marginBottom: 12 }}>
        <span className="nav-ico" style={{ fontSize: 15 }}>add</span>
        Afspraak toevoegen
      </button>

      {ok && <p style={{ color: '#16a34a', fontSize: 12, margin: '0 0 8px' }}>✓ Opgeslagen — zichtbaar in portaal</p>}

      <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}
        style={{ width: '100%', justifyContent: 'center' }}>
        {saving ? 'Opslaan…' : 'Opslaan in portaal'}
      </button>
    </div>
  )
}
