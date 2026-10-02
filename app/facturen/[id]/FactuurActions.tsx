'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatEuro } from '@/lib/utils'
import Icon from '@/components/Icon'
import PortaalOpenKnop from '@/components/PortaalOpenKnop'

export default function FactuurActions({ factuur, factuurId, totalen, mbConfigured = false, tikkie = { aan: false, geldig: false } }: { factuur: any; factuurId: number; totalen: any; mbConfigured?: boolean; tikkie?: { aan: boolean; geldig: boolean } }) {
  const router = useRouter()

  async function updateStatus(status: string) {
    await fetch(`/api/facturen/${factuurId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  async function versturen() {
    if (!confirm('Betaalnota per e-mail versturen naar de klant? De PDF wordt bijgevoegd.')) return
    const res = await fetch(`/api/facturen/${factuurId}/versturen`, { method: 'POST' })
    const data = await res.json()
    if (data.ok) {
      if (data.tikkie?.fout) alert('Factuur verstuurd, maar zonder Tikkie: ' + data.tikkie.fout)
      updateStatus('verstuurd'); router.refresh()
    }
    else alert('Versturen mislukt: ' + (data.error ?? 'Onbekende fout'))
  }

  async function syncMoneybird() {
    const res = await fetch('/api/moneybird/sync-factuur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factuurId }),
    })
    const data = await res.json()
    if (res.ok) {
      alert('✅ Factuur staat nu in Moneybird!')
      router.refresh()
    } else {
      alert('❌ ' + (data.error ?? 'Moneybird sync mislukt'))
    }
  }

  const [refreshBezig, setRefreshBezig] = useState(false)
  async function refreshMoneybirdStatus() {
    if (!factuur.moneybird_id) return
    setRefreshBezig(true)
    try {
      const res = await fetch('/api/moneybird/refresh-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factuurId }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.statusVeranderd) alert(`Status bijgewerkt: ${data.nieuweStatus}`)
        router.refresh()
      } else {
        alert('❌ ' + (data.error ?? 'Status ophalen mislukt'))
      }
    } finally {
      setRefreshBezig(false)
    }
  }

  async function deleteFactuur() {
    if (!confirm('Factuur verwijderen?')) return
    await fetch(`/api/facturen/${factuurId}`, { method: 'DELETE' })
    router.push('/facturen')
  }

  const STATUSES = ['concept','verstuurd','betaald','te_laat']
  const STATUS_LABELS: Record<string, string> = {
    concept: 'Concept', verstuurd: 'Verstuurd', betaald: 'Betaald', te_laat: 'Te laat',
  }

  const vervalDatum = new Date(factuur.factuurdatum)
  vervalDatum.setDate(vervalDatum.getDate() + (factuur.betalingstermijn ?? 14))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Totaal */}
      <div className="card">
        <div className="section-label">Bedrag</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>{formatEuro(totalen.inclBtw)}</div>
        <div style={{ fontSize: '.78rem', color: 'var(--text-soft)' }}>incl. {Number(factuur.btw_pct)}% BTW</div>
        <div style={{ fontSize: '.78rem', color: 'var(--text-soft)', marginTop: 4 }}>
          Vervaldatum: {vervalDatum.toLocaleDateString('nl-NL')}
        </div>
      </div>

      {/* Verzenden */}
      <div className="card">
        <div className="section-label">Acties</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={versturen}
            disabled={!factuur.klant_email}
          >
            <Icon name="send" size={16} />
            Factuur versturen
          </button>
          <TikkieBlok factuur={factuur} factuurId={factuurId} tikkie={tikkie} />

          {/* Moneybird boekhouden */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 2 }}>
            {factuur.moneybird_id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  <span style={{ fontSize: '.78rem', color: 'var(--text-mute)', flex: 1 }}>In Moneybird</span>
                  {factuur.moneybird_url && (
                    <a href={factuur.moneybird_url} target="_blank" rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }}>
                      <Icon name="external" size={14} />
                    </a>
                  )}
                </div>
                <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={refreshMoneybirdStatus} disabled={refreshBezig}>
                  <Icon name="refresh" size={14} />
                  {refreshBezig ? 'Bezig…' : 'Status uit Moneybird ophalen'}
                </button>
              </div>
            ) : !mbConfigured ? (
              <div style={{ fontSize: '.75rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                Moneybird niet geconfigureerd
              </div>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                onClick={syncMoneybird}>
                <Icon name="book" size={14} />
                Verwerken in Moneybird
              </button>
            )}
          </div>
        </div>
      </div>

      <PortaalLink factuur={factuur} factuurId={factuurId} bedrag={totalen.inclBtw} />

      {/* Status */}
      <div className="card">
        <div className="section-label">Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {STATUSES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => updateStatus(s)}
              className={`btn btn-sm ${factuur.status === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ justifyContent: 'space-between' }}
              disabled={factuur.status === s}
              aria-pressed={factuur.status === s}
            >
              {STATUS_LABELS[s]}
              {factuur.status === s && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      </div>

      <Betaalplan5050 factuurId={factuurId} factuur={factuur} />

      <button type="button" className="btn btn-danger-outline btn-sm" onClick={deleteFactuur} style={{ width: '100%', justifyContent: 'center' }}>
        <Icon name="trash" size={16} />
        Verwijderen
      </button>
    </div>
  )
}

function Betaalplan5050({ factuurId, factuur }: { factuurId: number; factuur: any }) {
  const router = useRouter()
  const [bezig, setBezig] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const soort: string = factuur.soort ?? 'normaal'
  const gesplitst = soort === 'voorschot' || soort === 'eind'
  const gekoppeld = factuur.gekoppelde_factuur as { id: number; factuurnummer: string; status: string } | null
  const oudeStijl = !gesplitst && !!factuur.betaling_50_50
  // Splitsen/terugdraaien kan zolang de factuur niet in Moneybird staat en niet betaald is
  const blokkade = factuur.moneybird_id ? 'staat al in Moneybird' : (factuur.status === 'betaald' || factuur.tikkie_betaald_op) ? 'is al betaald' : null

  async function wissel() {
    const vraag = gesplitst
      ? 'Splitsing terugdraaien? De eindfactuur wordt verwijderd en deze factuur krijgt weer alle regels.'
      : 'Factuur splitsen in een voorschotfactuur (50%, deze factuur) en een eindfactuur (restant)? Vul eerst alle regels in.'
    if (!confirm(vraag)) return
    setBezig(true)
    setError(null)
    const res = await fetch(`/api/facturen/${factuurId}/50-50`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !gesplitst }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setError(data?.error ?? 'Kon niet opslaan')
    else if (gesplitst && soort === 'eind' && gekoppeld) router.push(`/facturen/${gekoppeld.id}`)
    else router.refresh()
    setBezig(false)
  }

  return (
    <div style={{ padding: 14, background: gesplitst ? 'var(--soft-blue)' : 'var(--surface-mute)', border: `1px solid ${gesplitst ? 'var(--tint-blue-bg)' : 'var(--line)'}`, borderRadius: 10 }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>50/50 betaalplan</div>
      <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2, lineHeight: 1.5 }}>
        {soort === 'voorschot' && <>Dit is de <strong>voorschotfactuur</strong> (50%). Het restant staat op de eindfactuur.</>}
        {soort === 'eind' && <>Dit is de <strong>eindfactuur</strong>. Het betaalde voorschot staat als aftrekregel op de factuur.{factuur.status === 'concept' && ' Nog niet zichtbaar voor de klant: sla hem op (of verstuur hem) na oplevering.'}</>}
        {soort === 'normaal' && !oudeStijl && !blokkade && 'Klant betaalt in 1x. Splitsen maakt een voorschotfactuur (50% bij start) en een eindfactuur (na oplevering).'}
        {soort === 'normaal' && !oudeStijl && blokkade && `Klant betaalt in 1x. Splitsen kan niet meer: deze factuur ${blokkade}.`}
        {oudeStijl && 'Oude 50/50-werkwijze (twee betaallinks op één factuur). Laat deze factuur zo afhandelen.'}
      </div>
      {gekoppeld && (
        <a href={`/facturen/${gekoppeld.id}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: 'var(--tint-blue)', fontWeight: 700 }}>
          {soort === 'voorschot' ? 'Eindfactuur' : 'Voorschotfactuur'} {gekoppeld.factuurnummer} →
        </a>
      )}
      {!oudeStijl && !blokkade && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={wissel} disabled={bezig}>
          {bezig ? 'Bezig…' : gesplitst ? 'Splitsing terugdraaien' : 'Splits in voorschot + eindfactuur'}
        </button>
      )}
      {error && <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{error}</div>}
    </div>
  )
}

function PortaalLink({ factuur, factuurId, bedrag }: { factuur: any; factuurId: number; bedrag: number }) {
  const [link, setLink] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const [gekopieerd, setGekopieerd] = useState(false)
  // Conceptfacturen zijn niet zichtbaar in het portaal; dan landt de klant op het overzicht
  const isConcept = factuur.status === 'concept'

  async function maakLink() {
    setBezig(true)
    const res = await fetch('/api/klant/sessie-aanmaken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klantId: factuur.klant_id, naar: isConcept ? undefined : `/klant/factuur/${factuurId}` }),
    })
    const data = await res.json().catch(() => ({}))
    setBezig(false)
    if (data.link) setLink(data.link)
    else alert('Link maken mislukt: ' + (data.error ?? 'Onbekende fout'))
  }

  async function kopieer() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setGekopieerd(true)
    setTimeout(() => setGekopieerd(false), 2500)
  }

  const voornaam = (factuur.klant_naam ?? '').split(' ')[0]
  const tekst = `Goedendag ${voornaam}, hier is Ozvolt Elektrotechniek. Via deze link kunt u factuur ${factuur.factuurnummer} (${formatEuro(bedrag)}) bekijken en direct betalen: ${link}`
  const tel = (factuur.klant_tel ?? '').replace(/[^0-9+]/g, '')
  const waNum = tel.startsWith('0') ? '31' + tel.slice(1) : tel.replace(/^\+/, '')

  return (
    <div className="card">
      <div className="section-label">Klantenportaal</div>
      {!link ? (
        <>
          <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={maakLink} disabled={bezig}>
            <Icon name="external" size={14} />
            {bezig ? 'Bezig…' : 'Portaallink voor klant maken'}
          </button>
          <PortaalOpenKnop
            klantId={factuur.klant_id}
            naar={isConcept ? undefined : `/klant/factuur/${factuurId}`}
            style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
          />
          <div style={{ fontSize: '.72rem', color: 'var(--text-soft)', marginTop: 6, lineHeight: 1.5 }}>
            {isConcept
              ? 'Let op: sla de factuur eerst op (met een bedrag), dan staat hij in het portaal. De link opent nu het overzicht.'
              : 'De klant komt direct op deze factuur uit, zonder in te loggen. Link blijft een jaar geldig.'}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input className="form-ctrl" value={link} readOnly style={{ fontSize: '.72rem', padding: '6px 8px' }} onFocus={e => e.target.select()} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={kopieer}>
              <Icon name={gekopieerd ? 'check' : 'copy'} size={14} />
              {gekopieerd ? 'Gekopieerd!' : 'Kopieer'}
            </button>
            {waNum && (
              <a href={`https://wa.me/${waNum}?text=${encodeURIComponent(tekst)}`} target="_blank" rel="noopener noreferrer"
                className="btn btn-success btn-sm" style={{ justifyContent: 'center' }} title="Via WhatsApp sturen">
                <Icon name="whatsapp" size={14} />
              </a>
            )}
            {factuur.klant_email && (
              <a href={`mailto:${factuur.klant_email}?subject=${encodeURIComponent(`Factuur ${factuur.factuurnummer} — Ozvolt Elektrotechniek`)}&body=${encodeURIComponent(tekst.replace(`, hier is Ozvolt Elektrotechniek. `, ',\n\n') + '\n\nMet vriendelijke groet,\nOzvolt Elektrotechniek')}`}
                className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }} title="Via e-mail sturen">
                <Icon name="mail" size={14} />
              </a>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLink(null)} title="Sluiten">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

function TikkieBlok({ factuur, factuurId, tikkie }: { factuur: any; factuurId: number; tikkie: { aan: boolean; geldig: boolean } }) {
  const router = useRouter()
  const [bezig, setBezig] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [gekopieerd, setGekopieerd] = useState(false)
  const betaaldViaTikkie = !!factuur.tikkie_betaald_op
  const oudeStijl = !!factuur.betaling_50_50 && (factuur.soort ?? 'normaal') === 'normaal'

  async function actie(soort: 'aanmaken' | 'nieuw' | 'controleren') {
    if (soort === 'nieuw' && !confirm('Nieuwe Tikkie aanmaken? De klant krijgt dan de nieuwe link in portaal en PDF; een eerder verstuurde link blijft bij Tikkie nog werken tot hij verloopt.')) return
    setBezig(soort)
    setFout(null)
    try {
      const res = await fetch(`/api/facturen/${factuurId}/tikkie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(soort === 'controleren' ? { actie: 'controleren' } : { actie: 'aanmaken', nieuw: soort === 'nieuw' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setFout(data.error ?? 'Tikkie fout')
      else if (soort === 'controleren' && !data.betaald) {
        alert(data.betaaldCenten > 0 ? `Deels betaald via Tikkie: ${formatEuro(data.betaaldCenten / 100)}` : 'Nog niet betaald via Tikkie.')
      }
      router.refresh()
    } finally {
      setBezig(null)
    }
  }

  async function kopieer() {
    await navigator.clipboard.writeText(factuur.tikkie_url)
    setGekopieerd(true)
    setTimeout(() => setGekopieerd(false), 2000)
  }

  if (!tikkie.aan) {
    return (
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 2, fontSize: '.75rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>
        Tikkie niet geconfigureerd
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {betaaldViaTikkie ? (
        <div style={{ fontSize: '.72rem', color: 'var(--tint-green)', fontWeight: 700 }}>
          ✓ Betaald via Tikkie ({new Date(factuur.tikkie_betaald_op).toLocaleDateString('nl-NL')})
        </div>
      ) : factuur.tikkie_url && tikkie.geldig ? (
        <>
          <div style={{ fontSize: '.72rem', color: 'var(--tint-green)', fontWeight: 700 }}>✓ Tikkie actief</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="form-ctrl" value={factuur.tikkie_url} readOnly style={{ fontSize: '.72rem', padding: '6px 8px' }} onFocus={e => e.target.select()} />
            <button type="button" className="btn btn-ghost btn-sm" title="Kopiëren" onClick={kopieer}>
              <Icon name={gekopieerd ? 'check' : 'copy'} size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => actie('controleren')} disabled={!!bezig}>
              <Icon name="refresh" size={14} />
              {bezig === 'controleren' ? 'Bezig…' : 'Betaling controleren'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => actie('nieuw')} disabled={!!bezig || factuur.status === 'betaald'}>
              {bezig === 'nieuw' ? 'Bezig…' : 'Nieuwe Tikkie'}
            </button>
          </div>
        </>
      ) : oudeStijl ? (
        <div style={{ fontSize: '.75rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>
          Geen Tikkie bij de oude 50/50-werkwijze (twee termijnen op één factuur)
        </div>
      ) : (
        <>
          {factuur.tikkie_url && (
            <div style={{ fontSize: '.72rem', color: 'var(--tint-amber)', fontWeight: 700 }}>
              Tikkie verlopen of bedrag gewijzigd — maak een nieuwe aan
            </div>
          )}
          <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => actie(factuur.tikkie_url ? 'nieuw' : 'aanmaken')} disabled={!!bezig || factuur.status === 'betaald'}>
            <Icon name="payments" size={14} />
            {bezig ? 'Bezig…' : factuur.tikkie_url ? 'Nieuwe Tikkie' : 'Tikkie aanmaken'}
          </button>
          {factuur.status === 'concept' && !factuur.tikkie_url && (
            <div style={{ fontSize: '.7rem', color: 'var(--text-soft)' }}>Wordt ook automatisch aangemaakt bij versturen.</div>
          )}
        </>
      )}
      {fout && <div style={{ fontSize: 12, color: '#dc2626' }}>{fout}</div>}
    </div>
  )
}
