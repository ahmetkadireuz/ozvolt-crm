'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'

type Kost = {
  id: number
  klant_id: number | null
  klus_id: number | null
  klant_naam: string | null
  klus_naam: string | null
  datum: string
  categorie: string
  leverancier: string | null
  omschrijving: string
  bedrag: number
}

const CATEGORIEEN = ['materiaal', 'transport', 'lead', 'software', 'overig']
const CAT_LABELS: Record<string, string> = {
  materiaal: 'Materiaal', transport: 'Transport', lead: 'Lead',
  software: 'Software', overig: 'Overig'
}
const CAT_COLORS: Record<string, string> = {
  materiaal: '#3b82f6', transport: '#f59e0b', lead: '#8b5cf6',
  software: '#06b6d4', overig: '#6b7280'
}

function euro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function KostenClient({ kosten, klanten, klussen }: {
  kosten: Kost[]; klanten: any[]; klussen: any[]
}) {
  const [items, setItems] = useState<Kost[]>(kosten)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'alles' | 'klus' | 'vast'>('alles')
  const [catFilter, setCatFilter] = useState('alles')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    datum: new Date().toISOString().slice(0, 10),
    categorie: 'materiaal',
    leverancier: '',
    omschrijving: '',
    bedrag: '',
    klant_id: '',
    klus_id: '',
    type: 'klus', // 'klus' of 'vast'
  })

  const visible = items
    .filter(k => filter === 'alles' ? true : filter === 'klus' ? k.klus_id !== null : k.klus_id === null)
    .filter(k => catFilter === 'alles' ? true : k.categorie === catFilter)

  const totaal = visible.reduce((s, k) => s + Number(k.bedrag), 0)
  const perCategorie = CATEGORIEEN.map(cat => ({
    cat, label: CAT_LABELS[cat],
    totaal: visible.filter(k => k.categorie === cat).reduce((s, k) => s + Number(k.bedrag), 0)
  })).filter(c => c.totaal > 0)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/kosten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          bedrag: parseFloat(form.bedrag),
          klant_id: form.klant_id || null,
          klus_id: form.type === 'klus' && form.klus_id ? form.klus_id : null,
        }),
      })
      if (res.ok) {
        const { kost } = await res.json()
        const klant = klanten.find(k => k.id === Number(form.klant_id))
        const klus = klussen.find(k => k.id === Number(form.klus_id))
        setItems(prev => [{ ...kost, klant_naam: klant?.naam ?? null, klus_naam: klus?.type_werk ?? null }, ...prev])
        setShowForm(false)
        setForm(f => ({ ...f, omschrijving: '', bedrag: '', leverancier: '', klant_id: '', klus_id: '' }))
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Kost verwijderen?')) return
    await fetch(`/api/kosten/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(k => k.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Kosten</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Icon name="plus" size={18} />
          Kost toevoegen
        </button>
      </div>

      {/* Totaal kaarten */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ margin: 0 }}>
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Totaal zichtbaar</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#dc2626' }}>{euro(totaal)}</div>
        </div>
        {perCategorie.map(c => (
          <div key={c.cat} className="card" style={{ margin: 0, borderLeft: `3px solid ${CAT_COLORS[c.cat]}` }}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0d1b3e' }}>{euro(c.totaal)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['alles', 'klus', 'vast'] as const).map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
            {f === 'alles' ? 'Alles' : f === 'klus' ? 'Per klus' : 'Vaste kosten'}
          </button>
        ))}
        <div style={{ width: 1, background: '#e2e8f0', margin: '0 4px' }} />
        {['alles', ...CATEGORIEEN].map(c => (
          <button key={c} className={`btn btn-sm ${catFilter === c ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCatFilter(c)}>
            {c === 'alles' ? 'Alle categorieën' : CAT_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Tabel */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#8ba8c4' }}>Geen kosten gevonden.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Datum', 'Omschrijving', 'Categorie', 'Leverancier', 'Klus', 'Bedrag', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: .5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((k, i) => (
                <tr key={k.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 16px', fontSize: '.85rem', color: '#5b7fa6', whiteSpace: 'nowrap' }}>{new Date(k.datum).toLocaleDateString('nl-NL')}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0d1b3e' }}>{k.omschrijving}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: CAT_COLORS[k.categorie] + '20', color: CAT_COLORS[k.categorie], padding: '2px 8px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700 }}>
                      {CAT_LABELS[k.categorie] ?? k.categorie}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '.85rem', color: '#5b7fa6' }}>{k.leverancier ?? '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: '.85rem', color: '#5b7fa6' }}>{k.klus_naam ?? (k.klus_id ? `#${k.klus_id}` : '—')}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 800, color: '#dc2626', whiteSpace: 'nowrap' }}>{euro(Number(k.bedrag))}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(k.id)}>
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Formulier modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowForm(false)}>
          <div className="card" style={{ width: 480, margin: 0, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#0d1b3e' }}>Kost toevoegen</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Type */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[['klus', 'Per klus'], ['vast', 'Vaste kost']].map(([v, l]) => (
                  <button key={v} type="button"
                    className={`btn btn-sm ${form.type === v ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setForm(f => ({ ...f, type: v }))}>
                    {l}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Datum</label>
                  <input className="form-ctrl" type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Bedrag (€) *</label>
                  <input className="form-ctrl" type="number" step="0.01" min="0" required value={form.bedrag} onChange={e => setForm(f => ({ ...f, bedrag: e.target.value }))} placeholder="0,00" />
                </div>
              </div>

              <div>
                <label className="form-label">Omschrijving *</label>
                <input className="form-ctrl" required value={form.omschrijving} onChange={e => setForm(f => ({ ...f, omschrijving: e.target.value }))} placeholder="Bijv. Groepenkast materiaal" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Categorie</label>
                  <select className="form-ctrl" value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                    {CATEGORIEEN.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Leverancier</label>
                  <input className="form-ctrl" value={form.leverancier} onChange={e => setForm(f => ({ ...f, leverancier: e.target.value }))} placeholder="Bijv. Gamma, Technische Unie" />
                </div>
              </div>

              {form.type === 'klus' && (
                <>
                  <div>
                    <label className="form-label">Klant</label>
                    <select className="form-ctrl" value={form.klant_id} onChange={e => setForm(f => ({ ...f, klant_id: e.target.value, klus_id: '' }))}>
                      <option value="">— Kies klant —</option>
                      {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
                    </select>
                  </div>
                  {form.klant_id && (
                    <div>
                      <label className="form-label">Klus</label>
                      <select className="form-ctrl" value={form.klus_id} onChange={e => setForm(f => ({ ...f, klus_id: e.target.value }))}>
                        <option value="">— Kies klus —</option>
                        {klussen.filter(k => k.klant_id === Number(form.klant_id)).map(k => (
                          <option key={k.id} value={k.id}>{k.type_werk || `Klus #${k.id}`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
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
