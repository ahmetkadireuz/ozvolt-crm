import type { Metadata } from 'next'
import Link from 'next/link'
import { sql } from '@/lib/db'
import StatusBadge from '@/components/StatusBadge'
import { berekenTotalen, formatEuro } from '@/lib/db'

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

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Nummer</th><th>Klant</th><th>Status</th><th>Datum</th><th>Geldig tot</th><th>Bedrag</th></tr>
            </thead>
            <tbody>
              {offertes.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#8ba8c4', padding: '32px' }}>Geen offertes gevonden.</td></tr>
                : offertes.map((o: any) => {
                    const totalen = berekenTotalen(o.regels ?? [], o.korting_pct, o.btw_pct)
                    return (
                      <tr key={o.id} onClick={() => { window.location.href = `/offertes/${o.id}` }}>
                        <td className="mono">AM-{o.offertenummer}</td>
                        <td style={{ fontWeight: 600 }}>{o.klant_naam}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td style={{ fontSize: '.82rem' }}>{new Date(o.datum).toLocaleDateString('nl-NL')}</td>
                        <td style={{ fontSize: '.82rem', color: o.geldig_tot && new Date(o.geldig_tot) < new Date() ? '#dc2626' : '#8ba8c4' }}>
                          {o.geldig_tot ? new Date(o.geldig_tot).toLocaleDateString('nl-NL') : '—'}
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
