'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'

type AgendaItem = {
  id: number
  titel: string
  datum_start: string
  datum_eind: string | null
  notities: string | null
  status: string
  klant_id: number | null
  klus_id: number | null
  klant_naam: string | null
  klus_naam: string | null
}

const MAANDEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
const DAGEN = ['Ma','Di','Wo','Do','Vr','Za','Zo']

function formatDatum(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function AgendaClient({ items, klanten, klussen }: {
  items: AgendaItem[]
  klanten: any[]
  klussen: any[]
}) {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<AgendaItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [localItems, setLocalItems] = useState<AgendaItem[]>(items)
  const [form, setForm] = useState({
    titel: '', datum_start: '', datum_eind: '', notities: '', klant_id: '', klus_id: '', status: 'gepland'
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Eerste dag van de maand (0=zo → omzetten naar 0=ma)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const days: (Date | null)[] = Array(startDow).fill(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }

  function itemsOnDay(day: Date) {
    return localItems.filter(i => isSameDay(new Date(i.datum_start), day))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const { item } = await res.json()
        const klant = klanten.find(k => k.id === Number(form.klant_id))
        const klus = klussen.find(k => k.id === Number(form.klus_id))
        setLocalItems(prev => [...prev, { ...item, klant_naam: klant?.naam ?? null, klus_naam: klus?.type_werk ?? null }])
        setShowForm(false)
        setForm({ titel: '', datum_start: '', datum_eind: '', notities: '', klant_id: '', klus_id: '', status: 'gepland' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Afspraak verwijderen?')) return
    await fetch(`/api/agenda/${id}`, { method: 'DELETE' })
    setLocalItems(prev => prev.filter(i => i.id !== id))
    setSelected(null)
  }

  const statusColor: Record<string, string> = {
    gepland: '#3b82f6', voltooid: '#16a34a', geannuleerd: '#dc2626'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Agenda</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Icon name="plus" size={18} />
          Nieuwe afspraak
        </button>
      </div>

      {/* Kalender header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
            <Icon name="chevron-left" size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0d1b3e' }}>
            {MAANDEN[month]} {year}
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
            <Icon name="chevron-right" size={20} />
          </button>
        </div>

        {/* Dag headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DAGEN.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '.72rem', fontWeight: 700, color: '#8ba8c4', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Kalender grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const dayItems = itemsOnDay(day)
            const isToday = isSameDay(day, today)
            return (
              <div
                key={day.toISOString()}
                style={{
                  minHeight: 72,
                  borderRadius: 8,
                  padding: '6px 4px',
                  background: isToday ? '#eef2ff' : '#f8fafc',
                  border: isToday ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const ds = day.toISOString().slice(0, 16)
                  setForm(f => ({ ...f, datum_start: ds }))
                  setShowForm(true)
                }}
              >
                <div style={{ fontSize: '.75rem', fontWeight: isToday ? 800 : 600, color: isToday ? '#6366f1' : '#0d1b3e', marginBottom: 3 }}>
                  {day.getDate()}
                </div>
                {dayItems.slice(0, 3).map(item => (
                  <div
                    key={item.id}
                    style={{
                      fontSize: '.65rem', fontWeight: 600, padding: '2px 4px', borderRadius: 4, marginBottom: 2,
                      background: statusColor[item.status] ?? '#6366f1', color: '#fff',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                    onClick={e => { e.stopPropagation(); setSelected(item) }}
                  >
                    {item.titel}
                  </div>
                ))}
                {dayItems.length > 3 && (
                  <div style={{ fontSize: '.6rem', color: '#8ba8c4' }}>+{dayItems.length - 3} meer</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Aankomende afspraken */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: '.85rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Aankomende afspraken
        </h3>
        {localItems.filter(i => new Date(i.datum_start) >= today && i.status === 'gepland').length === 0 ? (
          <p style={{ color: '#8ba8c4', fontSize: '.9rem', margin: 0 }}>Geen aankomende afspraken.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {localItems
              .filter(i => new Date(i.datum_start) >= today && i.status === 'gepland')
              .sort((a, b) => new Date(a.datum_start).getTime() - new Date(b.datum_start).getTime())
              .slice(0, 10)
              .map(item => (
                <div
                  key={item.id}
                  className="card"
                  style={{ margin: 0, padding: '12px 16px', cursor: 'pointer', border: '1px solid #e2e8f0' }}
                  onClick={() => setSelected(item)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0d1b3e', marginBottom: 4 }}>{item.titel}</div>
                      <div style={{ fontSize: '.8rem', color: '#5b7fa6' }}>
                        <Icon name="clock" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {formatDatum(item.datum_start)}
                      </div>
                      {(item.klant_naam || item.klus_naam) && (
                        <div style={{ fontSize: '.8rem', color: '#8ba8c4', marginTop: 4 }}>
                          {item.klant_naam && <span>👤 {item.klant_naam}</span>}
                          {item.klus_naam && <span style={{ marginLeft: 8 }}>🔧 {item.klus_naam}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Detailpaneel */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelected(null)}>
          <div className="card" style={{ width: 400, margin: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0d1b3e' }}>{selected.titel}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <p style={{ fontSize: '.85rem', color: '#5b7fa6', margin: '0 0 8px' }}>
              <Icon name="clock" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {formatDatum(selected.datum_start)}
              {selected.datum_eind && ` → ${formatDatum(selected.datum_eind)}`}
            </p>
            {selected.klant_naam && <p style={{ fontSize: '.85rem', color: '#5b7fa6', margin: '0 0 8px' }}>👤 {selected.klant_naam}</p>}
            {selected.klus_naam && <p style={{ fontSize: '.85rem', color: '#5b7fa6', margin: '0 0 8px' }}>🔧 {selected.klus_naam}</p>}
            {selected.notities && <p style={{ fontSize: '.85rem', color: '#4a5568', margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>{selected.notities}</p>}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Verwijderen</button>
          </div>
        </div>
      )}

      {/* Formulier modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowForm(false)}>
          <div className="card" style={{ width: 480, margin: 0, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#0d1b3e' }}>Nieuwe afspraak</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Titel *</label>
                <input className="form-ctrl" required value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))} placeholder="Bijv. Klantbezoek, Installatie..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Begintijd *</label>
                  <input className="form-ctrl" type="datetime-local" required value={form.datum_start} onChange={e => setForm(f => ({ ...f, datum_start: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Eindtijd</label>
                  <input className="form-ctrl" type="datetime-local" value={form.datum_eind} onChange={e => setForm(f => ({ ...f, datum_eind: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Klant</label>
                <select className="form-ctrl" value={form.klant_id} onChange={e => setForm(f => ({ ...f, klant_id: e.target.value, klus_id: '' }))}>
                  <option value="">— Geen klant —</option>
                  {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
                </select>
              </div>
              {form.klant_id && (
                <div>
                  <label className="form-label">Klus</label>
                  <select className="form-ctrl" value={form.klus_id} onChange={e => setForm(f => ({ ...f, klus_id: e.target.value }))}>
                    <option value="">— Geen klus —</option>
                    {klussen.filter(k => k.klant_id === Number(form.klant_id)).map(k => (
                      <option key={k.id} value={k.id}>{k.type_werk || `Klus #${k.id}`}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="form-label">Notities</label>
                <textarea className="form-ctrl" rows={3} value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Annuleren</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
