'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RegelEditor from '@/components/RegelEditor'
import WerkafsprakenEditor, { type WaItem, type Bijlage } from '@/components/WerkafsprakenEditor'
import type { RegelItem } from '@/lib/utils'

export default function OfferteForm({ offerte, klanten, offerteId }: { offerte: any; klanten: any[]; offerteId: number }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [regels, setRegels] = useState<RegelItem[]>(offerte.regels ?? [])
  const [kortingPct, setKortingPct] = useState(Number(offerte.korting_pct))
  const [btwPct, setBtwPct] = useState(Number(offerte.btw_pct))
  const [betaling50, setBetaling50] = useState(!!offerte.betaling_50_50)
  const [waItems, setWaItems] = useState<WaItem[]>(offerte.wa_items ?? [])
  const [bijlagen, setBijlagen] = useState<Bijlage[]>(offerte.bijlagen ?? [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    await fetch(`/api/offertes/${offerteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        klant_id: fd.get('klant_id'),
        datum: fd.get('datum'),
        geldig_tot: fd.get('geldig_tot'),
        notities: fd.get('notities'),
        betaal_url: fd.get('betaal_url'),
        betaling_50_50: betaling50,
        betaal_url_2: fd.get('betaal_url_2'),
        regels,
        korting_pct: kortingPct,
        btw_pct: btwPct,
        wa_items: waItems,
      }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Gegevens</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Klant</label>
            <select className="form-ctrl" name="klant_id" defaultValue={offerte.klant_id}>
              {klanten.map((k: any) => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Datum</label>
            <input className="form-ctrl" type="date" name="datum" defaultValue={offerte.datum?.slice(0, 10)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Geldig tot</label>
            <input className="form-ctrl" type="date" name="geldig_tot" defaultValue={offerte.geldig_tot?.slice(0, 10)} />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
          <label className="form-label">Notities (intern)</label>
          <textarea className="form-ctrl" name="notities" defaultValue={offerte.notities ?? ''} rows={3} />
        </div>
        <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={betaling50} onChange={e => setBetaling50(e.target.checked)} style={{ width: 16, height: 16 }} />
            50/50 betaling (twee termijnen)
          </label>
          <div style={{ fontSize: '.75rem', color: '#8ba8c4', marginTop: 4 }}>Klant betaalt 50% nu, 50% later. Vul twee betaallinks in.</div>
        </div>
        <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
          <label className="form-label">{betaling50 ? 'Betaallink eerste termijn (50%)' : 'Betaallink (optioneel)'}</label>
          <input className="form-ctrl" type="url" name="betaal_url" defaultValue={offerte.betaal_url ?? ''} placeholder="https://pay.mollie.com/..." />
          <div style={{ fontSize: '.75rem', color: '#8ba8c4', marginTop: 4 }}>Mollie betaallink — klant betaalt direct via iDEAL</div>
        </div>
        {betaling50 && (
          <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
            <label className="form-label">Betaallink tweede termijn (50%)</label>
            <input className="form-ctrl" type="url" name="betaal_url_2" defaultValue={offerte.betaal_url_2 ?? ''} placeholder="https://pay.mollie.com/..." />
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Regeloverzicht</div>
        <RegelEditor
          initialRegels={offerte.regels ?? []}
          kortingBedrag={Number(offerte.korting_pct)}
          btwPct={Number(offerte.btw_pct)}
          onChange={(r, k, b) => { setRegels(r); setKortingPct(k); setBtwPct(b) }}
        />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Werkafspraken</div>
        <div style={{ fontSize: '.78rem', color: '#8ba8c4', marginBottom: 12 }}>
          Wat doet Ozvolt, wat doet de klant? Voeg per punt toe wie verantwoordelijk is.
        </div>
        <WerkafsprakenEditor
          initialItems={waItems}
          initialBijlagen={bijlagen}
          offerteId={offerteId}
          onChange={(items, bijen) => { setWaItems(items); setBijlagen(bijen) }}
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        <span className="nav-ico" style={{ fontSize: 18 }}>save</span>
        {saving ? 'Opslaan…' : 'Offerte opslaan'}
      </button>
    </form>
  )
}
