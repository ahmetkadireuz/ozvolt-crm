'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import Icon from '@/components/Icon'
import { berekenTotalen, formatEuro } from '@/lib/utils'

function datumNL(dt: string | Date) {
  const d = new Date(dt)
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    d.getFullYear(),
  ].join('-')
}

export default function FacturenTable({ facturen }: { facturen: any[] }) {
  const router = useRouter()
  const [zoek, setZoek] = useState('')
  const [busy, setBusy] = useState(false)

  const lijst = useMemo(() => {
    const q = zoek.toLowerCase().trim()
    if (!q) return facturen
    return facturen.filter((f: any) =>
      `${f.klant_naam} ${f.factuurnummer ?? ''}`.toLowerCase().includes(q)
    )
  }, [facturen, zoek])

  async function verwijder(f: any) {
    if (!confirm(`Factuur ${f.factuurnummer} van ${f.klant_naam} definitief verwijderen?`)) return
    setBusy(true)
    await fetch(`/api/facturen/${f.id}`, { method: 'DELETE' })
    setBusy(false)
    router.refresh()
  }

  return (
    <>
      <div className="list-search">
        <span className="ico"><Icon name="search" size={18} /></span>
        <input
          type="search"
          value={zoek}
          onChange={e => setZoek(e.target.value)}
          placeholder="Zoek op klant of factuurnummer…"
        />
      </div>

      {lijst.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-mute)', padding: '32px' }}>
          Geen facturen gevonden{zoek ? ` voor "${zoek}"` : ''}.
        </div>
      ) : (
        <>
          {/* Desktop tabel */}
          <div className="card desktop-only" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nummer</th><th>Klant</th><th>Datum</th>
                    <th>Vervaldatum</th><th>Bedrag</th><th>Status</th>
                    <th style={{ textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lijst.map((f: any) => {
                    const totalen = berekenTotalen(f.regels ?? [], 0, f.btw_pct)
                    const vervalDatum = new Date(f.factuurdatum)
                    vervalDatum.setDate(vervalDatum.getDate() + (f.betalingstermijn ?? 14))
                    const teLaat = f.status === 'verstuurd' && vervalDatum < new Date()
                    return (
                      <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/facturen/${f.id}`)}>
                        <td className="mono" style={{ color: 'var(--text-mute)' }}>{f.factuurnummer}</td>
                        <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{f.klant_naam}</td>
                        <td className="mono" style={{ color: 'var(--text-mute)', fontSize: '.78rem' }}>{datumNL(f.factuurdatum)}</td>
                        <td className="mono" style={{ fontSize: '.78rem', color: teLaat ? 'var(--red)' : 'var(--text-mute)', fontWeight: teLaat ? 700 : 400 }}>
                          {datumNL(vervalDatum)}
                        </td>
                        <td className="mono" style={{ fontWeight: 700, color: 'var(--navy)' }}>{formatEuro(totalen.inclBtw)}</td>
                        <td><StatusBadge status={teLaat ? 'te_laat' : f.status} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="row-actions">
                            <a href={`/facturen/${f.id}`} className="btn-open">Openen</a>
                            <button className="btn-row-del" title="Verwijderen" disabled={busy} onClick={() => verwijder(f)}>
                              <Icon name="trash" size={15} />
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
            {lijst.map((f: any) => {
              const totalen = berekenTotalen(f.regels ?? [], 0, f.btw_pct)
              const vervalDatum = new Date(f.factuurdatum)
              vervalDatum.setDate(vervalDatum.getDate() + (f.betalingstermijn ?? 14))
              const teLaat = f.status === 'verstuurd' && vervalDatum < new Date()
              return (
                <div key={f.id} className="klus-card" onClick={() => router.push(`/facturen/${f.id}`)}>
                  <div className="klus-card-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="klus-card-naam">{f.klant_naam}</div>
                      <div className="klus-card-meta">
                        {f.factuurnummer} · {datumNL(f.factuurdatum)}
                      </div>
                    </div>
                    <StatusBadge status={teLaat ? 'te_laat' : f.status} />
                  </div>
                  <div className="klus-card-bottom">
                    <span style={{ fontSize: '.74rem', color: teLaat ? 'var(--red)' : 'var(--text-mute)', fontWeight: teLaat ? 700 : 400 }}>
                      Vervalt {datumNL(vervalDatum)}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--navy)' }}>
                      {formatEuro(totalen.inclBtw)}
                    </span>
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
