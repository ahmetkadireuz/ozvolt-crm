export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import StatusBadge from '@/components/StatusBadge'

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

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Nummer</th><th>Klant</th><th>Status</th><th>Datum</th><th>Vervaldatum</th><th>Bedrag</th></tr>
            </thead>
            <tbody>
              {facturen.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#8ba8c4', padding: '32px' }}>Geen facturen gevonden.</td></tr>
                : facturen.map((f: any) => {
                    const totalen = berekenTotalen(f.regels ?? [], 0, f.btw_pct)
                    const vervalDatum = new Date(f.factuurdatum)
                    vervalDatum.setDate(vervalDatum.getDate() + (f.betalingstermijn ?? 14))
                    const teLaat = f.status === 'verstuurd' && vervalDatum < new Date()
                    return (
                      <tr key={f.id} onClick={() => { window.location.href = `/facturen/${f.id}` }}>
                        <td className="mono">{f.factuurnummer}</td>
                        <td style={{ fontWeight: 600 }}>{f.klant_naam}</td>
                        <td><StatusBadge status={teLaat ? 'te_laat' : f.status} /></td>
                        <td style={{ fontSize: '.82rem' }}>{new Date(f.factuurdatum).toLocaleDateString('nl-NL')}</td>
                        <td style={{ fontSize: '.82rem', color: teLaat ? '#dc2626' : '#8ba8c4' }}>
                          {vervalDatum.toLocaleDateString('nl-NL')}
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatEuro(totalen.inclBtw)}</td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
