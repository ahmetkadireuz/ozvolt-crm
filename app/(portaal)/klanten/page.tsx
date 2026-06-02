import type { Metadata } from 'next'
import Link from 'next/link'
import { sql } from '@/lib/db'

export const metadata: Metadata = { title: 'Klanten' }

export default async function KlantenPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams

  const klanten = q
    ? await sql`
        SELECT k.*,
               (SELECT COUNT(*)::int FROM klussen WHERE klant_id = k.id) AS klus_count,
               (SELECT COUNT(*)::int FROM klussen WHERE klant_id = k.id AND status = 'nieuw') AS nieuw_count
        FROM klanten k
        WHERE k.naam ILIKE ${'%'+q+'%'} OR k.email ILIKE ${'%'+q+'%'} OR k.telefoon ILIKE ${'%'+q+'%'} OR k.locatie ILIKE ${'%'+q+'%'}
        ORDER BY k.aangemaakt_op DESC
      `
    : await sql`
        SELECT k.*,
               (SELECT COUNT(*)::int FROM klussen WHERE klant_id = k.id) AS klus_count,
               (SELECT COUNT(*)::int FROM klussen WHERE klant_id = k.id AND status = 'nieuw') AS nieuw_count
        FROM klanten k
        ORDER BY k.aangemaakt_op DESC
      `

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">Klanten</h1>
        <Link href="/klanten/nieuw" className="btn btn-primary">
          <span className="nav-ico" style={{ fontSize: 18 }}>person_add</span>
          Klant toevoegen
        </Link>
      </div>

      <div className="toolbar">
        <form style={{ display: 'flex', gap: 6 }}>
          <input className="form-ctrl" type="search" name="q" defaultValue={q} placeholder="Zoek op naam, e-mail of locatie…" style={{ width: 280 }} />
          <button type="submit" className="btn btn-ghost btn-sm">Zoeken</button>
        </form>
        <span style={{ marginLeft: 'auto', color: '#8ba8c4', fontSize: '.8rem' }}>{klanten.length} klanten</span>
      </div>

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
                <tr key={k.id} onClick={() => { window.location.href = `/klanten/${k.id}` }}>
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
    </div>
  )
}
