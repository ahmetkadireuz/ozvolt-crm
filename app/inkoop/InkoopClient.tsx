'use client'

import { useState } from 'react'

type Lijst = { id: number; titel: string; klant_id: number | null; klant_naam: string | null; klus_naam: string | null; klus_id: number | null; aangemaakt_op: string }
type Item = { id: number; lijst_id: number; omschrijving: string; aantal: number; eenheid: string; leverancier: string | null; prijs_ex_btw: number | null; afgevinkt: boolean }

export default function InkoopClient({ lijsten, items, klanten, klussen }: {
  lijsten: Lijst[]; items: Item[]; klanten: any[]; klussen: any[]
}) {
  const [localLijsten, setLocalLijsten] = useState<Lijst[]>(lijsten)
  const [localItems, setLocalItems] = useState<Item[]>(items)
  const [activeLijst, setActiveLijst] = useState<Lijst | null>(null)
  const [showNieuweLijst, setShowNieuweLijst] = useState(false)
  const [nieuwItem, setNieuwItem] = useState({ omschrijving: '', aantal: '1', eenheid: 'stuk', leverancier: '', prijs_ex_btw: '', prijs_per_stuk: '' })
  const [lijstForm, setLijstForm] = useState({ titel: '', klant_id: '', klus_id: '' })
  const [saving, setSaving] = useState(false)

  const lijstItems = activeLijst ? localItems.filter(i => i.lijst_id === activeLijst.id) : []
  const gedaan = lijstItems.filter(i => i.afgevinkt).length

  async function maakLijst(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/inkoop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lijstForm),
    })
    if (res.ok) {
      const { lijst } = await res.json()
      const klant = klanten.find(k => k.id === Number(lijstForm.klant_id))
      const klus = klussen.find(k => k.id === Number(lijstForm.klus_id))
      const nieuweL = { ...lijst, klant_naam: klant?.naam ?? null, klus_naam: klus?.type_werk ?? null }
      setLocalLijsten(prev => [nieuweL, ...prev])
      setActiveLijst(nieuweL)
      setShowNieuweLijst(false)
      setLijstForm({ titel: '', klant_id: '', klus_id: '' })
    }
    setSaving(false)
  }

  async function voegItemToe(e: React.FormEvent) {
    e.preventDefault()
    if (!activeLijst) return
    const res = await fetch(`/api/inkoop/${activeLijst.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...nieuwItem, aantal: parseFloat(nieuwItem.aantal), prijs_ex_btw: nieuwItem.prijs_ex_btw ? parseFloat(nieuwItem.prijs_ex_btw) : null }),
    })
    if (res.ok) {
      const { item } = await res.json()
      setLocalItems(prev => [...prev, item])
      setNieuwItem({ omschrijving: '', aantal: '1', eenheid: 'stuk', leverancier: '', prijs_ex_btw: '', prijs_per_stuk: '' })
    }
  }

  async function toggleItem(item: Item) {
    const nieuweStatus = !item.afgevinkt
    await fetch(`/api/inkoop/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ afgevinkt: nieuweStatus }),
    })
    setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, afgevinkt: nieuweStatus } : i))
  }

  async function verwijderItem(id: number) {
    await fetch(`/api/inkoop/items/${id}`, { method: 'DELETE' })
    setLocalItems(prev => prev.filter(i => i.id !== id))
  }

  async function verwijderLijst(id: number) {
    if (!confirm('Lijst verwijderen?')) return
    await fetch(`/api/inkoop/${id}`, { method: 'DELETE' })
    setLocalLijsten(prev => prev.filter(l => l.id !== id))
    setLocalItems(prev => prev.filter(i => i.lijst_id !== id))
    if (activeLijst?.id === id) setActiveLijst(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Inkoop</h1>
        <button className="btn btn-primary" onClick={() => setShowNieuweLijst(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Nieuwe lijst
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Lijsten sidebar */}
        <div>
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Inkooplijsten
          </div>
          {localLijsten.length === 0 ? (
            <div className="card" style={{ padding: '24px 16px', textAlign: 'center', color: '#8ba8c4', fontSize: '.85rem' }}>
              Nog geen lijsten
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {localLijsten.map(lijst => {
                const lItems = localItems.filter(i => i.lijst_id === lijst.id)
                const pct = lItems.length ? Math.round(lItems.filter(i => i.afgevinkt).length / lItems.length * 100) : 0
                return (
                  <div
                    key={lijst.id}
                    onClick={() => setActiveLijst(lijst)}
                    style={{
                      background: activeLijst?.id === lijst.id ? '#0d1b3e' : '#fff',
                      color: activeLijst?.id === lijst.id ? '#fff' : '#0d1b3e',
                      border: `1px solid ${activeLijst?.id === lijst.id ? '#0d1b3e' : '#e2e8f0'}`,
                      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{lijst.titel}</div>
                    {lijst.klant_naam && <div style={{ fontSize: '.75rem', opacity: .7, marginBottom: 2 }}>👤 {lijst.klant_naam}</div>}
                    {lijst.klus_naam && <div style={{ fontSize: '.75rem', opacity: .7, marginBottom: 6 }}>🔧 {lijst.klus_naam}</div>}
                    <div style={{ height: 4, background: activeLijst?.id === lijst.id ? 'rgba(255,255,255,.3)' : '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: activeLijst?.id === lijst.id ? '#fff' : '#16a34a', width: `${pct}%`, transition: 'width .3s' }} />
                    </div>
                    <div style={{ fontSize: '.72rem', opacity: .7, marginTop: 4 }}>{lItems.filter(i => i.afgevinkt).length}/{lItems.length} items</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Actieve lijst */}
        <div>
          {!activeLijst ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#8ba8c4', display: 'block', marginBottom: 12 }}>shopping_cart</span>
              <p style={{ color: '#8ba8c4', margin: 0 }}>Selecteer een lijst of maak een nieuwe aan.</p>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', color: '#0d1b3e' }}>{activeLijst.titel}</h2>
                  {activeLijst.klant_naam && (
                    <div style={{ fontSize: '.82rem', color: '#5b7fa6', marginBottom: 2 }}>
                      👤 <strong>{activeLijst.klant_naam}</strong>
                      {activeLijst.klus_naam && <span> — 🔧 {activeLijst.klus_naam}</span>}
                    </div>
                  )}
                  <div style={{ fontSize: '.8rem', color: '#8ba8c4', marginTop: 4 }}>{gedaan}/{lijstItems.length} afgevinkt</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => verwijderLijst(activeLijst.id)}>Verwijderen</button>
              </div>

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {lijstItems.length === 0 && (
                  <p style={{ color: '#8ba8c4', fontSize: '.85rem', margin: 0 }}>Nog geen items. Voeg hieronder toe.</p>
                )}
                {lijstItems.map(item => {
                  const totaalPrijs = item.prijs_ex_btw != null ? Number(item.prijs_ex_btw) * Number(item.aantal) : null
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: item.afgevinkt ? '#f0fdf4' : '#f8fafc', borderRadius: 8, border: `1px solid ${item.afgevinkt ? '#bbf7d0' : '#e2e8f0'}` }}>
                      <input type="checkbox" checked={item.afgevinkt} onChange={() => toggleItem(item)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#16a34a' }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: '#0d1b3e', textDecoration: item.afgevinkt ? 'line-through' : 'none', opacity: item.afgevinkt ? .5 : 1 }}>
                          {item.aantal} {item.eenheid} — {item.omschrijving}
                        </span>
                        {item.leverancier && <span style={{ fontSize: '.78rem', color: '#8ba8c4', marginLeft: 8 }}>({item.leverancier})</span>}
                        {item.prijs_ex_btw != null && (
                          <span style={{ fontSize: '.78rem', color: '#5b7fa6', marginLeft: 8 }}>
                            € {Number(item.prijs_ex_btw).toFixed(2)}/stuk
                          </span>
                        )}
                      </div>
                      {totaalPrijs != null && (
                        <span style={{ fontSize: '.82rem', color: '#16a34a', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          € {totaalPrijs.toFixed(2)} ex btw
                        </span>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => verwijderItem(item.id)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Totaal inkoop */}
              {lijstItems.some(i => i.prijs_ex_btw != null) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '.84rem', color: '#5b7fa6' }}>
                    Totaal inkoop:&nbsp;
                    <strong style={{ color: '#0d1b3e', fontSize: '.95rem' }}>
                      € {lijstItems.reduce((s, i) => s + (i.prijs_ex_btw != null ? Number(i.prijs_ex_btw) * Number(i.aantal) : 0), 0).toFixed(2)} ex btw
                    </strong>
                  </div>
                </div>
              )}

              {/* Nieuw item */}
              <form onSubmit={voegItemToe} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input className="form-ctrl" style={{ flex: 3, minWidth: 160 }} placeholder="Item omschrijving *" value={nieuwItem.omschrijving} onChange={e => setNieuwItem(f => ({ ...f, omschrijving: e.target.value }))} required />
                  <input className="form-ctrl" style={{ width: 70 }} type="number" min="0.1" step="0.1" placeholder="Aantal" value={nieuwItem.aantal} onChange={e => setNieuwItem(f => ({ ...f, aantal: e.target.value }))} />
                  <select className="form-ctrl" style={{ width: 90 }} value={nieuwItem.eenheid} onChange={e => setNieuwItem(f => ({ ...f, eenheid: e.target.value }))}>
                    {['stuk', 'm', 'm²', 'kg', 'liter', 'doos', 'rol', 'set'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input className="form-ctrl" style={{ flex: 2, minWidth: 120 }} placeholder="Leverancier" value={nieuwItem.leverancier} onChange={e => setNieuwItem(f => ({ ...f, leverancier: e.target.value }))} />
                  <div style={{ position: 'relative', flex: 1, minWidth: 110 }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8ba8c4', fontWeight: 600, pointerEvents: 'none' }}>€</span>
                    <input className="form-ctrl" style={{ paddingLeft: 24 }} type="number" min="0" step="0.01" placeholder="Prijs p/stuk ex btw" value={nieuwItem.prijs_ex_btw} onChange={e => setNieuwItem(f => ({ ...f, prijs_ex_btw: e.target.value }))} />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                    Toevoegen
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Nieuwe lijst modal */}
      {showNieuweLijst && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowNieuweLijst(false)}>
          <div className="card" style={{ width: 420, margin: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Nieuwe inkooplijst</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNieuweLijst(false)}>✕</button>
            </div>
            <form onSubmit={maakLijst} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Naam lijst *</label>
                <input className="form-ctrl" required value={lijstForm.titel} onChange={e => setLijstForm(f => ({ ...f, titel: e.target.value }))} placeholder="Bijv. Materiaal groepenkast Janssen" />
              </div>
              <div>
                <label className="form-label">Klant koppelen</label>
                <select className="form-ctrl" value={lijstForm.klant_id}
                  onChange={e => setLijstForm(f => ({ ...f, klant_id: e.target.value, klus_id: '' }))}>
                  <option value="">— Geen klant —</option>
                  {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Klus koppelen
                  <span style={{ color: '#8ba8c4', fontWeight: 400, marginLeft: 6 }}>(optioneel)</span>
                </label>
                <select className="form-ctrl" value={lijstForm.klus_id}
                  onChange={e => setLijstForm(f => ({ ...f, klus_id: e.target.value }))}
                  disabled={!lijstForm.klant_id}>
                  <option value="">— {lijstForm.klant_id ? 'Geen klus' : 'Selecteer eerst een klant'} —</option>
                  {klussen
                    .filter(k => !lijstForm.klant_id || k.klant_id === Number(lijstForm.klant_id))
                    .map(k => (
                      <option key={k.id} value={k.id}>
                        {lijstForm.klant_id ? (k.type_werk || `Klus #${k.id}`) : `${k.klant_naam} — ${k.type_werk || `Klus #${k.id}`}`}
                      </option>
                    ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNieuweLijst(false)}>Annuleren</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Aanmaken...' : 'Aanmaken'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
