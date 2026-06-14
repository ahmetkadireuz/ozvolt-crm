export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import AfspraakForm from './AfspraakForm'
import AfspraakActions from './AfspraakActions'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Werkafspraken' }

export default async function AfspraakDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const afspraakId = parseInt(id)
  if (isNaN(afspraakId)) notFound()

  const [rows, klantenRows] = await Promise.all([
    sql`SELECT w.*, k.naam AS klant_naam, k.email AS klant_email
        FROM werkafspraken w JOIN klanten k ON k.id = w.klant_id
        WHERE w.id = ${afspraakId}`,
    sql`SELECT id, naam FROM klanten ORDER BY naam`,
  ])

  const afspraak = rows[0]
  if (!afspraak) notFound()

  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const acceptUrl = afspraak.accept_token ? `${siteUrl}/werkafspraak/${afspraak.accept_token}` : null
  const afspraakNr = `OZWA-${String(afspraak.afspraaknummer).padStart(4, '0')}`

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/afspraken" className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={16} />
          </Link>
          <h1 className="page-title">Werkafspraken {afspraakNr}</h1>
        </div>
        <a href={`/api/afspraken/${afspraakId}/pdf`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
          <Icon name="pdf" size={16} />
          PDF bekijken
        </a>
      </div>

      <div className="detail-grid">
        <AfspraakForm afspraak={afspraak} klanten={klantenRows as any[]} afspraakId={afspraakId} />
        <AfspraakActions afspraak={afspraak} afspraakId={afspraakId} acceptUrl={acceptUrl} />
      </div>
    </div>
  )
}
