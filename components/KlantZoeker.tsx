'use client'

import { useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/Icon'
import { klantDetail, normNaam, zoekDubbeleKlant, type KlantOptie } from '@/lib/klant-match'

/* Klant kiezen met een zoekveld (typeahead) in plaats van een lange select.
   Optioneel met velden voor een nieuwe klant; bestaat die al (zelfde naam, e-mail
   of telefoon), dan verschijnt "Deze klant bestaat al: … — gebruiken?". De server
   (lib/klanten.ts: vindOfMaakKlant) hergebruikt een bestaande klant hoe dan ook. */

export type NieuweKlantVeldNamen = {
  naam: string
  telefoon: string
  email: string
  locatie?: string
  type?: string
}

export function filterKlanten(klanten: KlantOptie[], q: string, max = 8): KlantOptie[] {
  const z = normNaam(q)
  if (!z) return klanten.slice(0, max)
  const cijfers = q.replace(/\D/g, '')
  return klanten
    .filter(k =>
      normNaam(k.naam).includes(z) ||
      normNaam(k.email).includes(z) ||
      normNaam(k.locatie).includes(z) ||
      (cijfers.length >= 3 && String(k.telefoon ?? '').replace(/\D/g, '').includes(cijfers)))
    .slice(0, max)
}

export function NieuweKlantVelden({
  klanten, namen, beginNaam = '', verplicht = false, onGebruik, gebruikHrefPrefix,
}: {
  klanten: KlantOptie[]
  namen: NieuweKlantVeldNamen
  beginNaam?: string
  verplicht?: boolean
  onGebruik?: (k: KlantOptie) => void
  gebruikHrefPrefix?: string
}) {
  const [naam, setNaam] = useState(beginNaam)
  const [telefoon, setTelefoon] = useState('')
  const [email, setEmail] = useState('')
  const dubbel = useMemo(() => zoekDubbeleKlant(klanten, { naam, email, telefoon }), [klanten, naam, email, telefoon])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <div>
          <label className="form-label">Naam{verplicht ? ' *' : ''}</label>
          <input className="form-ctrl" name={namen.naam} value={naam} onChange={e => setNaam(e.target.value)}
            placeholder="Voor- en achternaam of bedrijfsnaam" required={verplicht} />
        </div>
        <div>
          <label className="form-label">Telefoon</label>
          <input className="form-ctrl" name={namen.telefoon} type="tel" value={telefoon} onChange={e => setTelefoon(e.target.value)} placeholder="06 12345678" />
        </div>
        <div>
          <label className="form-label">E-mail</label>
          <input className="form-ctrl" name={namen.email} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="naam@email.nl" />
        </div>
        {namen.locatie && (
          <div>
            <label className="form-label">Locatie/plaats</label>
            <input className="form-ctrl" name={namen.locatie} placeholder="Culemborg" />
          </div>
        )}
        {namen.type && (
          <div>
            <label className="form-label">Type</label>
            <select className="form-ctrl" name={namen.type} defaultValue="Particulier">
              <option value="Particulier">Particulier</option>
              <option value="Zakelijk">Zakelijk</option>
            </select>
          </div>
        )}
      </div>
      {dubbel && (
        <div className="melding-dubbel" role="status">
          <span>
            Deze klant bestaat al: <strong>{dubbel.naam}</strong>
            {klantDetail(dubbel) && <> ({klantDetail(dubbel)})</>} — gebruiken?
          </span>
          {onGebruik ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onGebruik(dubbel)}>Gebruiken</button>
          ) : gebruikHrefPrefix ? (
            <Link href={`${gebruikHrefPrefix}${dubbel.id}`} className="btn btn-primary btn-sm">Bestaande klant openen</Link>
          ) : null}
        </div>
      )}
      {dubbel && !onGebruik && (
        <div style={{ fontSize: '.74rem', color: 'var(--text-soft)' }}>
          Opslaan maakt geen tweede klant aan: de bestaande klant wordt gebruikt.
        </div>
      )}
    </div>
  )
}

