'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import { berekenTotalen, formatEuro } from '@/lib/utils'

function datumNL(dt: string) {
  const d = new Date(dt)
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    d.getFullYear(),
  ].join('-')
}

export default function OffertesTable({ offertes }: { offertes: any[] }) {
  const router = useRouter()
  const [zoek, setZoek] = useState('')
  const [busy, setBusy] = useState(false)

  const lijst = useMemo(() => {
    const q = zoek.toLowerCase().trim()
    if (!q) return offertes
    return offertes.filter((o: any) =>
      `${o.klant_naam} ${o.locatie ?? ''} ozvt-${String(o.offertenummer).padStart(4, '0')} ${o.offertenummer}`.toLowerCase().includes(q)
    )
  }, [offertes, zoek])

  async function verwijder(o: any) {
    if (!confirm(`Offerte OZVT-${String(o.offertenummer).padStart(4, '0')} van ${o.klant_naam} definitief verwijderen?`)) return
    setBusy(true)
    await fetch(`/api/offertes/${o.id}`, { method: 'DELETE' })
    setBusy(false)
    router.refresh()
  }

  return (
    <>
      {/* Zoekbalk */}
      <div className="list-search">
        <span className="nav-ico ico">search</span>
        <input
          type="search"
          value={zoek}
          onChange={e => setZoek(e.target.value)}
          placeholder="Zoek op klant of offertenummer…"
        />
      </div>

      {lijst.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#8ba8c4', padding: '32px' }}>
          Geen offertes gevonden{zoek ? ` voor “${zoek}”` : ''}.
        </div>
      ) : (
        <>
          {/* Desktop tabel */}
          <div className="card desktop-only" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nr.</th><th>Klant</th><th>Datum</th>
                    <th>Bedrag</th><th>Status</th><th style={{ textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lijst.map((o: any) => {
                    const totalen = berekenTotalen(o.regels ?? [], o.korting_pct, o.btw_pct)
                    const verlopen = o.geldig_tot && new Date(o.geldig_tot) < new Date() && !['geaccepteerd', 'geweigerd'].includes(o.status)
                    return (
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/offertes/${o.id}`)}>
                        <td className="mono" style={{ color: '#8ba8c4' }}>{String(o.offertenummer).padStart(4, '0')}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0d1b3e' }}>{o.klant_naam}</div>
                          {o.locatie && <div style={{ fontSize: '.75rem', color: '#8ba8c4', marginTop: 1 }}>{o.locatie}</div>}
                        </td>
                        <td className="mono" style={{ color: '#64748b', fontSize: '.78rem' }}>
                          {datumNL(o.datum)}
                          {verlopen && <div style={{ color: '#dc2626', fontSize: '.7rem', fontWeight: 700 }}>verlopen</div>}
                        </td>
                        <td className="mono" style={{ fontWeight: 700, color: '#0d1b3e' }}>{formatEuro(totalen.inclBtw)}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="row-actions">
                            <a href={`/offertes/${o.id}`} className="btn-open">Openen</a>
                            <button className="btn-row-del" title="Verwijderen" disabled={busy} onClick={() => verwijder(o)}>
                              <span className="nav-ico" style={{ fontSize: 15 }}>delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobiel: kaartjes */}
          <div className="klus-cards mobile-only">
            {lijst.map((o: any) => {
              const totalen = berekenTotalen(o.regels ?? [], o.korting_pct, o.btw_pct)
              return (
                <div key={o.id} className="klus-card" onClick={() => router.push(`/offertes/${o.id}`)}>
                  <div className="klus-card-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="klus-card-naam">{o.klant_naam}</div>
                      <div className="klus-card-meta">OZVT-{String(o.offertenummer).padStart(4, '0')} · {datumNL(o.datum)}</div>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="klus-card-bottom">
                    <span style={{ fontWeight: 700, fontSize: '.86rem', color: '#0d1b3e' }}>{formatEuro(totalen.inclBtw)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
