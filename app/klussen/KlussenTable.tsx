'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import Icon from '@/components/Icon'
import SwipeRow, { type SwipeAction } from '@/components/SwipeRow'

function waLink(tel: string | null) {
  if (!tel) return null
  const digits = tel.replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits.startsWith('0') ? '31' + digits.slice(1) : digits}`
}

function datumNL(dt: string) {
  const d = new Date(dt)
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    d.getFullYear(),
  ].join('-')
}

export default function KlussenTable({ klussen }: { klussen: any[] }) {
  const router = useRouter()
  const [zoek, setZoek] = useState('')
  const [busy, setBusy] = useState(false)

  const lijst = useMemo(() => {
    const q = zoek.toLowerCase().trim()
    if (!q) return klussen
    return klussen.filter((k: any) =>
      `${k.klant_naam} ${k.type_werk ?? ''} ${k.locatie ?? ''} ${k.bron ?? ''}`.toLowerCase().includes(q)
    )
  }, [klussen, zoek])

  async function verwijder(k: any) {
    if (!confirm(`Project van ${k.klant_naam} (${k.type_werk || `#${k.id}`}) definitief verwijderen?`)) return
    setBusy(true)
    await fetch(`/api/klussen/${k.id}`, { method: 'DELETE' })
    setBusy(false)
    router.refresh()
  }

  return (
    <>
      {/* Zoekbalk */}
      <div className="list-search">
        <span className="ico"><Icon name="search" size={18} /></span>
        <input
          type="search"
          value={zoek}
          onChange={e => setZoek(e.target.value)}
          placeholder="Zoek op klant, type werk of plaats…"
        />
      </div>

      {lijst.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-mute)', padding: '32px' }}>
          Geen projecten gevonden{zoek ? ` voor "${zoek}"` : ''}.
        </div>
      ) : (
        <>
          {/* Desktop tabel */}
          <div className="card desktop-only" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Klant</th><th>Type werk</th><th>Via</th>
                    <th>Status</th><th>Datum</th><th style={{ textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lijst.map((k: any) => (
                    <tr key={k.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/klussen/${k.id}`)}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0d1b3e' }}>{k.klant_naam}</div>
                        {k.locatie && <div style={{ fontSize: '.75rem', color: '#8ba8c4', marginTop: 1 }}>{k.locatie}</div>}
                      </td>
                      <td style={{ color: '#334155' }}>{k.type_werk || '—'}</td>
                      <td><span className="via-badge">{k.bron || 'handmatig'}</span></td>
                      <td><StatusBadge status={k.status} /></td>
                      <td className="mono" style={{ color: '#64748b', fontSize: '.78rem' }}>{datumNL(k.aangemaakt_op)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="row-actions">
                          <a href={`/klussen/${k.id}`} className="btn-open">Openen</a>
                          <a href={`/facturen/nieuw?klus=${k.id}`} className="btn-row-primary">+ Factuur</a>
                          <button className="btn-row-del" title="Verwijderen" disabled={busy} onClick={() => verwijder(k)}>
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobiel: kaartjes met swipe */}
          <div className="klus-cards mobile-only">
            {lijst.map((k: any) => {
              const wa = waLink(k.telefoon)
              const left: SwipeAction[] = []
              if (k.telefoon) left.push({
                label: 'Bel', color: '#16a34a',
                icon: <Icon name="phone" size={20} />,
                onAction: () => { window.location.href = `tel:${k.telefoon}` },
              })
              if (wa) left.push({
                label: 'WhatsApp', color: '#25d366',
                icon: <Icon name="chat" size={20} />,
                onAction: () => { window.open(wa, '_blank', 'noopener') },
              })
              const right: SwipeAction[] = [{
                label: 'Verwijder', color: '#dc2626',
                icon: <Icon name="trash" size={20} />,
                onAction: () => verwijder(k),
              }]
              return (
                <SwipeRow
                  key={k.id}
                  leftActions={left}
                  rightActions={right}
                  onClick={() => router.push(`/klussen/${k.id}`)}
                >
                  <div className="klus-card" style={{ borderRadius: 0, marginBottom: 0, border: 'none', borderBottom: '1px solid var(--line-soft)' }}>
                    <div className="klus-card-top">
                      <div style={{ minWidth: 0 }}>
                        <div className="klus-card-naam">{k.klant_naam}</div>
                        <div className="klus-card-meta">{k.type_werk || 'Geen type'}{k.locatie ? ` · ${k.locatie}` : ''}</div>
                      </div>
                      <StatusBadge status={k.status} />
                    </div>
                    <div className="klus-card-bottom">
                      <span style={{ fontSize: '.74rem', color: '#8ba8c4' }}>
                        <span className="via-badge" style={{ marginRight: 6 }}>{k.bron || 'handmatig'}</span>
                        {datumNL(k.aangemaakt_op)}
                      </span>
                    </div>
                  </div>
                </SwipeRow>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
