'use client'

import { useState } from 'react'
import type { RegelItem } from '@/lib/utils'
import { berekenTotalen, formatEuro } from '@/lib/utils'
import Icon from '@/components/Icon'

interface Props {
  initialRegels?: RegelItem[]
  kortingBedrag?: number
  btwPct?: number
  onChange?: (regels: RegelItem[], korting: number, btw: number) => void
}

export default function RegelEditor({ initialRegels = [], kortingBedrag = 0, btwPct = 21, onChange }: Props) {
  const [regels, setRegels] = useState<RegelItem[]>(
    initialRegels.length > 0 ? initialRegels : [{ omschrijving: '', beschrijving: '', aantal: 1, prijs: 0, btw: 21 }]
  )
  const [korting, setKorting] = useState(kortingBedrag)
  const [btw, setBtw] = useState(btwPct)
  // Prijs als string bewaren zodat invoer niet vastloopt op leading zero
  const [prijsInput, setPrijsInput] = useState<string[]>(
    (initialRegels.length > 0 ? initialRegels : [{ prijs: 0 }]).map(r => String(r.prijs === 0 ? '' : r.prijs))
  )

  function updatePrijsStr(index: number, raw: string) {
    const newPrijsInputs = prijsInput.map((v, i) => i === index ? raw : v)
    setPrijsInput(newPrijsInputs)
    const parsed = parseFloat(raw.replace(',', '.')) || 0
    const updated = regels.map((r, i) => i === index ? { ...r, prijs: parsed } : r)
    setRegels(updated)
    onChange?.(updated, korting, btw)
  }

  function update(index: number, field: keyof RegelItem, value: string | number) {
    const updated = regels.map((r, i) => {
      if (i !== index) return r
      if (field === 'omschrijving' || field === 'beschrijving') return { ...r, [field]: value as string }
      return { ...r, [field]: Number(value) }
    })
    setRegels(updated)
    onChange?.(updated, korting, btw)
  }

  function addRegel() {
    const updated = [...regels, { omschrijving: '', beschrijving: '', aantal: 1, prijs: 0, btw: 21 }]
    setRegels(updated)
    setPrijsInput([...prijsInput, ''])
    onChange?.(updated, korting, btw)
  }

  function removeRegel(index: number) {
    if (regels.length === 1) return
    const updated = regels.filter((_, i) => i !== index)
    setRegels(updated)
    setPrijsInput(prijsInput.filter((_, i) => i !== index))
    onChange?.(updated, korting, btw)
  }

  const totalen = berekenTotalen(regels, korting, btw)

  return (
    <div>
      <input type="hidden" name="regels_json" value={JSON.stringify(regels)} />
      <input type="hidden" name="korting_pct" value={korting} />
      <input type="hidden" name="btw_pct" value={btw} />

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 70px 36px', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.06em' }}>Omschrijving</span>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', textAlign: 'right' }}>Aantal</span>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', textAlign: 'right' }}>Prijs (ex)</span>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', textAlign: 'center' }}>BTW%</span>
        <span />
      </div>

      {regels.map((regel, i) => (
        <div key={i} style={{ marginBottom: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
          {/* Rij 1: omschrijving + aantal + prijs + btw + delete */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 70px 36px', gap: 6, alignItems: 'center' }}>
            <input
              className="form-ctrl"
              placeholder="Omschrijving (bijv. Montagekosten)"
              value={regel.omschrijving}
              onChange={e => update(i, 'omschrijving', e.target.value)}
              style={{ padding: '7px 10px', fontWeight: 600 }}
            />
            <input
              className="form-ctrl"
              type="number" min="0.1" step="0.1"
              value={regel.aantal}
              onChange={e => update(i, 'aantal', e.target.value)}
              onFocus={e => e.target.select()}
              style={{ padding: '7px 8px', textAlign: 'right' }}
            />
            <input
              className="form-ctrl"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={prijsInput[i] ?? ''}
              onChange={e => updatePrijsStr(i, e.target.value)}
              onFocus={e => e.target.select()}
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
              disabled={regels.length === 1}
              style={{ background: 'none', border: 'none', cursor: regels.length === 1 ? 'not-allowed' : 'pointer', color: '#dc2626', padding: '4px', opacity: regels.length === 1 ? .3 : 1 }}
              title="Verwijder regel"
            >
              <Icon name="trash" size={18} />
            </button>
          </div>

          {/* Rij 2: extra beschrijving — multiline, auto-groeiend (Shift+Enter voor nieuwe regel) */}
          <div style={{ marginTop: 6 }}>
            <textarea
              className="form-ctrl"
              placeholder="Extra omschrijving / toelichting — Shift+Enter voor nieuwe regel"
              value={regel.beschrijving ?? ''}
              onChange={e => update(i, 'beschrijving', e.target.value)}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
              }}
              ref={el => {
                if (el) {
                  el.style.height = 'auto'
                  el.style.height = el.scrollHeight + 'px'
                }
              }}
              rows={1}
              style={{ padding: '6px 10px', fontSize: '.8rem', color: '#475569', background: '#fff', borderStyle: 'dashed', fontStyle: 'italic', resize: 'none', overflow: 'hidden', lineHeight: 1.5, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {/* Regelsubtotaal */}
          {regel.prijs > 0 && (
            <div style={{ textAlign: 'right', fontSize: '.75rem', color: '#8ba8c4', marginTop: 4 }}>
              {regel.aantal} × {formatEuro(regel.prijs)} = <strong style={{ color: '#0d1b3e' }}>{formatEuro(regel.aantal * regel.prijs)}</strong>
            </div>
          )}
        </div>
      ))}

      <button type="button" className="btn btn-ghost btn-sm" onClick={addRegel} style={{ marginBottom: 20 }}>
        <Icon name="plus" size={16} />
        Regel toevoegen
      </button>

      {/* Korting (€) + BTW */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Korting (€)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8ba8c4', fontSize: '.88rem', pointerEvents: 'none' }}>€</span>
            <input
              className="form-ctrl"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={korting === 0 ? '' : String(korting)}
              onChange={e => {
                const v = parseFloat(e.target.value.replace(',', '.')) || 0
                setKorting(v)
                onChange?.(regels, v, btw)
              }}
              onFocus={e => e.target.select()}
              style={{ width: 110, paddingLeft: 24 }}
            />
          </div>
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

      {/* Totalen */}
      <div className="totalen-box" style={{ marginTop: 16 }}>
        <div className="totalen-row">
          <span>Subtotaal (ex BTW)</span>
          <span>{formatEuro(totalen.subtotaal)}</span>
        </div>
        {totalen.korting > 0 && (
          <div className="totalen-row" style={{ color: '#16a34a' }}>
            <span>Korting</span>
            <span>− {formatEuro(totalen.korting)}</span>
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
