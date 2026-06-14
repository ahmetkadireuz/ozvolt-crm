export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { sql } from '@/lib/db'
import KlussenTable from './KlussenTable'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Projecten' }

const STATUS_TABS = [
  { key: 'alles', label: 'Alles' },
  { key: 'nieuw', label: 'Nieuw' },
  { key: 'in_behandeling', label: 'In behandeling' },
  { key: 'offerte_gestuurd', label: 'Offerte gestuurd' },
  { key: 'gepland', label: 'Gepland' },
  { key: 'afgerond', label: 'Afgerond' },
]

export default async function KlussenPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'alles' } = await searchParams

  const validStatuses = ['nieuw','in_behandeling','offerte_gestuurd','gepland','afgerond']
  const filterStatus = validStatuses.includes(status) ? status : null

  const klussen = filterStatus
    ? await sql`
        SELECT k.id, k.type_werk, k.status, k.bron, k.aangemaakt_op, k.gebeld_status,
               kt.naam AS klant_naam, kt.telefoon, kt.locatie
        FROM klussen k JOIN klanten kt ON kt.id = k.klant_id
        WHERE k.status = ${filterStatus}
        ORDER BY k.aangemaakt_op DESC
      `
    : await sql`
        SELECT k.id, k.type_werk, k.status, k.bron, k.aangemaakt_op, k.gebeld_status,
               kt.naam AS klant_naam, kt.telefoon, kt.locatie
        FROM klussen k JOIN klanten kt ON kt.id = k.klant_id
        ORDER BY k.aangemaakt_op DESC
      `

  const counts = await sql`SELECT status, COUNT(*)::int AS n FROM klussen GROUP BY status`
  const cm: Record<string, number> = { alles: 0 }
  counts.forEach((r: any) => { cm[r.status] = r.n; cm['alles'] = (cm['alles'] || 0) + r.n })

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">Projecten</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/klussen/nieuw" className="btn btn-primary">
            <Icon name="plus" size={16} />
            Nieuw project
          </Link>
          <Link href="/klanten/nieuw" className="btn btn-ghost">
            <Icon name="users" size={16} />
            Nieuwe klant
          </Link>
        </div>
      </div>

      {/* Status filters */}
      <div className="toolbar">
        <div className="filter-tabs">
          {STATUS_TABS.map(tab => (
            <Link
              key={tab.key}
              href={`/klussen?status=${tab.key}`}
              className={`filter-tab ${status === tab.key ? 'active' : ''}`}
            >
              {tab.label}
              {cm[tab.key] != null && (
                <span style={{ marginLeft: 4, opacity: .7 }}>({cm[tab.key] ?? 0})</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <KlussenTable klussen={klussen as any[]} />
    </div>
  )
}
