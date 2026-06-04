'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AfspraakItem {
  omschrijving: string
  toelichting?: string
  verantwoordelijke?: 'ozvolt' | 'klant' | ''
}

export default function AfspraakForm({ afspraak, klanten, afspraakId }: { afspraak: any; klanten: any[]; afspraakId: number }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  let initAfspraken: AfspraakItem[] = []
  if (Array.isArray(afspraak.afspraken)) initAfspraken = afspraak.afspraken
  else if (typeof afspraak.afspraken === 'string') { try { initAfspraken = JSON.parse(afspraak.afspraken) } catch {} }
  if (initAfspraken.length === 0) initAfspraken = [{ omschrijving: '', toelichting: '', verantwoordelijke: 'ozvolt' }]

  const [items, setItems] = useState<AfspraakItem[]>(initAfspraken)
  const [titel, setTitel] = useState(afspraak.titel ?? '')
  const [notities, setNotities] = useState(afspraak.notities ?? '')
  const [klantId, setKlantId] = useState(String(afspraak.klant_id))
  const [datum, setDatum] = useState(String(afspraak.datum).slice(0, 10))

  function updateItem(i: number, field: keyof AfspraakItem, value: string) {
    setItems(items.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }

  function addItem() {
    setItems([...items, { omschrijving: '', toelichting: '', verantwoordelijke: 'ozvolt' }])
  }

  function removeItem(i: number) {
    if (items.length === 1) return
    setItems(items.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/afspraken/${afspraakId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klant_id: klantId, datum, titel, afspraken: items, notities }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="section-label">Basisgegevens</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Klant</label>
            <select className="form-ctrl" value={klantId} onChange={e => setKlantId(e.target.value)}>
              {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Datum</label>
            <input className="form-ctrl" type="date" value={datum} onChange={e => setDatum(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Onderwerp / titel</label>
          <input className="form-ctrl" value={titel} onChange={e => setTitel(e.target.value)} placeholder="bijv. Meterkast renovatie" />
        </div>
      </div>

      <div className="card">
        <div className="section-label">Werkafspraken</div>
        <p style={{ fontSize: '.78rem', color: '#8ba8c4', marginBottom: 14 }}>Voeg per regel één afspraak toe. Geef aan wie verantwoordelijk is.</p>

        {items.map((item, i) => (
          <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1d2f4c', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 8 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <input
                  className="form-ctrl"
                  placeholder="Omschrijving afspraak"
                  value={item.omschrijving}
                  onChange={e => updateItem(i, 'omschrijving', e.target.value)}
                  style={{ fontWeight: 600, marginBottom: 6 }}
                />
                <input
                  className="form-ctrl"
                  placeholder="Toelichting / voorwaarden (optioneel)"
                  value={item.toelichting ?? ''}
                  onChange={e => updateItem(i, 'toelichting', e.target.value)}
                  style={{ fontSize: '.8rem', color: '#94a3b8', fontStyle: 'italic', borderStyle: 'dashed', marginBottom: 6 }}
                />
                <select
                  className="form-ctrl"
                  value={item.verantwoordelijke ?? ''}
                  onChange={e => updateItem(i, 'verantwoordelijke', e.target.value)}
                  style={{ fontSize: '.8rem', width: 180 }}
                >
                  <option value="">— Verantwoordelijke —</option>
                  <option value="ozvolt">Regelt Ozvolt</option>
                  <option value="klant">Regelt de klant</option>
                </select>
              </div>
              <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                style={{ background: 'none', border: 'none', cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: '#dc2626', padding: 4, opacity: items.length === 1 ? .3 : 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
              </button>
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Afspraak toevoegen
        </button>
      </div>

      <div className="card">
        <div className="section-label">Aanvullende opmerkingen</div>
        <textarea
          className="form-ctrl"
          value={notities}
          onChange={e => setNotities(e.target.value)}
          rows={3}
          style={{ resize: 'vertical' }}
          placeholder="Eventuele aanvullende informatie..."
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Opslaan…' : 'Opslaan'}
      </button>
    </form>
  )
}
