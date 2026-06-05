'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Item {
  omschrijving: string
  toelichting: string
  verantwoordelijke: 'ozvolt' | 'klant' | ''
}

interface Props {
  afspraakId: number
  klantId: number
  klusId: number
  initialItems: Item[]
  titel: string
  datum: string
}

export default function WerkafspraakInlineEditor({ afspraakId, klantId, klusId, initialItems, titel, datum }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(initialItems.length > 0)
  const [items, setItems] = useState<Item[]>(
    initialItems.length > 0 ? initialItems : [{ omschrijving: '', toelichting: '', verantwoordelijke: 'ozvolt' }]
  )
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }

  function addItem() {
    setItems(prev => [...prev, { omschrijving: '', toelichting: '', verantwoordelijke: 'ozvolt' }])
  }

  function removeItem(i: number) {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/afspraken/${afspraakId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klant_id: klantId, klus_id: klusId, datum, titel, afspraken: items }),
    })
    setSaving(false)
    setOk(true)
    setTimeout(() => setOk(false), 3000)
    router.refresh()
  }

  return (
    <div style={{ marginTop: 10 }}>
      {!open ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen(true)}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <span className="nav-ico" style={{ fontSize: 15 }}>edit</span>
          Werkafspraken invullen
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#1d2f4c', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 9 }}>{i + 1}</span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    className="form-ctrl"
                    placeholder="Omschrijving (bijv. Meterkast vervangen)"
                    value={item.omschrijving}
                    onChange={e => updateItem(i, 'omschrijving', e.target.value)}
                    style={{ fontWeight: 600 }}
                  />
                  <input
                    className="form-ctrl"
                    placeholder="Toelichting (optioneel)"
                    value={item.toelichting}
                    onChange={e => updateItem(i, 'toelichting', e.target.value)}
                    style={{ fontSize: '.8rem', borderStyle: 'dashed' }}
                  />
                  <select
                    className="form-ctrl"
                    value={item.verantwoordelijke}
                    onChange={e => updateItem(i, 'verantwoordelijke', e.target.value)}
                    style={{ fontSize: '.8rem', width: 180 }}
                  >
                    <option value="ozvolt">Regelt Ozvolt</option>
                    <option value="klant">Regelt de klant</option>
                    <option value="">Gezamenlijk</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4, opacity: items.length === 1 ? .3 : 1, marginTop: 4 }}
                >
                  <span className="nav-ico" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
            <span className="nav-ico" style={{ fontSize: 15 }}>add</span>
            Punt toevoegen
          </button>

          {ok && <p style={{ color: '#16a34a', fontSize: 12, margin: 0 }}>✓ Opgeslagen — zichtbaar in portaal</p>}

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={save}
              disabled={saving}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {saving ? 'Opslaan…' : 'Opslaan'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setOpen(false)}
              style={{ justifyContent: 'center' }}
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
