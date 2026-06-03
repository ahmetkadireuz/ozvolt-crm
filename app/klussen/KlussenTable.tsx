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

export default function KlussenTable({ klussen }: { klussen: any[] }) {
  const router = useRouter()
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th><th>Klant</th><th>Type werk</th><th>Bron</th>
              <th>Status</th><th>Gebeld</th><th>Geleden</th>
            </tr>
          </thead>
          <tbody>
            {klussen.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#8ba8c4', padding: '32px' }}>Geen klussen gevonden.</td></tr>
            ) : klussen.map((k: any) => (
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
                  {k.gebeld_status === 'opgenomen'
                    ? <span style={{ color: '#16a34a', fontSize: '.78rem', fontWeight: 600 }}>✓ Opgenomen</span>
                    : k.gebeld_status === 'niet_opgenomen'
                    ? <span style={{ color: '#ea580c', fontSize: '.78rem' }}>Niet opgenomen</span>
                    : k.gebeld_status === 'voicemail'
                    ? <span style={{ color: '#7c3aed', fontSize: '.78rem' }}>Voicemail</span>
                    : <span style={{ color: '#8ba8c4', fontSize: '.78rem' }}>—</span>}
                </td>
                <td style={{ color: '#8ba8c4', fontSize: '.78rem' }}>{timeAgo(k.aangemaakt_op)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
