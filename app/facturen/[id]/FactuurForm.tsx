'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RegelEditor from '@/components/RegelEditor'
import Icon from '@/components/Icon'
import KlantProjectInfo from '@/components/KlantProjectInfo'
import { formatEuro, type RegelItem } from '@/lib/utils'

export default function FactuurForm({ factuur, factuurId }: { factuur: any; factuurId: number }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [regels, setRegels] = useState<RegelItem[]>(factuur.regels ?? [])
  const [btwPct, setBtwPct] = useState(Number(factuur.btw_pct))
  const [melding, setMelding] = useState<string | null>(null)
  // Voorschot-/eindfactuur: regels en btw liggen vast (ook server-side); die sturen we dan niet mee
  const gesplitst = factuur.soort === 'voorschot' || factuur.soort === 'eind'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch(`/api/facturen/${factuurId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        factuurdatum: fd.get('factuurdatum'),
        betalingstermijn: fd.get('betalingstermijn'),
        notities: fd.get('notities'),
        ...(gesplitst ? {} : { regels, btw_pct: btwPct }),
      }),
    })
    const data = await res.json().catch(() => ({}))
    setMelding(res.ok ? null : (data?.error ?? 'Opslaan mislukt'))
    setSaving(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      {melding && <div className="alert alert-err">{melding}</div>}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Gegevens</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <KlantProjectInfo document={factuur} />
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Factuurdatum</label>
            <input className="form-ctrl" type="date" name="factuurdatum" defaultValue={factuur.factuurdatum?.slice(0, 10)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Betalingstermijn (dagen)</label>
            <input className="form-ctrl" type="number" name="betalingstermijn" defaultValue={factuur.betalingstermijn ?? 14} min={1} max={90} />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
          <label className="form-label">Notities</label>
          <textarea className="form-ctrl" name="notities" defaultValue={factuur.notities ?? ''} rows={3} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Regeloverzicht</div>
        {gesplitst ? (
          <>
            <div className="alert alert-warn" style={{ fontSize: '.8rem', padding: '8px 12px', marginBottom: 12 }}>
              Gesplitste factuur: maak de splitsing ongedaan om regels te wijzigen.
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Omschrijving</th>
                    <th style={{ textAlign: 'right' }}>Aantal</th>
                    <th style={{ textAlign: 'right' }}>Prijs</th>
                    <th style={{ textAlign: 'right' }}>Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {(factuur.regels ?? []).map((r: RegelItem, i: number) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.omschrijving || '—'}</div>
                        {r.beschrijving && <div style={{ fontSize: '.78rem', color: 'var(--text-soft)', whiteSpace: 'pre-wrap' }}>{r.beschrijving}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{Number(r.aantal).toLocaleString('nl-NL', { maximumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: 'right' }}>{formatEuro(Number(r.prijs))}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatEuro(Number(r.aantal) * Number(r.prijs))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--text-soft)', marginTop: 8 }}>
              Bedragen ex. btw ({Number(factuur.btw_pct)}%). Datum, betalingstermijn en notities kun je wel aanpassen.
            </div>
          </>
        ) : (
        <RegelEditor
          initialRegels={factuur.regels ?? []}
          kortingBedrag={0}
          btwPct={Number(factuur.btw_pct)}
          onChange={(r, _k, b) => { setRegels(r); setBtwPct(b) }}
        />
        )}
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        <Icon name="check" size={18} />
        {saving ? 'Opslaan…' : 'Factuur opslaan'}
      </button>
    </form>
  )
}
