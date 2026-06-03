'use client'

import { useRouter } from 'next/navigation'
import { formatEuro } from '@/lib/utils'

export default function FactuurActions({ factuur, factuurId, totalen }: { factuur: any; factuurId: number; totalen: any }) {
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
    if (!confirm('Factuur per e-mail verzenden naar de klant?')) return
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
            <span className="material-symbols-outlined nav-ico" style={{ fontSize: 16 }}>send</span>
            Factuur versturen
          </button>
          <button
            type="button"
            className="btn btn-success btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => updateStatus('betaald')}
            disabled={factuur.status === 'betaald'}
          >
            <span className="material-symbols-outlined nav-ico" style={{ fontSize: 16 }}>check_circle</span>
            Markeer als betaald
          </button>

          {/* Moneybird */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 2 }}>
            {factuur.moneybird_id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                <span style={{ fontSize: '.78rem', color: '#5b7fa6', flex: 1 }}>In Moneybird</span>
                {factuur.moneybird_url && (
                  <a href={factuur.moneybird_url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                  </a>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={syncMoneybird}
              >
                <img src="https://www.moneybird.com/favicon.ico" style={{ width: 14, height: 14 }} alt="" />
                Stuur naar Moneybird
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
              {factuur.status === s && <span className="nav-ico" style={{ fontSize: 14 }}>check</span>}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn btn-danger btn-sm" onClick={deleteFactuur} style={{ width: '100%', justifyContent: 'center' }}>
        <span className="nav-ico" style={{ fontSize: 16 }}>delete</span>
        Verwijderen
      </button>
    </div>
  )
}
