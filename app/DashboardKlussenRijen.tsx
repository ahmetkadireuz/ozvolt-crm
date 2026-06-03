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

export default function DashboardKlussenRijen({ klussen }: { klussen: any[] }) {
  const router = useRouter()
  return (
    <>
      {klussen.map((k: any) => (
        <tr key={k.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/klussen/${k.id}`)}>
          <td>
            <div style={{ fontWeight: 600 }}>{k.klant_naam}</div>
            <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>{k.locatie}</div>
          </td>
          <td>{k.type_werk || '—'}</td>
          <td><span style={{ fontSize: '.75rem', color: '#64748b' }}>{k.bron}</span></td>
          <td><StatusBadge status={k.status} /></td>
          <td style={{ color: '#8ba8c4', fontSize: '.78rem', whiteSpace: 'nowrap' }}>{timeAgo(k.aangemaakt_op)}</td>
        </tr>
      ))}
    </>
  )
}
