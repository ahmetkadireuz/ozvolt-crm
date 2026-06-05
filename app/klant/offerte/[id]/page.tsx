export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql, formatEuro } from '@/lib/db'
import AccepteerKnop from './AccepteerKnop'

export default async function KlantOffertePagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klantId = await getKlantSessie()
  if (!klantId) redirect('/klant/geen-toegang')

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email, k.locatie AS klant_locatie,
           ks.type_werk, ks.omschrijving AS klus_omschrijving
    FROM offertes o
    JOIN klanten k ON k.id = o.klant_id
    LEFT JOIN klussen ks ON ks.id = o.klus_id
    WHERE o.id = ${id} AND o.klant_id = ${klantId}
  `
  if (!rows[0]) notFound()

  const o = rows[0]
  const regels: { omschrijving: string; beschrijving?: string; aantal: number; prijs: number; btw: number }[] = o.regels

  const sub = regels.reduce((s, r) => s + r.aantal * r.prijs, 0)
  const korting = sub * (o.korting_pct / 100)
  const na = sub - korting
  const btw = na * (o.btw_pct / 100)
  const totaal = na + btw

  // Werkafspraken (agenda items gekoppeld aan klus)
  const afspraken = o.klus_id ? await sql`
    SELECT titel, datum_start, datum_eind, notities FROM agenda_items
    WHERE klus_id = ${o.klus_id} ORDER BY datum_start
  ` : []

  const isGeaccepteerd = o.status === 'geaccepteerd'

  return (
    <div>
      <a href="/klant/dashboard" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>← Terug naar overzicht</a>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginTop: 16, border: '1px solid #e2e8f0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0d1b3e' }}>
              Offerte #{o.offertenummer}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Datum: {new Date(o.datum).toLocaleDateString('nl-NL')}
              {o.geldig_tot && ` · Geldig t/m ${new Date(o.geldig_tot).toLocaleDateString('nl-NL')}`}
            </p>
          </div>
          <StatusBadge status={o.status} />
        </div>

        {/* Klantgegevens */}
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#475569' }}>
          <strong style={{ color: '#0d1b3e' }}>{o.klant_naam}</strong>
          {o.klant_locatie && <> · {o.klant_locatie}</>}
          {o.type_werk && <div style={{ marginTop: 4 }}>Project: {o.type_werk}</div>}
        </div>

        {/* Regelitems */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Omschrijving</th>
              <th style={{ textAlign: 'right', padding: '6px 0', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Aantal</th>
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
          <TotaalRegel label="Subtotaal" waarde={formatEuro(sub)} />
          {korting > 0 && <TotaalRegel label={`Korting (${o.korting_pct}%)`} waarde={`- ${formatEuro(korting)}`} />}
          <TotaalRegel label={`BTW (${o.btw_pct}%)`} waarde={formatEuro(btw)} />
          <TotaalRegel label="Totaal incl. BTW" waarde={formatEuro(totaal)} vet />
        </div>

        {/* Notities */}
        {o.notities && (
          <div style={{ marginTop: 20, padding: 16, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>
            <strong>Opmerking:</strong> {o.notities}
          </div>
        )}

        {/* Werkafspraken */}
        {afspraken.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0d1b3e', margin: '0 0 12px' }}>Geplande werkafspraken</h3>
            {afspraken.map((a: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                <div style={{ minWidth: 100, color: '#64748b' }}>
                  {new Date(a.datum_start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#0d1b3e' }}>{a.titel}</div>
                  {a.notities && <div style={{ color: '#64748b', marginTop: 2 }}>{a.notities}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accepteer knop */}
        {!isGeaccepteerd ? (
          <div style={{ marginTop: 32 }}>
            <AccepteerKnop offerteId={o.id} totaal={formatEuro(totaal)} />
          </div>
        ) : (
          <div style={{ marginTop: 32, padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 13, color: '#15803d', textAlign: 'center' }}>
            ✓ Offerte geaccepteerd op {new Date(o.accepted_at).toLocaleDateString('nl-NL')}
            {o.accepted_name && ` door ${o.accepted_name}`}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    concept:      { bg: '#f1f5f9', fg: '#64748b' },
    verzonden:    { bg: '#fef9c3', fg: '#a16207' },
    geaccepteerd: { bg: '#dcfce7', fg: '#15803d' },
    verlopen:     { bg: '#fee2e2', fg: '#dc2626' },
  }
  const s = map[status] ?? { bg: '#f1f5f9', fg: '#64748b' }
  return (
    <span style={{ background: s.bg, color: s.fg, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
      {status}
    </span>
  )
}

function TotaalRegel({ label, waarde, vet }: { label: string; waarde: string; vet?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: vet ? 15 : 13, fontWeight: vet ? 800 : 400, color: vet ? '#0d1b3e' : '#475569' }}>
      <span>{label}</span>
      <span>{waarde}</span>
    </div>
  )
}
