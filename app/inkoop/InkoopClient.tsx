'use client'

import { useState } from 'react'

type Lijst = {
  id: number; titel: string; klant_id: number | null; klant_naam: string | null
  klus_naam: string | null; klus_id: number | null; aangemaakt_op: string; btw_pct: number
}
type Item = {
  id: number; lijst_id: number; omschrijving: string; artikelnummer: string | null
  aantal: number; eenheid: string; leverancier: string | null; prijs_ex_btw: number | null; afgevinkt: boolean
}

const BTW_OPTIES = [0, 9, 21]
const EENHEDEN = ['stuk', 'm', 'm²', 'm³', 'kg', 'liter', 'doos', 'rol', 'set', 'uur']

function euro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function InkoopClient({ lijsten, items, klanten, klussen }: {
  lijsten: Lijst[]; items: Item[]; klanten: any[]; klussen: any[]
}) {
  const [localLijsten, setLocalLijsten] = useState<Lijst[]>(lijsten)
  const [localItems, setLocalItems] = useState<Item[]>(items)
  const [activeLijst, setActiveLijst] = useState<Lijst | null>(null)
  const [showNieuweLijst, setShowNieuweLijst] = useState(false)
  const [nieuwItem, setNieuwItem] = useState({
    omschrijving: '', artikelnummer: '', aantal: '1',
    eenheid: 'stuk', leverancier: '', prijs_ex_btw: '',
  })
  const [lijstForm, setLijstForm] = useState({ titel: '', klant_id: '', klus_id: '', btw_pct: '21' })
  const [saving, setSaving] = useState(false)
  const [editItemId, setEditItemId] = useState<number | null>(null)
  const [editItemData, setEditItemData] = useState<Partial<Item>>({})

  const lijstItems = activeLijst ? localItems.filter(i => i.lijst_id === activeLijst.id) : []
  const gedaan = lijstItems.filter(i => i.afgevinkt).length

  const btw = activeLijst?.btw_pct ?? 21
  const totaalEx = lijstItems.reduce((s, i) => s + (i.prijs_ex_btw != null ? Number(i.prijs_ex_btw) * Number(i.aantal) : 0), 0)
  const totaalBtw = totaalEx * (btw / 100)
  const totaalIncl = totaalEx + totaalBtw
  const heeftPrijzen = lijstItems.some(i => i.prijs_ex_btw != null)

  async function maakLijst(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/inkoop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lijstForm, btw_pct: Number(lijstForm.btw_pct) }),
    })
    if (res.ok) {
      const { lijst } = await res.json()
      const klant = klanten.find(k => k.id === Number(lijstForm.klant_id))
      const klus = klussen.find(k => k.id === Number(lijstForm.klus_id))
      const nieuweL = { ...lijst, klant_naam: klant?.naam ?? null, klus_naam: klus?.type_werk ?? null }
      setLocalLijsten(prev => [nieuweL, ...prev])
      setActiveLijst(nieuweL)
      setShowNieuweLijst(false)
      setLijstForm({ titel: '', klant_id: '', klus_id: '', btw_pct: '21' })
    }
    setSaving(false)
  }

  async function voegItemToe(e: React.FormEvent) {
    e.preventDefault()
    if (!activeLijst || !nieuwItem.omschrijving.trim()) return
    const res = await fetch(`/api/inkoop/${activeLijst.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...nieuwItem,
        aantal: parseFloat(nieuwItem.aantal) || 1,
        prijs_ex_btw: nieuwItem.prijs_ex_btw ? parseFloat(nieuwItem.prijs_ex_btw) : null,
      }),
    })
    if (res.ok) {
      const { item } = await res.json()
      setLocalItems(prev => [...prev, item])
      setNieuwItem({ omschrijving: '', artikelnummer: '', aantal: '1', eenheid: nieuwItem.eenheid, leverancier: nieuwItem.leverancier, prijs_ex_btw: '' })
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

  async function slaItemOp(id: number) {
    await fetch(`/api/inkoop/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editItemData),
    })
    setLocalItems(prev => prev.map(i => i.id === id ? { ...i, ...editItemData } as Item : i))
    setEditItemId(null)
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
        {/* Sidebar lijsten */}
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
                const totEx = lItems.reduce((s, i) => s + (i.prijs_ex_btw != null ? Number(i.prijs_ex_btw) * Number(i.aantal) : 0), 0)
                const isActive = activeLijst?.id === lijst.id
                return (
                  <div
                    key={lijst.id}
                    onClick={() => setActiveLijst(lijst)}
                    style={{
                      background: isActive ? '#0d1b3e' : '#fff',
                      color: isActive ? '#fff' : '#0d1b3e',
                      border: `1px solid ${isActive ? '#0d1b3e' : '#e2e8f0'}`,
                      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{lijst.titel}</div>
                    {lijst.klant_naam && <div style={{ fontSize: '.75rem', opacity: .7, marginBottom: 2 }}>👤 {lijst.klant_naam}</div>}
                    {lijst.klus_naam && <div style={{ fontSize: '.75rem', opacity: .7, marginBottom: 6 }}>🔧 {lijst.klus_naam}</div>}
                    <div style={{ height: 4, background: isActive ? 'rgba(255,255,255,.3)' : '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: isActive ? '#fff' : '#16a34a', width: `${pct}%`, transition: 'width .3s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: '.72rem', opacity: .7 }}>{lItems.filter(i => i.afgevinkt).length}/{lItems.length} items</span>
                      {totEx > 0 && <span style={{ fontSize: '.72rem', opacity: .8, fontWeight: 600 }}>{euro(totEx)} ex</span>}
                    </div>
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
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', color: '#0d1b3e' }}>{activeLijst.titel}</h2>
                  {activeLijst.klant_naam && (
                    <div style={{ fontSize: '.82rem', color: '#5b7fa6', marginBottom: 2 }}>
                      👤 <strong>{activeLijst.klant_naam}</strong>
                      {activeLijst.klus_naam && <span> — 🔧 {activeLijst.klus_naam}</span>}
                    </div>
                  )}
                  <div style={{ fontSize: '.78rem', color: '#8ba8c4', marginTop: 4 }}>
                    {gedaan}/{lijstItems.length} afgevinkt · BTW {btw}%
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => verwijderLijst(activeLijst.id)}>Verwijderen</button>
              </div>

              {/* Koptekst tabel */}
              {lijstItems.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 120px 100px 80px 90px 90px 80px 32px',
                  gap: 6, padding: '0 4px 6px', borderBottom: '2px solid #e2e8f0', marginBottom: 6,
                  fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.05em',
                }}>
                  <div />
                  <div>Omschrijving</div>
                  <div>Artikelnr.</div>
                  <div>Leverancier</div>
                  <div>Aantal</div>
                  <div>Prijs p/st. ex</div>
                  <div>Totaal ex</div>
                  <div>Totaal incl</div>
                  <div />
                </div>
              )}

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                {lijstItems.length === 0 && (
                  <p style={{ color: '#8ba8c4', fontSize: '.85rem', margin: '8px 0 16px' }}>Nog geen items. Voeg hieronder toe.</p>
                )}
                {lijstItems.map(item => {
                  const totEx = item.prijs_ex_btw != null ? Number(item.prijs_ex_btw) * Number(item.aantal) : null
                  const totIncl = totEx != null ? totEx * (1 + btw / 100) : null
                  const isEditing = editItemId === item.id
                  return (
                    <div key={item.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr 120px 100px 80px 90px 90px 80px 32px',
                      gap: 6, alignItems: 'center', padding: '8px 4px',
                      background: item.afgevinkt ? '#f0fdf4' : '#f8fafc',
                      borderRadius: 8, border: `1px solid ${item.afgevinkt ? '#bbf7d0' : '#e2e8f0'}`,
                    }}>
                      <input
                        type="checkbox" checked={item.afgevinkt} onChange={() => toggleItem(item)}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#16a34a', margin: '0 auto' }}
                      />
                      {isEditing ? (
                        <>
                          <input className="form-ctrl" style={{ fontSize: '.8rem', padding: '4px 8px' }}
                            value={String(editItemData.omschrijving ?? item.omschrijving)}
                            onChange={e => setEditItemData(d => ({ ...d, omschrijving: e.target.value }))} />
                          <input className="form-ctrl" style={{ fontSize: '.8rem', padding: '4px 8px' }}
                            value={String(editItemData.artikelnummer ?? item.artikelnummer ?? '')}
                            placeholder="Artikelnr."
                            onChange={e => setEditItemData(d => ({ ...d, artikelnummer: e.target.value }))} />
                          <input className="form-ctrl" style={{ fontSize: '.8rem', padding: '4px 8px' }}
                            value={String(editItemData.leverancier ?? item.leverancier ?? '')}
                            placeholder="Leverancier"
                            onChange={e => setEditItemData(d => ({ ...d, leverancier: e.target.value }))} />
                          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <input className="form-ctrl" type="number" style={{ fontSize: '.8rem', padding: '4px 6px', width: 48 }}
                              value={String(editItemData.aantal ?? item.aantal)}
                              onChange={e => setEditItemData(d => ({ ...d, aantal: parseFloat(e.target.value) }))} />
                            <select className="form-ctrl" style={{ fontSize: '.75rem', padding: '4px 4px', width: 48 }}
                              value={String(editItemData.eenheid ?? item.eenheid)}
                              onChange={e => setEditItemData(d => ({ ...d, eenheid: e.target.value }))}>
                              {EENHEDEN.map(u => <option key={u}>{u}</option>)}
                            </select>
                          </div>
                          <input className="form-ctrl" type="number" style={{ fontSize: '.8rem', padding: '4px 8px' }}
                            value={String(editItemData.prijs_ex_btw ?? item.prijs_ex_btw ?? '')}
                            placeholder="0,00"
                            onChange={e => setEditItemData(d => ({ ...d, prijs_ex_btw: parseFloat(e.target.value) }))} />
                          <div />
                          <div />
                          <button className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '.74rem' }}
                            onClick={() => slaItemOp(item.id)}>✓</button>
                        </>
                      ) : (
                        <>
                          <div style={{ opacity: item.afgevinkt ? .5 : 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '.84rem', color: '#0d1b3e', textDecoration: item.afgevinkt ? 'line-through' : 'none' }}>
                              {item.omschrijving}
                            </div>
                            <div style={{ fontSize: '.72rem', color: '#8ba8c4', marginTop: 1 }}>
                              {item.aantal} {item.eenheid}
                            </div>
                          </div>
                          <div style={{ fontSize: '.8rem', color: '#374151', opacity: item.afgevinkt ? .5 : 1 }}>
                            {item.artikelnummer || <span style={{ color: '#d1d5db' }}>—</span>}
                          </div>
                          <div style={{ fontSize: '.8rem', color: '#374151', opacity: item.afgevinkt ? .5 : 1 }}>
                            {item.leverancier || <span style={{ color: '#d1d5db' }}>—</span>}
                          </div>
                          <div style={{ fontSize: '.82rem', color: '#374151', fontWeight: 600 }}>
                            {item.aantal} {item.eenheid}
                          </div>
                          <div style={{ fontSize: '.82rem', color: '#374151' }}>
                            {item.prijs_ex_btw != null ? euro(Number(item.prijs_ex_btw)) : <span style={{ color: '#d1d5db' }}>—</span>}
                          </div>
                          <div style={{ fontSize: '.84rem', fontWeight: 700, color: totEx != null ? '#0d1b3e' : '#d1d5db' }}>
                            {totEx != null ? euro(totEx) : '—'}
                          </div>
                          <div style={{ fontSize: '.84rem', fontWeight: 700, color: totIncl != null ? '#16a34a' : '#d1d5db' }}>
                            {totIncl != null ? euro(totIncl) : '—'}
                          </div>
                          <div style={{ display: 'flex', gap: 2 }}>
                            <button
                              className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}
                              onClick={() => { setEditItemId(item.id); setEditItemData({}) }}
                              title="Bewerken"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                            </button>
                            <button
                              className="btn btn-ghost btn-sm" style={{ padding: '4px 6px', color: '#ef4444' }}
                              onClick={() => verwijderItem(item.id)}
                              title="Verwijderen"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Totaalbalk */}
              {heeftPrijzen && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 20px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                        Subtotaal ex BTW
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d1b3e' }}>{euro(totaalEx)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                        BTW {btw}%
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#64748b' }}>{euro(totaalBtw)}</div>
                    </div>
                    <div style={{ textAlign: 'right', borderLeft: '2px solid #e2e8f0', paddingLeft: 32 }}>
                      <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                        Totaal inkoop incl BTW
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a' }}>{euro(totaalIncl)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Nieuw item invoer */}
              <div style={{ background: '#f0f4f8', borderRadius: 10, padding: '16px', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                  Artikel toevoegen
                </div>
                <form onSubmit={voegItemToe} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Rij 1: omschrijving + artikelnr */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-ctrl" style={{ flex: 3 }}
                      placeholder="Omschrijving artikel *"
                      value={nieuwItem.omschrijving}
                      onChange={e => setNieuwItem(f => ({ ...f, omschrijving: e.target.value }))}
                      required
                    />
                    <input
                      className="form-ctrl" style={{ width: 140 }}
                      placeholder="Artikelnummer"
                      value={nieuwItem.artikelnummer}
                      onChange={e => setNieuwItem(f => ({ ...f, artikelnummer: e.target.value }))}
                    />
                  </div>
                  {/* Rij 2: leverancier + aantal + eenheid + prijs + knop */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      className="form-ctrl" style={{ flex: 2, minWidth: 120 }}
                      placeholder="Leverancier"
                      value={nieuwItem.leverancier}
                      onChange={e => setNieuwItem(f => ({ ...f, leverancier: e.target.value }))}
                    />
                    <input
                      className="form-ctrl" style={{ width: 72 }}
                      type="number" min="0.01" step="0.01" placeholder="Aantal"
                      value={nieuwItem.aantal}
                      onChange={e => setNieuwItem(f => ({ ...f, aantal: e.target.value }))}
                    />
                    <select
                      className="form-ctrl" style={{ width: 80 }}
                      value={nieuwItem.eenheid}
                      onChange={e => setNieuwItem(f => ({ ...f, eenheid: e.target.value }))}
                    >
                      {EENHEDEN.map(u => <option key={u}>{u}</option>)}
                    </select>
                    <div style={{ position: 'relative', width: 130 }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8ba8c4', fontWeight: 700, fontSize: '.85rem', pointerEvents: 'none' }}>€</span>
                      <input
                        className="form-ctrl" style={{ paddingLeft: 24 }}
                        type="number" min="0" step="0.01" placeholder="Prijs ex BTW"
                        value={nieuwItem.prijs_ex_btw}
                        onChange={e => setNieuwItem(f => ({ ...f, prijs_ex_btw: e.target.value }))}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                      Toevoegen
                    </button>
                  </div>
                  {/* Preview bedrag als je prijs en aantal hebt ingevuld */}
                  {nieuwItem.prijs_ex_btw && nieuwItem.aantal && (
                    <div style={{ fontSize: '.78rem', color: '#5b7fa6', paddingLeft: 4 }}>
                      {euro(parseFloat(nieuwItem.prijs_ex_btw) * (parseFloat(nieuwItem.aantal) || 1))} ex BTW
                      &nbsp;·&nbsp;
                      {euro(parseFloat(nieuwItem.prijs_ex_btw) * (parseFloat(nieuwItem.aantal) || 1) * (1 + btw / 100))} incl BTW ({btw}%)
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nieuwe lijst modal */}
      {showNieuweLijst && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowNieuweLijst(false)}
        >
          <div className="card" style={{ width: 440, margin: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Nieuwe inkooplijst</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNieuweLijst(false)}>✕</button>
            </div>
            <form onSubmit={maakLijst} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Naam lijst *</label>
                <input className="form-ctrl" required value={lijstForm.titel}
                  onChange={e => setLijstForm(f => ({ ...f, titel: e.target.value }))}
                  placeholder="Bijv. Materiaal groepenkast Janssen" />
              </div>
              <div>
                <label className="form-label">BTW percentage</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {BTW_OPTIES.map(pct => (
                    <button
                      key={pct} type="button"
                      onClick={() => setLijstForm(f => ({ ...f, btw_pct: String(pct) }))}
                      className={`btn ${lijstForm.btw_pct === String(pct) ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
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
                <label className="form-label">Klus koppelen <span style={{ color: '#8ba8c4', fontWeight: 400 }}>(optioneel)</span></label>
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
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
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
