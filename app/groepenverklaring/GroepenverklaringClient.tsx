'use client'

import { useState } from 'react'

type Groep = { nummer: number; naam: string; vermogen: string; ampere: string; type: string }

const DEFAULT_GROEP: Omit<Groep, 'nummer'> = { naam: '', vermogen: '', ampere: '16', type: 'lichtnet' }
const GROEP_TYPEN = ['lichtnet', 'krachtnet', 'kookgroep', 'wasmachine', 'vaatwasser', 'droger', 'magnetron', 'diepvries', 'airco', 'laadpaal', 'zonnepanelen', 'overig']

export default function GroepenverklaringClient({ klanten, klussen }: { klanten: any[]; klussen: any[] }) {
  const [form, setForm] = useState({
    klant_id: '', klus_id: '', adres: '', postcode: '', plaats: '',
    installatiedatum: new Date().toISOString().slice(0, 10),
    installateurNaam: 'Ahmed Öz', installateurCertificaat: 'NEN 1010 / NEN 3140 / VCA',
    aansluiting: '1-fase', hoofdzekering: '25', aardlekschakelaar: true,
    opmerkingen: '',
  })
  const [groepen, setGroepen] = useState<Groep[]>([
    { nummer: 1, naam: 'Licht begane grond', vermogen: '230', ampere: '16', type: 'lichtnet' },
    { nummer: 2, naam: 'Licht verdieping', vermogen: '230', ampere: '16', type: 'lichtnet' },
    { nummer: 3, naam: 'Stopcontacten begane grond', vermogen: '230', ampere: '16', type: 'lichtnet' },
  ])
  const [genereren, setGenereren] = useState(false)

  const selectedKlant = klanten.find(k => k.id === Number(form.klant_id))
  const selectedKlus = klussen.find(k => k.id === Number(form.klus_id))

  function updateGroep(i: number, field: keyof Groep, value: string) {
    setGroepen(prev => prev.map((g, idx) => idx === i ? { ...g, [field]: value } : g))
  }

  function voegGroepToe() {
    setGroepen(prev => [...prev, { nummer: prev.length + 1, ...DEFAULT_GROEP }])
  }

  function verwijderGroep(i: number) {
    setGroepen(prev => prev.filter((_, idx) => idx !== i).map((g, idx) => ({ ...g, nummer: idx + 1 })))
  }

  async function genereerPDF() {
    setGenereren(true)
    const res = await fetch('/api/groepenverklaring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form, groepen, klantNaam: selectedKlant?.naam, klusNaam: selectedKlus?.type_werk }),
    })

    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `groepenverklaring-${selectedKlant?.naam?.replace(/\s/g, '-') ?? 'document'}.html`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      alert('Genereren mislukt')
    }
    setGenereren(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Groepenverklaring</h1>
        <button className="btn btn-primary" onClick={genereerPDF} disabled={genereren}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
          {genereren ? 'Genereren...' : 'Download document'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Projectgegevens */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Projectgegevens</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label">Klant</label>
                <select className="form-ctrl" value={form.klant_id} onChange={e => {
                  const klant = klanten.find(k => k.id === Number(e.target.value))
                  setForm(f => ({ ...f, klant_id: e.target.value, klus_id: '', adres: klant?.locatie ?? '', plaats: 'Culemborg' }))
                }}>
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
              <div>
                <label className="form-label">Adres installatie</label>
                <input className="form-ctrl" value={form.adres} onChange={e => setForm(f => ({ ...f, adres: e.target.value }))} placeholder="Straat + huisnummer" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <div>
                  <label className="form-label">Postcode</label>
                  <input className="form-ctrl" value={form.postcode} onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))} placeholder="4111 AA" />
                </div>
                <div>
                  <label className="form-label">Plaats</label>
                  <input className="form-ctrl" value={form.plaats} onChange={e => setForm(f => ({ ...f, plaats: e.target.value }))} placeholder="Culemborg" />
                </div>
              </div>
              <div>
                <label className="form-label">Installatiedatum</label>
                <input className="form-ctrl" type="date" value={form.installatiedatum} onChange={e => setForm(f => ({ ...f, installatiedatum: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Installatie details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="form-label">Aansluiting</label>
                  <select className="form-ctrl" value={form.aansluiting} onChange={e => setForm(f => ({ ...f, aansluiting: e.target.value }))}>
                    <option>1-fase</option>
                    <option>3-fase</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Hoofdzekering (A)</label>
                  <select className="form-ctrl" value={form.hoofdzekering} onChange={e => setForm(f => ({ ...f, hoofdzekering: e.target.value }))}>
                    {['16', '25', '35', '40', '50', '63', '80'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="aardlek" checked={form.aardlekschakelaar}
                  onChange={e => setForm(f => ({ ...f, aardlekschakelaar: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: '#0d1b3e' }} />
                <label htmlFor="aardlek" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Aardlekschakelaar aanwezig</label>
              </div>
              <div>
                <label className="form-label">Opmerkingen</label>
                <textarea className="form-ctrl" rows={3} value={form.opmerkingen} onChange={e => setForm(f => ({ ...f, opmerkingen: e.target.value }))} placeholder="Bijzonderheden, afwijkingen..." />
              </div>
            </div>
          </div>
        </div>

        {/* Groepen */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1 }}>Groepen ({groepen.length})</div>
            <button className="btn btn-ghost btn-sm" onClick={voegGroepToe}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Groep toevoegen
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groepen.map((groep, i) => (
              <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 24, height: 24, background: '#0d1b3e', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 800, flexShrink: 0 }}>{groep.nummer}</span>
                  <input className="form-ctrl" style={{ flex: 1 }} value={groep.naam} onChange={e => updateGroep(i, 'naam', e.target.value)} placeholder="Naam groep" />
                  <button className="btn btn-ghost btn-sm" onClick={() => verwijderGroep(i)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: '.7rem', color: '#8ba8c4', display: 'block', marginBottom: 3 }}>Ampere</label>
                    <select className="form-ctrl" value={groep.ampere} onChange={e => updateGroep(i, 'ampere', e.target.value)}>
                      {['10', '16', '20', '25', '32'].map(a => <option key={a}>{a}A</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '.7rem', color: '#8ba8c4', display: 'block', marginBottom: 3 }}>Volt</label>
                    <select className="form-ctrl" value={groep.vermogen} onChange={e => updateGroep(i, 'vermogen', e.target.value)}>
                      <option value="230">230V</option>
                      <option value="400">400V</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '.7rem', color: '#8ba8c4', display: 'block', marginBottom: 3 }}>Type</label>
                    <select className="form-ctrl" value={groep.type} onChange={e => updateGroep(i, 'type', e.target.value)}>
                      {GROEP_TYPEN.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
