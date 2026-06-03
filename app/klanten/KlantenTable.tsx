'use client'

import { useRouter } from 'next/navigation'

export default function KlantenTable({ klanten }: { klanten: any[] }) {
  const router = useRouter()

  return (
    <div className="card" style={{ padding: 0 }}>
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
            {klanten.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#8ba8c4', padding: '32px' }}>Geen klanten gevonden.</td></tr>
            ) : klanten.map((k: any) => (
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
  )
}
