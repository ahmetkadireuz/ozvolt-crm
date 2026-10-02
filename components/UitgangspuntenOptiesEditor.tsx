'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/Icon'
import { formatEuro } from '@/lib/utils'
import { meerprijsInclBtw, type OfferteSjabloon, type UoItem, type UoSoort } from '@/lib/uitgangspunten'

interface Props {
  initialItems?: UoItem[]
  btwPct: number
  disabled?: boolean
  onChange?: (items: UoItem[]) => void
}

const SOORT_STIJL: Record<UoSoort, { label: string; color: string; bg: string }> = {
  uitgangspunt: { label: 'Uitgangspunt', color: 'var(--tint-blue)', bg: 'var(--tint-blue-bg)' },
  optie:        { label: 'Optie',        color: 'var(--tint-amber)', bg: 'var(--tint-amber-bg)' },
}

const kleineKnop: React.CSSProperties = {
  background: 'none', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer',
  color: 'var(--text-mute)', padding: '2px 8px', fontSize: '.8rem', lineHeight: 1.4,
}

function Badge({ soort }: { soort: UoSoort }) {
  const s = SOORT_STIJL[soort]
  return (
    <span style={{ fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function ItemVelden({ item, btwPct, disabled, onUpdate }: {
  item: UoItem; btwPct: number; disabled?: boolean; onUpdate: (patch: Partial<UoItem>) => void
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <select
          className="form-ctrl"
          value={item.soort}
          disabled={disabled}
          onChange={e => onUpdate({ soort: e.target.value as UoSoort, meerprijs: e.target.value === 'optie' ? item.meerprijs : null })}
          style={{ padding: '7px 8px', width: 140, flex: '0 0 auto' }}
        >
          <option value="uitgangspunt">Uitgangspunt</option>
          <option value="optie">Optie</option>
        </select>
        <input
          className="form-ctrl"
          placeholder={item.soort === 'optie' ? 'Bijv. HomeWizard P1 Meter' : 'Bijv. Uitgangspunten standaardinstallatie'}
          value={item.titel}
          disabled={disabled}
          onChange={e => onUpdate({ titel: e.target.value })}
          style={{ padding: '7px 10px', fontWeight: 600, flex: '1 1 200px', minWidth: 0 }}
        />
      </div>
      <textarea
        className="form-ctrl"
        rows={4}
        placeholder={'Tekst voor de klant. Begin een regel met * of - voor een opsomming.'}
        value={item.tekst}
        disabled={disabled}
        onChange={e => onUpdate({ tekst: e.target.value })}
        style={{ padding: '7px 10px', fontSize: '.85rem' }}
      />
      {item.soort === 'optie' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          <label className="form-label" style={{ margin: 0 }}>Meerprijs excl. btw</label>
          <input
            className="form-ctrl"
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            value={item.meerprijs ?? ''}
            disabled={disabled}
            onChange={e => onUpdate({ meerprijs: e.target.value === '' ? null : Number(e.target.value) })}
            style={{ padding: '6px 10px', width: 120 }}
          />
          {item.meerprijs !== null && Number.isFinite(item.meerprijs) && (
            <span style={{ fontSize: '.78rem', color: 'var(--text-mute)' }}>
              = {formatEuro(meerprijsInclBtw(item.meerprijs, btwPct))} incl. {btwPct}% btw · telt niet mee in het totaal
            </span>
          )}
        </div>
      )}
    </>
  )
}

export default function UitgangspuntenOptiesEditor({ initialItems = [], btwPct, disabled = false, onChange }: Props) {
  const [items, setItems] = useState<UoItem[]>(initialItems)
  const [sjablonen, setSjablonen] = useState<OfferteSjabloon[] | null>(null)
  const [laden, setLaden] = useState(false)
  const [beheer, setBeheer] = useState(false)
  const [bewerkId, setBewerkId] = useState<number | null>(null)
  const [bewerk, setBewerk] = useState<UoItem | null>(null)
  const [melding, setMelding] = useState<string | null>(null)

  useEffect(() => { if (!disabled) laadSjablonen() }, [disabled]) // eslint-disable-line react-hooks/exhaustive-deps

  function zet(updated: UoItem[]) {
    setItems(updated)
    onChange?.(updated)
  }

  function updateItem(index: number, patch: Partial<UoItem>) {
    zet(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function verplaats(index: number, richting: -1 | 1) {
    const doel = index + richting
    if (doel < 0 || doel >= items.length) return
    const updated = [...items]
    ;[updated[index], updated[doel]] = [updated[doel], updated[index]]
    zet(updated)
  }

  async function laadSjablonen(): Promise<OfferteSjabloon[]> {
    if (sjablonen) return sjablonen
    setLaden(true)
    const res = await fetch('/api/offerte-sjablonen', { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    setLaden(false)
    const lijst: OfferteSjabloon[] = Array.isArray(data.sjablonen) ? data.sjablonen : []
    setSjablonen(lijst)
    return lijst
  }

  function voegSjabloonIn(id: number) {
    const s = sjablonen?.find(x => x.id === id)
    if (!s) return
    zet([...items, { soort: s.soort, titel: s.titel, tekst: s.tekst, meerprijs: s.meerprijs }])
  }

  async function opslaanAlsSjabloon(item: UoItem) {
    if (!item.titel.trim()) { setMelding('Geef het item eerst een titel.'); return }
    const res = await fetch('/api/offerte-sjablonen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.sjabloon) { setMelding(data.error ?? 'Sjabloon opslaan mislukt'); return }
    setSjablonen(prev => (prev ? [...prev, data.sjabloon] : prev))
    setMelding(`Opgeslagen als sjabloon: ${data.sjabloon.titel}`)
  }

  async function bewaarSjabloon() {
    if (bewerkId === null || !bewerk) return
    const res = await fetch(`/api/offerte-sjablonen/${bewerkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bewerk),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.sjabloon) { setMelding(data.error ?? 'Sjabloon bijwerken mislukt'); return }
    setSjablonen(prev => prev?.map(s => (s.id === bewerkId ? data.sjabloon : s)) ?? prev)
    setBewerkId(null)
    setBewerk(null)
  }

  async function verwijderSjabloon(s: OfferteSjabloon) {
    if (!confirm(`Sjabloon "${s.titel}" verwijderen? Offertes waarin het al staat blijven ongewijzigd.`)) return
    const res = await fetch(`/api/offerte-sjablonen/${s.id}`, { method: 'DELETE' })
    if (!res.ok) { setMelding('Sjabloon verwijderen mislukt'); return }
    setSjablonen(prev => prev?.filter(x => x.id !== s.id) ?? prev)
  }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: 8, background: 'var(--surface-mute)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <Badge soort={item.soort} />
            <span style={{ flex: 1 }} />
            {!disabled && (
              <>
                <button type="button" style={kleineKnop} disabled={i === 0} onClick={() => verplaats(i, -1)} aria-label="Omhoog">↑</button>
                <button type="button" style={kleineKnop} disabled={i === items.length - 1} onClick={() => verplaats(i, 1)} aria-label="Omlaag">↓</button>
                <button type="button" style={kleineKnop} onClick={() => opslaanAlsSjabloon(item)}>Opslaan als sjabloon</button>
                <button
                  type="button"
                  onClick={() => zet(items.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}
                  aria-label="Verwijderen"
                >
                  <Icon name="trash" size={18} />
                </button>
              </>
            )}
          </div>
          <ItemVelden item={item} btwPct={btwPct} disabled={disabled} onUpdate={patch => updateItem(i, patch)} />
        </div>
      ))}

      {melding && <div style={{ fontSize: '.78rem', color: 'var(--text-mute)', margin: '6px 0' }}>{melding}</div>}

      {!disabled && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => zet([...items, { soort: 'uitgangspunt', titel: '', tekst: '', meerprijs: null }])}>
            <Icon name="plus" size={16} />
            Uitgangspunt
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => zet([...items, { soort: 'optie', titel: '', tekst: '', meerprijs: null }])}>
            <Icon name="plus" size={16} />
            Optie
          </button>
          <select
            className="form-ctrl"
            value=""
            onChange={e => { const v = e.target.value; if (v === 'beheer') setBeheer(true); else if (v) voegSjabloonIn(Number(v)) }}
            style={{ padding: '6px 8px', width: 'auto', maxWidth: '100%', fontSize: '.84rem' }}
          >
            <option value="">{laden ? 'Sjablonen laden…' : 'Sjabloon invoegen…'}</option>
            {sjablonen?.map(s => (
              <option key={s.id} value={s.id}>{s.soort === 'optie' ? 'Optie' : 'Uitgangspunt'} · {s.titel}</option>
            ))}
            {sjablonen && sjablonen.length === 0 && <option disabled>Nog geen sjablonen</option>}
            <option value="beheer">Sjablonen beheren…</option>
          </select>
        </div>
      )}

      {beheer && !disabled && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.08em', flex: 1 }}>
              Sjablonen beheren
            </span>
            <button type="button" style={kleineKnop} onClick={() => { setBeheer(false); setBewerkId(null); setBewerk(null) }}>Sluiten</button>
          </div>
          {sjablonen === null && <div style={{ fontSize: '.8rem', color: 'var(--text-mute)' }}>Laden…</div>}
          {sjablonen?.length === 0 && (
            <div style={{ fontSize: '.8rem', color: 'var(--text-mute)' }}>Nog geen sjablonen. Gebruik &lsquo;Opslaan als sjabloon&rsquo; bij een item.</div>
          )}
          {sjablonen?.map(s => (
            <div key={s.id} style={{ marginBottom: 6, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', background: 'var(--surface)' }}>
              {bewerkId === s.id && bewerk ? (
                <>
                  <ItemVelden item={bewerk} btwPct={btwPct} onUpdate={patch => setBewerk({ ...bewerk, ...patch })} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={bewaarSjabloon}>Sjabloon opslaan</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setBewerkId(null); setBewerk(null) }}>Annuleren</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Badge soort={s.soort} />
                  <span style={{ fontWeight: 600, fontSize: '.85rem', flex: '1 1 140px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.titel}
                    {s.soort === 'optie' && s.meerprijs !== null && <span style={{ fontWeight: 400, color: 'var(--text-mute)' }}> · {formatEuro(s.meerprijs)} excl.</span>}
                  </span>
                  <button type="button" style={kleineKnop} onClick={() => { setBewerkId(s.id); setBewerk({ soort: s.soort, titel: s.titel, tekst: s.tekst, meerprijs: s.meerprijs }) }}>
                    <Icon name="edit" size={14} />
                  </button>
                  <button type="button" style={{ ...kleineKnop, color: '#dc2626' }} onClick={() => verwijderSjabloon(s)}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
