'use client'

import { useState } from 'react'
import type { RegelItem } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/db'

interface Props {
  initialRegels?: RegelItem[]
  kortingPct?: number
  btwPct?: number
  onChange?: (regels: RegelItem[], korting: number, btw: number) => void
}

export default function RegelEditor({ initialRegels = [], kortingPct = 0, btwPct = 21, onChange }: Props) {
  const [regels, setRegels] = useState<RegelItem[]>(
    initialRegels.length > 0 ? initialRegels : [{ omschrijving: '', aantal: 1, prijs: 0, btw: 21 }]
  )
  const [korting, setKorting] = useState(kortingPct)
  const [btw, setBtw] = useState(btwPct)

  function update(index: number, field: keyof RegelItem, value: string | number) {
    const updated = regels.map((r, i) => i === index ? { ...r, [field]: field === 'omschrijving' ? value : Number(value) } : r)
    setRegels(updated)
    onChange?.(updated, korting, btw)
  }

  function addRegel() {
    const updated = [...regels, { omschrijving: '', aantal: 1, prijs: 0, btw: 21 }]
    setRegels(updated)
    onChange?.(updated, korting, btw)
  }

  function removeRegel(index: number) {
    if (regels.length === 1) return
    const updated = regels.filter((_, i) => i !== index)
    setRegels(updated)
    onChange?.(updated, korting, btw)
  }

  const totalen = berekenTotalen(regels, korting, btw)

  return (
    <div>
      <input type="hidden" name="regels_json" value={JSON.stringify(regels)} />
      <input type="hidden" name="korting_pct" value={korting} />
      <input type="hidden" name="btw_pct" value={btw} />

      {/* Header */}
      <div className="regel-row" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase' }}>Omschrijving</span>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase' }}>Aantal</span>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase' }}>Prijs (ex)</span>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase' }}>BTW%</span>
        <span />
      </div>

      {regels.map((regel, i) => (
        <div key={i} className="regel-row">
          <input
            className="form-ctrl"
            placeholder="Omschrijving werkzaamheden…"
            value={regel.omschrijving}
            onChange={e => update(i, 'omschrijving', e.target.value)}
            style={{ padding: '7px 10px' }}
          />
          <input
            className="form-ctrl"
            type="number" min="1" step="1"
            value={regel.aantal}
            onChange={e => update(i, 'aantal', e.target.value)}
            style={{ padding: '7px 8px', textAlign: 'right' }}
          />
          <input
            className="form-ctrl"
            type="number" min="0" step="0.01"
            value={regel.prijs}
            onChange={e => update(i, 'prijs', e.target.value)}
            style={{ padding: '7px 8px', textAlign: 'right' }}
          />
          <select
            className="form-ctrl"
            value={regel.btw}
            onChange={e => update(i, 'btw', e.target.value)}
            style={{ padding: '7px 6px' }}
          >
            <option value={0}>0%</option>
            <option value={9}>9%</option>
            <option value={21}>21%</option>
          </select>
          <button
            type="button"
            onClick={() => removeRegel(i)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px', display: 'flex', alignItems: 'center' }}
            title="Verwijder regel"
          >
            <span className="nav-ico" style={{ fontSize: 18 }}>delete</span>
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-ghost btn-sm" onClick={addRegel} style={{ marginTop: 8 }}>
        <span className="nav-ico" style={{ fontSize: 16 }}>add</span>
        Regel toevoegen
      </button>

      {/* Korting + BTW + Totalen */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Korting %</label>
          <input
            className="form-ctrl"
            type="number" min="0" max="100" step="0.5"
            value={korting}
            onChange={e => { const v = Number(e.target.value); setKorting(v); onChange?.(regels, v, btw) }}
            style={{ width: 90 }}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">BTW %</label>
          <select
            className="form-ctrl"
            value={btw}
            onChange={e => { const v = Number(e.target.value); setBtw(v); onChange?.(regels, korting, v) }}
            style={{ width: 90 }}
          >
            <option value={0}>0%</option>
            <option value={9}>9%</option>
            <option value={21}>21%</option>
          </select>
        </div>
      </div>

      <div className="totalen-box" style={{ marginTop: 16 }}>
        <div className="totalen-row">
          <span>Subtotaal (ex BTW)</span>
          <span>{formatEuro(totalen.subtotaal)}</span>
        </div>
        {korting > 0 && (
          <div className="totalen-row" style={{ color: '#dc2626' }}>
            <span>Korting ({korting}%)</span>
            <span>- {formatEuro(totalen.korting)}</span>
          </div>
        )}
        <div className="totalen-row">
          <span>BTW ({btw}%)</span>
          <span>{formatEuro(totalen.btw)}</span>
        </div>
        <div className="totalen-row total">
          <span>Totaal incl. BTW</span>
          <span>{formatEuro(totalen.inclBtw)}</span>
        </div>
      </div>
    </div>
  )
}
