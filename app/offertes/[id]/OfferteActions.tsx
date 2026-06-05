'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatEuro } from '@/lib/utils'

export default function OfferteActions({ offerte, offerteId, totalen, acceptUrl, facturen, afspraken }: {
  offerte: any; offerteId: number; totalen: any; acceptUrl: string | null; facturen: any[]; afspraken: any[]
}) {
  const router = useRouter()
  const [inclAfspraak, setInclAfspraak] = useState(false)
  const [maakAfspraakLoading, setMaakAfspraakLoading] = useState(false)

  async function updateStatus(status: string) {
    await fetch(`/api/offertes/${offerteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  async function versturen() {
    const afspraakId = afspraken[0]?.id ?? null
    const msg = inclAfspraak && afspraakId
      ? 'Offerte + werkafspraken per e-mail versturen naar de klant?'
      : 'Offerte per e-mail versturen naar de klant?'
    if (!confirm(msg)) return
    const res = await fetch(`/api/offertes/${offerteId}/versturen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inclAfspraak: inclAfspraak && !!afspraakId, afspraakId }),
    })
    const data = await res.json()
    if (data.ok) router.refresh()
    else alert('Versturen mislukt: ' + (data.error ?? 'Onbekende fout'))
  }

  async function maakAfspraak() {
    setMaakAfspraakLoading(true)
    const res = await fetch('/api/afspraken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klant_id: offerte.klant_id, offerte_id: offerteId, datum: new Date().toISOString().slice(0, 10), afspraken: [] }),
    })
    const data = await res.json()
    setMaakAfspraakLoading(false)
    if (data.id) { router.push(`/afspraken/${data.id}`); router.refresh() }
    else alert('Aanmaken mislukt')
  }

  async function maakFactuur() {
    const res = await fetch(`/api/offertes/${offerteId}/factuur`, { method: 'POST' })
    const data = await res.json()
    if (data.factuurId) router.push(`/facturen/${data.factuurId}`)
    else alert('Aanmaken mislukt')
  }

  const [mollieLoading, setMollieLoading] = useState(false)

  async function maakMollieBetaallinks() {
    if (!confirm('Moneybird betaallinks aanmaken? Factuur wordt aangemaakt in Moneybird en gekoppeld aan ABN AMRO via Ponto.')) return
    setMollieLoading(true)
    try {
      const res = await fetch(`/api/offertes/${offerteId}/betaallinks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betaling_50_50: offerte.betaling_50_50 }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (data.ok) { alert('Betaallinks aangemaakt!'); router.refresh() }
      else alert('Fout: ' + (data.error ?? `Server error ${res.status} — controleer Moneybird API token en admin ID in Vercel`))
    } catch (err: any) {
      alert('Fout: ' + (err?.message ?? 'Onbekend'))
    } finally {
      setMollieLoading(false)
    }
  }

  async function deleteOfferte() {
    if (!confirm('Offerte verwijderen?')) return
    await fetch(`/api/offertes/${offerteId}`, { method: 'DELETE' })
    router.push('/offertes')
  }

  const STATUSES = ['concept','gestuurd','geaccepteerd','verlopen','geweigerd']
  const STATUS_LABELS: Record<string, string> = {
    concept: 'Concept', gestuurd: 'Gestuurd', geaccepteerd: 'Geaccepteerd', verlopen: 'Verlopen', geweigerd: 'Geweigerd',
  }
  const [statusNotitie, setStatusNotitie] = useState(offerte.status_notitie ?? '')

  async function saveStatusNotitie() {
    await fetch(`/api/offertes/${offerteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: offerte.status, status_notitie: statusNotitie }),
    })
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Totaal */}
      <div className="card">
        <div className="section-label">Bedrag</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0d1b3e', marginBottom: 4 }}>
          {formatEuro(totalen.inclBtw)}
        </div>
        <div style={{ fontSize: '.78rem', color: '#8ba8c4' }}>incl. {Number(offerte.btw_pct)}% BTW</div>
        {Number(offerte.korting_pct) > 0 && (
          <div style={{ fontSize: '.78rem', color: '#dc2626', marginTop: 2 }}>{offerte.korting_pct}% korting toegepast</div>
        )}
      </div>

      {/* Werkafspraken */}
      <div className="card">
        <div className="section-label">Werkafspraken</div>
        {afspraken.length === 0 ? (
          <div>
            <p style={{ fontSize: '.82rem', color: '#8ba8c4', margin: '0 0 10px' }}>
              Geen werkafspraken gekoppeld aan deze offerte.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={maakAfspraak}
              disabled={maakAfspraakLoading}
            >
              <span className="nav-ico" style={{ fontSize: 16 }}>add</span>
              {maakAfspraakLoading ? 'Aanmaken…' : 'Nieuw werkafspraken document'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {afspraken.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '.84rem', fontWeight: 700, color: '#0d1b3e' }}>
                    OZWA-{String(a.afspraaknummer).padStart(4,'0')}
                  </div>
                  <div style={{ fontSize: '.72rem', color: '#8ba8c4' }}>
                    {a.sent_at ? `Verstuurd ${new Date(a.sent_at).toLocaleDateString('nl-NL')}` : 'Nog niet verstuurd'}
                  </div>
                </div>
                <Link href={`/afspraken/${a.id}`} className="btn btn-ghost btn-sm">
                  Openen →
                </Link>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              onClick={maakAfspraak}
              disabled={maakAfspraakLoading}
            >
              <span className="nav-ico" style={{ fontSize: 16 }}>add</span>
              Nog een document aanmaken
            </button>
          </div>
        )}
      </div>

      {/* Verzenden */}
      <div className="card">
        <div className="section-label">Verzenden</div>
        {!offerte.klant_email && (
          <div className="alert alert-err" style={{ fontSize: '.78rem', padding: '8px 12px' }}>Klant heeft geen e-mailadres.</div>
        )}
        {afspraken.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem', color: '#374151', marginBottom: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={inclAfspraak}
              onChange={e => setInclAfspraak(e.target.checked)}
              style={{ width: 15, height: 15 }}
            />
            Werkafspraken meesturen (OZWA-{String(afspraken[0].afspraaknummer).padStart(4,'0')})
          </label>
        )}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
          onClick={versturen}
          disabled={!offerte.klant_email}
        >
          <span className="nav-ico" style={{ fontSize: 16 }}>send</span>
          {inclAfspraak ? 'Offerte + afspraken versturen' : 'E-mail versturen'}
        </button>
        {acceptUrl && (
          <div>
            <div style={{ fontSize: '.72rem', color: '#8ba8c4', marginBottom: 4 }}>Akkoord-link:</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-ctrl" value={acceptUrl} readOnly style={{ fontSize: '.72rem', padding: '6px 8px' }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(acceptUrl)}>
                <span className="nav-ico" style={{ fontSize: 16 }}>content_copy</span>
              </button>
            </div>
          </div>
        )}
        {offerte.sent_at && (
          <div style={{ fontSize: '.75rem', color: '#8ba8c4', marginTop: 8 }}>
            Verzonden: {new Date(offerte.sent_at).toLocaleString('nl-NL')}
          </div>
        )}
        {offerte.accepted_at && (
          <div style={{ fontSize: '.75rem', color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
            ✓ Akkoord ontvangen van {offerte.accepted_name}
          </div>
        )}
      </div>

      {/* Factuur aanmaken */}
      {facturen.length === 0 && offerte.status === 'geaccepteerd' && (
        <button type="button" className="btn btn-success" style={{ width: '100%', justifyContent: 'center' }} onClick={maakFactuur}>
          <span className="nav-ico" style={{ fontSize: 16 }}>receipt_long</span>
          Factuur aanmaken
        </button>
      )}
      {facturen.map((f: any) => (
        <Link key={f.id} href={`/facturen/${f.id}`} className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>
          Factuur {f.factuurnummer} →
        </Link>
      ))}

      {/* Moneybird betaallinks */}
      <div className="card">
        <div className="section-label">Online betaling (via Moneybird → ABN AMRO)</div>
        {offerte.betaal_url ? (
          <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontSize: '.72rem', color: '#16a34a', fontWeight: 700, marginBottom: 4 }}>✓ Betaallink {offerte.betaling_50_50 ? '(termijn 1)' : ''}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-ctrl" value={offerte.betaal_url} readOnly style={{ fontSize: '.72rem', padding: '6px 8px' }} />
                <button type="button" className="btn btn-ghost btn-sm" title="Kopiëren" onClick={() => navigator.clipboard.writeText(offerte.betaal_url)}>
                  <span className="nav-ico" style={{ fontSize: 16 }}>content_copy</span>
                </button>
              </div>
            </div>
            {offerte.betaling_50_50 && offerte.betaal_url_2 && (
              <div>
                <div style={{ fontSize: '.72rem', color: '#16a34a', fontWeight: 700, marginBottom: 4 }}>✓ Betaallink (termijn 2)</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="form-ctrl" value={offerte.betaal_url_2} readOnly style={{ fontSize: '.72rem', padding: '6px 8px' }} />
                  <button type="button" className="btn btn-ghost btn-sm" title="Kopiëren" onClick={() => navigator.clipboard.writeText(offerte.betaal_url_2)}>
                    <span className="nav-ico" style={{ fontSize: 16 }}>content_copy</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={maakMollieBetaallinks}
          disabled={mollieLoading}
        >
          <span className="nav-ico" style={{ fontSize: 16 }}>payments</span>
          {mollieLoading ? 'Bezig...' : offerte.betaal_url ? 'Betaallinks vernieuwen' : 'Betaallinks aanmaken via Moneybird'}
        </button>
        <div style={{ fontSize: '.72rem', color: '#8ba8c4', marginTop: 6 }}>
          Factuur wordt aangemaakt in Moneybird · Ponto synct betaling naar ABN AMRO
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
              className={`btn btn-sm ${offerte.status === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ justifyContent: 'space-between' }}
              disabled={offerte.status === s}
            >
              {STATUS_LABELS[s]}
              {offerte.status === s && <span className="nav-ico" style={{ fontSize: 14 }}>check</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Status notitie */}
      <div className="card">
        <div className="section-label">Situatie / notitie</div>
        <textarea
          value={statusNotitie}
          onChange={e => setStatusNotitie(e.target.value)}
          placeholder="bijv. Wachten op akkoord woningcorporatie..."
          className="form-ctrl"
          rows={3}
          style={{ width: '100%', resize: 'vertical', fontSize: '.82rem' }}
        />
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6, width: '100%', justifyContent: 'center' }} onClick={saveStatusNotitie}>
          Opslaan
        </button>
      </div>

      <button type="button" className="btn btn-danger btn-sm" onClick={deleteOfferte} style={{ width: '100%', justifyContent: 'center' }}>
        <span className="nav-ico" style={{ fontSize: 16 }}>delete</span>
        Verwijderen
      </button>
    </div>
  )
}
