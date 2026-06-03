export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { berekenTotalen } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import FactuurForm from './FactuurForm'
import FactuurActions from './FactuurActions'

export const metadata: Metadata = { title: 'Factuur' }

export default async function FactuurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const factuurId = parseInt(id)
  if (isNaN(factuurId)) notFound()

  const [factuurRows, klanten] = await Promise.all([
    sql`SELECT f.*, kt.naam AS klant_naam, kt.email AS klant_email FROM facturen f JOIN klanten kt ON kt.id = f.klant_id WHERE f.id = ${factuurId}`,
    sql`SELECT id, naam FROM klanten ORDER BY naam`,
  ])

  const factuur = factuurRows[0]
  if (!factuur) notFound()

  const totalen = berekenTotalen(factuur.regels ?? [], 0, factuur.btw_pct)

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/facturen" className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <div>
            <h1 className="page-title">Factuur {factuur.factuurnummer}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <StatusBadge status={factuur.status} />
              <span style={{ color: '#8ba8c4', fontSize: '.78rem' }}>{factuur.klant_naam}</span>
            </div>
          </div>
        </div>
        <Link href={`/api/facturen/${factuurId}/pdf`} target="_blank" className="btn btn-ghost btn-sm">
          <span className="nav-ico" style={{ fontSize: 16 }}>print</span>
          PDF
        </Link>
      </div>

      <div className="detail-grid">
        <FactuurForm factuur={factuur} klanten={klanten} factuurId={factuurId} />
        <FactuurActions factuur={factuur} factuurId={factuurId} totalen={totalen} />
      </div>
    </div>
  )
}
