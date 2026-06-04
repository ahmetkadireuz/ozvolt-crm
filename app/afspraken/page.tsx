export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { sql } from '@/lib/db'
import StatusBadge from '@/components/StatusBadge'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Werkafspraken' }

export default async function AfsprakenPage() {
  const afspraken = await sql`
    SELECT w.*, k.naam AS klant_naam
    FROM werkafspraken w JOIN klanten k ON k.id = w.klant_id
    ORDER BY w.aangemaakt_op DESC
  `

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">Werkafspraken</h1>
        <Link href="/afspraken/nieuw" className="btn btn-primary btn-sm">
          <span className="nav-ico" style={{ fontSize: 16 }}>add</span>
          Nieuw document
        </Link>
      </div>

      <div className="card">
        {afspraken.length === 0 ? (
          <p style={{ color: '#8ba8c4', fontSize: '.88rem', padding: '20px 0', textAlign: 'center' }}>Nog geen werkafspraken aangemaakt.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nummer','Klant','Datum','Titel','Status',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {afspraken.map((a: any) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: '.84rem' }}>OZWA-{String(a.afspraaknummer).padStart(4, '0')}</td>
                  <td style={{ padding: '10px 12px', fontSize: '.84rem' }}>{a.klant_naam}</td>
                  <td style={{ padding: '10px 12px', fontSize: '.82rem', color: '#8ba8c4' }}>{new Date(a.datum).toLocaleDateString('nl-NL')}</td>
                  <td style={{ padding: '10px 12px', fontSize: '.82rem' }}>{a.titel || '—'}</td>
                  <td style={{ padding: '10px 12px' }}><StatusBadge status={a.status} /></td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <Link href={`/afspraken/${a.id}`} className="btn btn-ghost btn-sm">Openen →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
