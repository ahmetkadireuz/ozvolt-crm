export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { sql } from '@/lib/db'
import FacturenTable from './FacturenTable'

export const metadata: Metadata = { title: 'Facturen' }

const STATUS_TABS = [
  { key: 'alles', label: 'Alles' },
  { key: 'concept', label: 'Concept' },
  { key: 'verstuurd', label: 'Verstuurd' },
  { key: 'te_laat', label: 'Te laat' },
  { key: 'betaald', label: 'Betaald' },
]

export default async function FacturenPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'alles' } = await searchParams
  const validStatuses = ['concept','verstuurd','betaald','te_laat']
  const filter = validStatuses.includes(status) ? status : null

  const facturen = filter
    ? await sql`SELECT f.*, kt.naam AS klant_naam FROM facturen f JOIN klanten kt ON kt.id = f.klant_id WHERE f.status = ${filter} ORDER BY f.factuurdatum DESC`
    : await sql`SELECT f.*, kt.naam AS klant_naam FROM facturen f JOIN klanten kt ON kt.id = f.klant_id ORDER BY f.factuurdatum DESC`

  const counts = await sql`SELECT status, COUNT(*)::int AS n FROM facturen GROUP BY status`
  const cm: Record<string, number> = { alles: 0 }
  counts.forEach((r: any) => { cm[r.status] = r.n; cm['alles'] = (cm['alles'] || 0) + r.n })

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">Facturen</h1>
        <Link href="/facturen/nieuw" className="btn btn-primary">
          <span className="nav-ico" style={{ fontSize: 18 }}>add</span>
          Nieuwe factuur
        </Link>
      </div>

      <div className="toolbar">
        <div className="filter-tabs">
          {STATUS_TABS.map(tab => (
            <Link key={tab.key} href={`/facturen?status=${tab.key}`} className={`filter-tab ${status === tab.key ? 'active' : ''}`}>
              {tab.label} ({cm[tab.key] ?? 0})
            </Link>
          ))}
        </div>
      </div>

      <FacturenTable facturen={facturen as any[]} />
    </div>
  )
}