export default function KlantZoeker({
  klanten, name = 'klant_id', defaultId, nieuw, label = 'Klant', onKies,
}: {
  klanten: KlantOptie[]
  name?: string
  defaultId?: number | null
  /** Veldnamen voor een nieuwe klant; weglaten = alleen bestaande klanten kiezen */
  nieuw?: NieuweKlantVeldNamen
  label?: string
  onKies?: (k: KlantOptie | null) => void
}) {
  const [gekozen, setGekozen] = useState<KlantOptie | null>(() => klanten.find(k => k.id === defaultId) ?? null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [actief, setActief] = useState(0)
  const [nieuwOpen, setNieuwOpen] = useState(false)
  const [beginNaam, setBeginNaam] = useState('')
  const [sleutel, setSleutel] = useState(0)
  const invoerRef = useRef<HTMLInputElement>(null)
  const lijstId = useId()

  const treffers = useMemo(() => filterKlanten(klanten, q), [klanten, q])

  function kies(k: KlantOptie | null) {
    setGekozen(k)
    setOpen(false)
    setQ('')
    if (k) setNieuwOpen(false)
    onKies?.(k)
  }

  function startNieuw() {
    setBeginNaam(q.trim())
    setSleutel(s => s + 1)
    setNieuwOpen(true)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActief(a => Math.min(a + 1, treffers.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActief(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') {
      if (open && treffers[actief]) { e.preventDefault(); kies(treffers[actief]) }
    } else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input type="hidden" name={name} value={gekozen?.id ?? ''} />
      <div>
        <label className="form-label">{label}</label>
        {gekozen ? (
          <div className="zoeker-keuze">
            <div>
              <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{gekozen.naam}</div>
              {klantDetail(gekozen) && <div style={{ fontSize: '.74rem', color: 'var(--text-soft)' }}>{klantDetail(gekozen)}</div>}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { kies(null); setTimeout(() => invoerRef.current?.focus(), 0) }}>
              Wijzigen
            </button>
          </div>
        ) : (
          <div className="zoeker">
            <input
              ref={invoerRef}
              className="form-ctrl"
              value={q}
              onChange={e => { setQ(e.target.value); setOpen(true); setActief(0) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={onKeyDown}
              placeholder="Zoek op naam, e-mail, telefoon of plaats…"
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-controls={lijstId}
              aria-autocomplete="list"
            />
            {open && (
              <div className="zoeker-lijst" role="listbox" id={lijstId}>
                {treffers.length === 0 && <div className="zoeker-leeg">Geen klant gevonden.</div>}
                {treffers.map((k, i) => (
                  <button key={k.id} type="button" role="option" aria-selected={i === actief}
                    className={`zoeker-optie ${i === actief ? 'actief' : ''}`}
                    onMouseDown={e => e.preventDefault()} onClick={() => kies(k)}>
                    {k.naam}
                    {klantDetail(k) && <span className="zoeker-optie-sub">{klantDetail(k)}</span>}
                  </button>
                ))}
                {nieuw && (
                  <button type="button" className="zoeker-optie" onMouseDown={e => e.preventDefault()} onClick={startNieuw}
                    style={{ borderTop: '1px solid var(--line)', marginTop: 4, color: 'var(--accent)', fontWeight: 600 }}>
                    <Icon name="plus" size={14} /> Nieuwe klant{q.trim() ? ` "${q.trim()}"` : ''}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {nieuw && !gekozen && (
        nieuwOpen ? (
          <div style={{ background: 'var(--surface-mute)', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '.72rem', color: 'var(--text-soft)', fontWeight: 700, textTransform: 'uppercase' }}>Nieuwe klant</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNieuwOpen(false)}>
                <Icon name="x" size={14} />
              </button>
            </div>
            <NieuweKlantVelden key={sleutel} klanten={klanten} namen={nieuw} beginNaam={beginNaam} verplicht onGebruik={k => kies(k)} />
          </div>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={startNieuw}>
            <Icon name="plus" size={14} /> Nieuwe klant
          </button>
        )
      )}
    </div>
  )
}
