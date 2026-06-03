export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { sql } from '@/lib/db'
import StatusBadge from '@/components/StatusBadge'

export const metadata: Metadata = { title: 'Klussen' }

const STATUS_TABS = [
  { key: 'alles', label: 'Alles' },
  { key: 'nieuw', label: 'Nieuw' },
  { key: 'in_behandeling', label: 'In behandeling' },
  { key: 'offerte_gestuurd', label: 'Offerte gestuurd' },
  { key: 'gepland', label: 'Gepland' },
  { key: 'afgerond', label: 'Afgerond' },
]

function timeAgo(dt: string) {
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
  if (diff < 60)    return 'zojuist'
  if (diff < 3600)  return `${Math.round(diff / 60)}m`
  if (diff < 86400) return `${Math.round(diff / 3600)}u`
  return `${Math.round(diff / 86400)}d`
}

export default async function KlussenPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status = 'alles', q = '' } = await searchParams

  const validStatuses = ['nieuw','in_behandeling','offerte_gestuurd','gepland','afgerond']
  const filterStatus = validStatuses.includes(status) ? status : null

  const klussen = filterStatus
    ? await sql`
        SELECT k.id, k.type_werk, k.status, k.bron, k.aangemaakt_op, k.gebeld_status,
               kt.naam AS klant_naam, kt.telefoon, kt.locatie
        FROM klussen k JOIN klanten kt ON kt.id = k.klant_id
        WHERE k.status = ${filterStatus}
          AND (${q} = '' OR kt.naam ILIKE ${'%' + q + '%'} OR k.type_werk ILIKE ${'%' + q + '%'})
        ORDER BY k.aangemaakt_op DESC
      `
    : await sql`
        SELECT k.id, k.type_werk, k.status, k.bron, k.aangemaakt_op, k.gebeld_status,
               kt.naam AS klant_naam, kt.telefoon, kt.locatie
        FROM klussen k JOIN klanten kt ON kt.id = k.klant_id
        WHERE (${q} = '' OR kt.naam ILIKE ${'%' + q + '%'} OR k.type_werk ILIKE ${'%' + q + '%'})
        ORDER BY k.aangemaakt_op DESC
      `

  const counts = await sql`SELECT status, COUNT(*)::int AS n FROM klussen GROUP BY status`
  const cm: Record<string, number> = { alles: 0 }
  counts.forEach((r: any) => { cm[r.status] = r.n; cm['alles'] = (cm['alles'] || 0) + r.n })

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">Klussen</h1>
        <Link href="/klussen/nieuw" className="btn btn-primary">
          <span className="nav-ico" style={{ fontSize: 18 }}>add</span>
          Nieuwe klus
        </Link>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="filter-tabs">
          {STATUS_TABS.map(tab => (
            <Link
              key={tab.key}
              href={`/klussen?status=${tab.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className={`filter-tab ${status === tab.key ? 'active' : ''}`}
            >
              {tab.label}
              {cm[tab.key] != null && (
                <span style={{ marginLeft: 4, opacity: .7 }}>({cm[tab.key] ?? 0})</span>
              )}
            </Link>
          ))}
        </div>
        <form style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <input type="hidden" name="status" value={status} />
          <input
            className="form-ctrl"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Zoek klant of type werk…"
            style={{ width: 220 }}
          />
          <button type="submit" className="btn btn-ghost btn-sm">Zoeken</button>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Klant</th>
                <th>Type werk</th>
                <th>Bron</th>
                <th>Status</th>
                <th>Gebeld</th>
                <th>Geleden</th>
              </tr>
            </thead>
            <tbody>
              {klussen.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#8ba8c4', padding: '32px' }}>Geen klussen gevonden.</td></tr>
              ) : klussen.map((k: any) => (
                <tr key={k.id} onClick={() => { window.location.href = `/klussen/${k.id}` }}>
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
    </div>
  )
}
