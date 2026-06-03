export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import OfferteActions from './OfferteActions'
import OfferteForm from './OfferteForm'

export const metadata: Metadata = { title: 'Offerte' }

export default async function OfferteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ msg?: string }>
}) {
  const { id } = await params
  const { msg } = await searchParams
  const offerteId = parseInt(id)
  if (isNaN(offerteId)) notFound()

  const [offerteRows, klanten, factuurRows] = await Promise.all([
    sql`SELECT o.*, kt.naam AS klant_naam, kt.email AS klant_email FROM offertes o JOIN klanten kt ON kt.id = o.klant_id WHERE o.id = ${offerteId}`,
    sql`SELECT id, naam, email FROM klanten ORDER BY naam`,
    sql`SELECT id, factuurnummer, status FROM facturen WHERE offerte_id = ${offerteId}`,
  ])

  const offerte = JSON.parse(JSON.stringify(offerteRows[0]))
  if (!offerte) notFound()

  const totalen = berekenTotalen(offerte.regels ?? [], offerte.korting_pct, offerte.btw_pct)
  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const acceptUrl = offerte.accept_token ? `${siteUrl}/api/offertes/${offerteId}/accepteren?token=${offerte.accept_token}` : null
  const klanten2 = JSON.parse(JSON.stringify(klanten))
  const facturen2 = JSON.parse(JSON.stringify(factuurRows))

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/offertes" className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <div>
            <h1 className="page-title">Offerte AM-{offerte.offertenummer}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <StatusBadge status={offerte.status} />
              <span style={{ color: '#8ba8c4', fontSize: '.78rem' }}>{offerte.klant_naam}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/api/offertes/${offerteId}/pdf`} target="_blank" className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>print</span>
            PDF
          </Link>
        </div>
      </div>

      {msg && <div className="alert alert-ok">{decodeURIComponent(msg)}</div>}

      <div className="detail-grid">
        {/* Formulier */}
        <OfferteForm offerte={offerte} klanten={klanten2} offerteId={offerteId} />

        {/* Acties sidebar */}
        <OfferteActions
          offerte={offerte}
          offerteId={offerteId}
          totalen={totalen}
          acceptUrl={acceptUrl}
          facturen={facturen2}
        />
      </div>
    </div>
  )
}
