export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { berekenTotalen } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import Icon from '@/components/Icon'
import FactuurForm from './FactuurForm'
import FactuurActions from './FactuurActions'
import { ensureFactuurKolommen } from '@/lib/facturen'
import { controleerTikkieFactuur, tikkieAan } from '@/lib/tikkie'

export const metadata: Metadata = { title: 'Factuur' }

export default async function FactuurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const factuurId = parseInt(id)
  if (isNaN(factuurId)) notFound()

  await ensureFactuurKolommen()
  const [factuurRows, klanten] = await Promise.all([
    sql`SELECT f.*, kt.naam AS klant_naam, kt.email AS klant_email, kt.telefoon AS klant_tel FROM facturen f JOIN klanten kt ON kt.id = f.klant_id WHERE f.id = ${factuurId}`,
    sql`SELECT id, naam FROM klanten ORDER BY naam`,
  ])

  const factuur = JSON.parse(JSON.stringify(factuurRows[0] ?? null))
  if (!factuur) notFound()
  // Vangnet naast de webhook: is de Tikkie van deze factuur inmiddels betaald?
  if (factuur.tikkie_token && factuur.status !== 'betaald' && await controleerTikkieFactuur(factuurId)) factuur.status = 'betaald'
  if (factuur.gekoppelde_factuur_id) {
    const g = await sql`SELECT id, factuurnummer, status FROM facturen WHERE id = ${factuur.gekoppelde_factuur_id}`
    factuur.gekoppelde_factuur = g[0] ? JSON.parse(JSON.stringify(g[0])) : null
  }

  const totalen = berekenTotalen(factuur.regels ?? [], 0, factuur.btw_pct)
  const klanten2 = JSON.parse(JSON.stringify(klanten))
  const mbConfigured = !!(process.env.MONEYBIRD_API_TOKEN && process.env.MONEYBIRD_ADMIN_ID)

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/facturen" className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={16} />
          </Link>
          <div>
            <h1 className="page-title">Factuur {factuur.factuurnummer}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <StatusBadge status={factuur.status} />
              <span style={{ color: 'var(--text-soft)', fontSize: '.78rem' }}>{factuur.klant_naam}</span>
            </div>
          </div>
        </div>
        <Link href={`/api/facturen/${factuurId}/pdf`} target="_blank" className="btn btn-ghost btn-sm">
          <Icon name="download" size={16} />
          PDF
        </Link>
      </div>

      <div className="detail-grid">
        <FactuurForm factuur={factuur} klanten={klanten2} factuurId={factuurId} />
        <FactuurActions factuur={factuur} factuurId={factuurId} totalen={totalen} mbConfigured={mbConfigured} tikkie={tikkieAan()} />
      </div>
    </div>
  )
}
