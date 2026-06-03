export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { sql } from '@/lib/db'
import OffertesTable from './OffertesTable'

export const metadata: Metadata = { title: 'Offertes' }

const STATUS_TABS = [
  { key: 'alles', label: 'Alles' },
  { key: 'concept', label: 'Concept' },
  { key: 'gestuurd', label: 'Gestuurd' },
  { key: 'geaccepteerd', label: 'Geaccepteerd' },
  { key: 'verlopen', label: 'Verlopen' },
  { key: 'geweigerd', label: 'Geweigerd' },
]

export default async function OffertesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'alles' } = await searchParams
  const validStatuses = ['concept','gestuurd','geaccepteerd','verlopen','geweigerd']
  const filter = validStatuses.includes(status) ? status : null

  const offertes = filter
    ? await sql`SELECT o.*, kt.naam AS klant_naam FROM offertes o JOIN klanten kt ON kt.id = o.klant_id WHERE o.status = ${filter} ORDER BY o.datum DESC`
    : await sql`SELECT o.*, kt.naam AS klant_naam FROM offertes o JOIN klanten kt ON kt.id = o.klant_id ORDER BY o.datum DESC`

  const counts = await sql`SELECT status, COUNT(*)::int AS n FROM offertes GROUP BY status`
  const cm: Record<string, number> = { alles: 0 }
  counts.forEach((r: any) => { cm[r.status] = r.n; cm['alles'] = (cm['alles'] || 0) + r.n })

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">Offertes</h1>
        <Link href="/offertes/nieuw" className="btn btn-primary">
          <span className="nav-ico" style={{ fontSize: 18 }}>add</span>
          Nieuwe offerte
        </Link>
      </div>

      <div className="toolbar">
        <div className="filter-tabs">
          {STATUS_TABS.map(tab => (
            <Link key={tab.key} href={`/offertes?status=${tab.key}`} className={`filter-tab ${status === tab.key ? 'active' : ''}`}>
              {tab.label} ({cm[tab.key] ?? 0})
            </Link>
          ))}
        </div>
      </div>

      <OffertesTable offertes={offertes as any[]} />
    </div>
  )
}
