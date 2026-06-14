'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SwipeRow, { type SwipeAction } from '@/components/SwipeRow'
import Icon from '@/components/Icon'

function waLink(tel: string | null) {
  if (!tel) return null
  const digits = tel.replace(/\D/g, '')
  if (!digits) return null
  const normalized = digits.startsWith('0') ? '31' + digits.slice(1) : digits
  return `https://wa.me/${normalized}`
}

export default function KlantenTable({ klanten }: { klanten: any[] }) {
  const router = useRouter()
  const [items, setItems] = useState(klanten)

  async function verwijder(id: number, naam: string) {
    if (!confirm(`Klant "${naam}" verwijderen?`)) return
    const r = await fetch(`/api/klanten/${id}`, { method: 'DELETE' })
    if (r.ok) setItems(prev => prev.filter(k => k.id !== id))
    else alert('Verwijderen mislukt')
  }

  return (
    <>
      {/* Desktop tabel */}
      <div className="card desktop-table" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Naam</th>
                <th>Type</th>
                <th>Telefoon</th>
                <th>Locatie</th>
                <th>Klussen</th>
                <th>Aangemaakt</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#8ba8c4', padding: '32px' }}>Geen klanten gevonden.</td></tr>
              ) : items.map((k: any) => (
                <tr key={k.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/klanten/${k.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{k.naam}</div>
                    <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>{k.email}</div>
                  </td>
                  <td><span style={{ fontSize: '.78rem', color: '#64748b' }}>{k.type}</span></td>
                  <td style={{ fontSize: '.84rem' }}>{k.telefoon || '—'}</td>
                  <td style={{ fontSize: '.84rem' }}>{k.locatie || '—'}</td>
                  <td>
                    <span style={{ fontWeight: 700 }}>{k.klus_count}</span>
                    {k.nieuw_count > 0 && <span className="n-badge" style={{ marginLeft: 6 }}>{k.nieuw_count}</span>}
                  </td>
                  <td style={{ color: '#8ba8c4', fontSize: '.78rem' }}>{new Date(k.aangemaakt_op).toLocaleDateString('nl-NL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobiele lijst met swipe */}
      <div className="card mobile-list" style={{ padding: 0, overflow: 'hidden' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8ba8c4', padding: '32px' }}>Geen klanten gevonden.</div>
        ) : items.map((k: any) => {
          const wa = waLink(k.telefoon)
          const leftActions: SwipeAction[] = []
          if (k.telefoon) {
            leftActions.push({
              label: 'Bel',
              icon: <Icon name="phone" size={20} />,
              color: '#16a34a',
              onAction: () => { window.location.href = `tel:${k.telefoon}` },
            })
          }
          if (wa) {
            leftActions.push({
              label: 'WhatsApp',
              icon: <Icon name="chat" size={20} />,
              color: '#25d366',
              onAction: () => { window.open(wa, '_blank', 'noopener') },
            })
          }
          const rightActions: SwipeAction[] = [{
            label: 'Verwijder',
            icon: <Icon name="trash" size={20} />,
            color: '#dc2626',
            onAction: () => verwijder(k.id, k.naam),
          }]
          return (
            <SwipeRow
              key={k.id}
              leftActions={leftActions}
              rightActions={rightActions}
              onClick={() => router.push(`/klanten/${k.id}`)}
            >
              <div className="swipe-card">
                <div className="swipe-card-body">
                  <div className="swipe-card-title">{k.naam}</div>
                  <div className="swipe-card-meta">
                    {k.telefoon || k.email || k.locatie || '—'}
                  </div>
                </div>
                <div className="swipe-card-side">
                  <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{k.klus_count}</div>
                  {k.nieuw_count > 0 && <span className="n-badge">{k.nieuw_count}</span>}
                </div>
              </div>
            </SwipeRow>
          )
        })}
      </div>
    </>
  )
}
