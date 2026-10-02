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
import FactuurKoppelen from '@/app/klussen/[id]/FactuurKoppelen'
import { ensureFactuurKolommen } from '@/lib/facturen'
import { ensureTikkieKolommen, tikkieAan, tikkieGeldig } from '@/lib/tikkie'

export const metadata: Metadata = { title: 'Factuur' }

export default async function FactuurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const factuurId = parseInt(id)
  if (isNaN(factuurId)) notFound()

  await ensureFactuurKolommen()
  await ensureTikkieKolommen()
  const factuurRows = await sql`
    SELECT f.*, kt.naam AS klant_naam, kt.email AS klant_email, kt.telefoon AS klant_tel,
           ks.type_werk AS klus_type_werk, ks.omschrijving AS klus_omschrijving
    FROM facturen f JOIN klanten kt ON kt.id = f.klant_id
    LEFT JOIN klussen ks ON ks.id = f.klus_id
    WHERE f.id = ${factuurId}`

  if (!factuurRows[0]) notFound()
  const factuur = JSON.parse(JSON.stringify(factuurRows[0]))
  if (factuur.gekoppelde_factuur_id) {
    const g = await sql`SELECT id, factuurnummer, status FROM facturen WHERE id = ${factuur.gekoppelde_factuur_id}`
    factuur.gekoppelde_factuur = g[0] ? JSON.parse(JSON.stringify(g[0])) : null
  }

  const totalen = berekenTotalen(factuur.regels ?? [], 0, factuur.btw_pct)
  // Losse factuur (van vóór "project is leidend"): koppelen aan een project van deze klant
  const projectKeuzes = factuur.klus_id ? [] : JSON.parse(JSON.stringify(
    await sql`SELECT id, type_werk, omschrijving, status FROM klussen WHERE klant_id = ${factuur.klant_id} ORDER BY aangemaakt_op DESC`))
  const tikkie = { aan: tikkieAan(), geldig: tikkieGeldig(factuur) }
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

      {!factuur.klus_id && (
        <FactuurKoppelen factuurId={factuurId} klantId={factuur.klant_id} klantNaam={factuur.klant_naam} projecten={projectKeuzes} />
      )}

      <div className="detail-grid">
        <FactuurForm factuur={factuur} factuurId={factuurId} />
        <FactuurActions factuur={factuur} factuurId={factuurId} totalen={totalen} mbConfigured={mbConfigured} tikkie={tikkie} />
      </div>
    </div>
  )
}
