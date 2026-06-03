'use client'

import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import { berekenTotalen, formatEuro } from '@/lib/db'

export default function FacturenTable({ facturen }: { facturen: any[] }) {
  const router = useRouter()
  return (
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
                    <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/facturen/${f.id}`)}>
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
  )
}
