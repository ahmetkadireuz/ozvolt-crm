export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect, notFound } from 'next/navigation'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql, formatEuro } from '@/lib/db'
// BetaalKnop (iDEAL) tijdelijk vervangen door bankoverschrijving

export default async function KlantFactuurPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klantId = await getKlantSessie()
  if (!klantId) redirect('/klant/geen-toegang')

  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam, k.email AS klant_email, k.locatie AS klant_locatie
    FROM facturen f
    JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${id} AND f.klant_id = ${klantId}
  `
  if (!rows[0]) notFound()

  const f = rows[0]
  const regels: { omschrijving: string; beschrijving?: string; aantal: number; prijs: number }[] = f.regels
  const sub = regels.reduce((s, r) => s + r.aantal * r.prijs, 0)
  const btw = sub * (f.btw_pct / 100)
  const totaal = sub + btw

  const isBetaald = f.mollie_status === 'paid' || f.status === 'betaald'

  return (
    <div>
      <a href="/klant/dashboard" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>← Terug naar overzicht</a>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginTop: 16, border: '1px solid #e2e8f0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0d1b3e' }}>
              Factuur {f.factuurnummer}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              {new Date(f.factuurdatum).toLocaleDateString('nl-NL')}
              {' · '}Betalingstermijn: {f.betalingstermijn} dagen
            </p>
          </div>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: isBetaald ? '#dcfce7' : '#fee2e2',
            color: isBetaald ? '#15803d' : '#dc2626',
          }}>
            {isBetaald ? 'Betaald' : 'Openstaand'}
          </span>
        </div>

        {/* Klant */}
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#475569' }}>
          <strong style={{ color: '#0d1b3e' }}>{f.klant_naam}</strong>
          {f.klant_locatie && <> · {f.klant_locatie}</>}
        </div>

        {/* Regels */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Omschrijving</th>
              <th style={{ textAlign: 'right', padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Aantal</th>
              <th style={{ textAlign: 'right', padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Prijs</th>
              <th style={{ textAlign: 'right', padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Totaal</th>
            </tr>
          </thead>
          <tbody>
            {regels.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 0' }}>
                  <div style={{ fontWeight: 500, color: '#0d1b3e' }}>{r.omschrijving}</div>
                  {r.beschrijving && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{r.beschrijving}</div>}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 0', color: '#475569' }}>{r.aantal}</td>
                <td style={{ textAlign: 'right', padding: '10px 0', color: '#475569' }}>{formatEuro(r.prijs)}</td>
                <td style={{ textAlign: 'right', padding: '10px 0', fontWeight: 600, color: '#0d1b3e' }}>{formatEuro(r.aantal * r.prijs)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totalen */}
        <div style={{ marginTop: 16, borderTop: '2px solid #e2e8f0', paddingTop: 12 }}>
          <TotaalRegel label="Subtotaal excl. BTW" waarde={formatEuro(sub)} />
          <TotaalRegel label={`BTW (${f.btw_pct}%)`} waarde={formatEuro(btw)} />
          <TotaalRegel label="Totaal incl. BTW" waarde={formatEuro(totaal)} vet />
        </div>

        {/* Notities */}
        {f.notities && (
          <div style={{ marginTop: 20, padding: 16, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>
            <strong>Opmerking:</strong> {f.notities}
          </div>
        )}

        {/* Betaal / download */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isBetaald && totaal > 0 && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontWeight: 800, color: '#0369a1', fontSize: 15, marginBottom: 12 }}>🏦 Betalen via bankoverschrijving</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                {[
                  { label: 'IBAN', waarde: 'NL69 KNAB 0780 9871 79' },
                  { label: 'T.n.v.', waarde: 'Ozvolt Elektrotechniek' },
                  { label: 'Bedrag', waarde: formatEuro(totaal) },
                  { label: 'Betalingskenmerk', waarde: f.factuurnummer },
                ].map(({ label, waarde }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0f2fe', paddingBottom: 8 }}>
                    <span style={{ color: '#64748b' }}>{label}</span>
                    <strong style={{ color: '#0d1b3e' }}>{waarde}</strong>
                  </div>
                ))}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12, color: '#0369a1' }}>
                Vermeld het betalingskenmerk bij uw overschrijving. Na ontvangst wordt de factuur als betaald gemarkeerd.
              </p>
            </div>
          )}
          <a
            href={`/api/facturen/${f.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center',
              padding: '11px', borderRadius: 8,
              border: '1px solid #cbd5e1',
              color: '#475569', fontSize: 14, fontWeight: 600,
              textDecoration: 'none', background: '#f8fafc',
            }}
          >
            📄 PDF downloaden
          </a>
        </div>
      </div>
    </div>
  )
}

function TotaalRegel({ label, waarde, vet }: { label: string; waarde: string; vet?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: vet ? 15 : 13, fontWeight: vet ? 800 : 400, color: vet ? '#0d1b3e' : '#475569' }}>
      <span>{label}</span><span>{waarde}</span>
    </div>
  )
}
