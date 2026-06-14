'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatEuro } from '@/lib/utils'
import Icon from '@/components/Icon'

export default function FactuurActions({ factuur, factuurId, totalen, mbConfigured = false }: { factuur: any; factuurId: number; totalen: any; mbConfigured?: boolean }) {
  const router = useRouter()
  const [betaallinkLoading, setBetaallinkLoading] = useState(false)

  async function updateStatus(status: string) {
    await fetch(`/api/facturen/${factuurId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  async function maakBetaallink() {
    if (!confirm('Online betaallink (via Moneybird) aanmaken voor deze factuur?')) return
    setBetaallinkLoading(true)
    try {
      const res = await fetch(`/api/facturen/${factuurId}/betaallink`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) { router.refresh() }
      else alert('Fout: ' + (data.error ?? 'Moneybird fout'))
    } catch (err: any) {
      alert('Fout: ' + (err?.message ?? 'Onbekend'))
    } finally {
      setBetaallinkLoading(false)
    }
  }

  async function versturen() {
    if (!confirm('Betaalnota per e-mail versturen naar de klant? De PDF wordt bijgevoegd.')) return
    const res = await fetch(`/api/facturen/${factuurId}/versturen`, { method: 'POST' })
    const data = await res.json()
    if (data.ok) { updateStatus('verstuurd'); router.refresh() }
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
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0d1b3e', marginBottom: 4 }}>{formatEuro(totalen.inclBtw)}</div>
        <div style={{ fontSize: '.78rem', color: '#8ba8c4' }}>incl. {Number(factuur.btw_pct)}% BTW</div>
        <div style={{ fontSize: '.78rem', color: '#8ba8c4', marginTop: 4 }}>
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
          <button
            type="button"
            className="btn btn-success btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => updateStatus('betaald')}
            disabled={factuur.status === 'betaald'}
          >
            <Icon name="check" size={16} />
            Markeer als betaald
          </button>

          {/* Online betaallink (Moneybird) */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 2 }}>
            {factuur.betaal_url ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '.72rem', color: '#16a34a', fontWeight: 700 }}>✓ Online betaallink actief</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="form-ctrl" value={factuur.betaal_url} readOnly style={{ fontSize: '.72rem', padding: '6px 8px' }} />
                  <button type="button" className="btn btn-ghost btn-sm" title="Kopiëren"
                    onClick={() => navigator.clipboard.writeText(factuur.betaal_url)}>
                    <Icon name="copy" size={14} />
                  </button>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={maakBetaallink} disabled={betaallinkLoading}>
                  <Icon name="refresh" size={14} />
                  {betaallinkLoading ? 'Bezig…' : 'Nieuwe link aanmaken'}
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                onClick={maakBetaallink} disabled={betaallinkLoading}>
                <Icon name="payments" size={14} />
                {betaallinkLoading ? 'Bezig…' : 'Online betaallink aanmaken'}
              </button>
            )}
          </div>

          {/* Moneybird boekhouden */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 2 }}>
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
            >
              {STATUS_LABELS[s]}
              {factuur.status === s && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn btn-danger btn-sm" onClick={deleteFactuur} style={{ width: '100%', justifyContent: 'center' }}>
        <Icon name="trash" size={16} />
        Verwijderen
      </button>
    </div>
  )
}
