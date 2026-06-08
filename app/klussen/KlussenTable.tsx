'use client'

import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'

function timeAgo(dt: string) {
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
  if (diff < 60)    return 'zojuist'
  if (diff < 3600)  return `${Math.round(diff / 60)}m`
  if (diff < 86400) return `${Math.round(diff / 3600)}u`
  return `${Math.round(diff / 86400)}d`
}

function gebeldLabel(status: string) {
  if (status === 'opgenomen')      return { text: '✓ Opgenomen', color: '#16a34a' }
  if (status === 'niet_opgenomen') return { text: 'Niet opgenomen', color: '#ea580c' }
  if (status === 'voicemail')      return { text: 'Voicemail', color: '#7c3aed' }
  return null
}

export default function KlussenTable({ klussen }: { klussen: any[] }) {
  const router = useRouter()

  if (klussen.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', color: '#8ba8c4', padding: '32px' }}>
        Geen klussen gevonden.
      </div>
    )
  }

  return (
    <>
      {/* Desktop tabel */}
      <div className="card desktop-only" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Klant</th><th>Type werk</th><th>Bron</th>
                <th>Status</th><th>Gebeld</th><th>Geleden</th>
              </tr>
            </thead>
            <tbody>
              {klussen.map((k: any) => {
                const g = gebeldLabel(k.gebeld_status)
                return (
                  <tr key={k.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/klussen/${k.id}`)}>
                    <td className="mono" style={{ color: '#8ba8c4' }}>#{k.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{k.klant_naam}</div>
                      <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>{k.locatie}</div>
                    </td>
                    <td>{k.type_werk || '—'}</td>
                    <td style={{ fontSize: '.78rem', color: '#64748b' }}>{k.bron}</td>
                    <td><StatusBadge status={k.status} /></td>
                    <td>
                      {g
                        ? <span style={{ color: g.color, fontSize: '.78rem', fontWeight: 600 }}>{g.text}</span>
                        : <span style={{ color: '#8ba8c4', fontSize: '.78rem' }}>—</span>}
                    </td>
                    <td style={{ color: '#8ba8c4', fontSize: '.78rem' }}>{timeAgo(k.aangemaakt_op)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobiel: kaartjes */}
      <div className="klus-cards mobile-only">
        {klussen.map((k: any) => {
          const g = gebeldLabel(k.gebeld_status)
          return (
            <div key={k.id} className="klus-card" onClick={() => router.push(`/klussen/${k.id}`)}>
              <div className="klus-card-top">
                <div style={{ minWidth: 0 }}>
                  <div className="klus-card-naam">{k.klant_naam}</div>
                  <div className="klus-card-meta">{k.type_werk || 'Geen type'}{k.locatie ? ` · ${k.locatie}` : ''}</div>
                </div>
                <StatusBadge status={k.status} />
              </div>
              <div className="klus-card-bottom">
                <span style={{ fontSize: '.74rem', color: '#8ba8c4' }}>#{k.id} · {timeAgo(k.aangemaakt_op)}</span>
                {g && <span style={{ fontSize: '.74rem', color: g.color, fontWeight: 600 }}>{g.text}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
