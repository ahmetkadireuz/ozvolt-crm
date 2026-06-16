export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  const waItems: { omschrijving: string; door: string; toelichting: string }[] = o.wa_items ?? []
  const bijlagen: { naam: string; url: string; type: string }[] = o.bijlagen ?? []

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
                  {r.beschrijving && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, whiteSpace: 'pre-wrap' }}>{r.beschrijving}</div>}
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

        {/* Werkzaamheden */}
        {waItems.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0d1b3e', margin: '0 0 12px' }}>Afgesproken werkzaamheden</h3>
            {waItems.map((w, i) => {
              const doorKleur: Record<string, { bg: string; fg: string }> = {
                ozvolt:      { bg: '#e8edf5', fg: '#1b2d4a' },
                klant:       { bg: '#f3f0ff', fg: '#7c3aed' },
                gezamenlijk: { bg: '#f0fdf4', fg: '#0f7a3a' },
              }
              const d = doorKleur[w.door] ?? { bg: '#f1f5f9', fg: '#64748b' }
              return (
                <div key={i} style={{ padding: '10px 12px', marginBottom: 6, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, color: '#0d1b3e' }}>{w.omschrijving}</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: d.bg, color: d.fg, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8 }}>
                      {w.door === 'ozvolt' ? 'Door Ozvolt' : w.door === 'klant' ? 'Door klant' : 'Gezamenlijk'}
                    </span>
                  </div>
                  {w.toelichting && <div style={{ color: '#64748b', marginTop: 4 }}>{w.toelichting}</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* Bijlagen */}
        {bijlagen.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0d1b3e', margin: '0 0 12px' }}>Bijgevoegde documenten</h3>
            {bijlagen.map((b, i) => (
              <a key={i} href={b.url} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 6,
                background: '#f8fafc', borderRadius: 8,
                border: '1px solid #e2e8f0', textDecoration: 'none',
              }}>
                <span style={{ fontSize: 20 }}>{b.type?.includes('pdf') ? '📄' : '📎'}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0d1b3e' }}>{b.naam}</span>
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>Downloaden ↓</span>
              </a>
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

        {/* PDF downloaden */}
        <a
          href={`/api/offertes/${o.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', textAlign: 'center',
            padding: '11px', borderRadius: 8,
            border: '1px solid #cbd5e1',
            color: '#475569', fontSize: 14, fontWeight: 600,
            textDecoration: 'none', background: '#f8fafc',
            marginTop: 12,
          }}
        >
          📄 PDF downloaden
        </a>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    concept:      { bg: '#fef9c3', fg: '#a16207', label: 'Wacht op uw akkoord' },
    gestuurd:     { bg: '#fef9c3', fg: '#a16207', label: 'Wacht op uw akkoord' },
    geaccepteerd: { bg: '#dcfce7', fg: '#15803d', label: 'Geaccepteerd' },
    verlopen:     { bg: '#fee2e2', fg: '#dc2626', label: 'Verlopen' },
    geweigerd:    { bg: '#fee2e2', fg: '#dc2626', label: 'Geweigerd' },
  }
  const s = map[status] ?? { bg: '#f1f5f9', fg: '#64748b', label: 'Wacht op uw akkoord' }
  return (
    <span style={{ background: s.bg, color: s.fg, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
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
