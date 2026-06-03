'use client'

import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import { berekenTotalen, formatEuro } from '@/lib/utils'

export default function OffertesTable({ offertes }: { offertes: any[] }) {
  const router = useRouter()
  return (
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
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/offertes/${o.id}`)}>
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
  )
}
