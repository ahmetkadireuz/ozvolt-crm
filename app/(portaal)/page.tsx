import type { Metadata } from 'next'
import Link from 'next/link'
import { sql } from '@/lib/db'
import StatusBadge from '@/components/StatusBadge'

export const metadata: Metadata = { title: 'Overzicht' }

function timeAgo(dt: string) {
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
  if (diff < 60)    return 'zojuist'
  if (diff < 3600)  return `${Math.round(diff / 60)}m geleden`
  if (diff < 86400) return `${Math.round(diff / 3600)}u geleden`
  return `${Math.round(diff / 86400)}d geleden`
}

export default async function Dashboard() {
  const [stats, nieuweKlussen, agendaVandaag, openFacturen] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM klussen WHERE status='nieuw') AS nieuw,
        (SELECT COUNT(*)::int FROM klussen WHERE status IN ('in_behandeling','offerte_gestuurd','gepland')) AS open,
        (SELECT COUNT(*)::int FROM klanten) AS klanten,
        (SELECT COUNT(*)::int FROM offertes WHERE status IN ('concept','gestuurd')) AS offertes_open,
        (SELECT COUNT(*)::int FROM facturen WHERE status IN ('verstuurd','te_laat')) AS facturen_open,
        (SELECT COUNT(*)::int FROM facturen WHERE status='te_laat') AS te_laat
    `,
    sql`
      SELECT k.id, k.type_werk, k.status, k.bron, k.aangemaakt_op,
             kt.naam AS klant_naam, kt.telefoon, kt.locatie
      FROM klussen k
      JOIN klanten kt ON kt.id = k.klant_id
      WHERE k.status = 'nieuw'
      ORDER BY k.aangemaakt_op DESC
      LIMIT 8
    `,
    sql`
      SELECT a.*, kt.naam AS klant_naam
      FROM agenda_items a
      LEFT JOIN klanten kt ON kt.id = a.klant_id
      WHERE DATE(a.datum_start AT TIME ZONE 'Europe/Amsterdam') = CURRENT_DATE
        AND a.status = 'gepland'
      ORDER BY a.datum_start ASC
      LIMIT 5
    `,
    sql`
      SELECT f.id, f.factuurnummer, f.status, f.factuurdatum, kt.naam AS klant_naam
      FROM facturen f
      JOIN klanten kt ON kt.id = f.klant_id
      WHERE f.status IN ('verstuurd','te_laat')
      ORDER BY f.status DESC, f.factuurdatum ASC
      LIMIT 5
    `,
  ])

  const s = stats[0]

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">Overzicht</h1>
        <Link href="/klussen/nieuw" className="btn btn-primary">
          <span className="nav-ico" style={{ fontSize: 18 }}>add</span>
          Nieuwe klus
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <Link href="/klussen?status=nieuw" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ borderLeft: '3px solid #3b82f6' }}>
            <div className="stat-label">Nieuwe aanvragen</div>
            <div className="stat-value" style={{ color: '#1d4ed8' }}>{s.nieuw}</div>
            <div className="stat-sub">Wachten op opvolging</div>
          </div>
        </Link>
        <Link href="/klussen" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ borderLeft: '3px solid #ea580c' }}>
            <div className="stat-label">Open klussen</div>
            <div className="stat-value">{s.open}</div>
            <div className="stat-sub">In behandeling</div>
          </div>
        </Link>
        <Link href="/offertes" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ borderLeft: '3px solid #7c3aed' }}>
            <div className="stat-label">Open offertes</div>
            <div className="stat-value">{s.offertes_open}</div>
            <div className="stat-sub">Concept of gestuurd</div>
          </div>
        </Link>
        <Link href="/facturen?status=te_laat" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ borderLeft: `3px solid ${s.te_laat > 0 ? '#dc2626' : '#16a34a'}` }}>
            <div className="stat-label">Te laat</div>
            <div className="stat-value" style={{ color: s.te_laat > 0 ? '#dc2626' : '#0d1b3e' }}>{s.te_laat}</div>
            <div className="stat-sub">{s.facturen_open} facturen open</div>
          </div>
        </Link>
        <Link href="/klanten" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-label">Klanten</div>
            <div className="stat-value">{s.klanten}</div>
            <div className="stat-sub">Totaal in database</div>
          </div>
        </Link>
      </div>

      <div className="detail-grid">
        {/* Nieuwe aanvragen */}
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="section-label">Nieuwe aanvragen</div>
              <Link href="/klussen?status=nieuw" style={{ fontSize: '.78rem', color: '#3b82f6', textDecoration: 'none' }}>Alle klussen →</Link>
            </div>
            {nieuweKlussen.length === 0 ? (
              <p style={{ color: '#8ba8c4', fontSize: '.84rem', margin: 0 }}>Geen nieuwe aanvragen.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Klant</th>
                      <th>Type werk</th>
                      <th>Bron</th>
                      <th>Status</th>
                      <th>Tijd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nieuweKlussen.map((k: any) => (
                      <tr key={k.id} onClick={() => { window.location.href = `/klussen/${k.id}` }}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{k.klant_naam}</div>
                          <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>{k.locatie}</div>
                        </td>
                        <td>{k.type_werk || '—'}</td>
                        <td><span style={{ fontSize: '.75rem', color: '#64748b' }}>{k.bron}</span></td>
                        <td><StatusBadge status={k.status} /></td>
                        <td style={{ color: '#8ba8c4', fontSize: '.78rem', whiteSpace: 'nowrap' }}>{timeAgo(k.aangemaakt_op)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Rechterkolom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Agenda vandaag */}
          <div className="card">
            <div className="section-label" style={{ marginBottom: 12 }}>Agenda vandaag</div>
            {agendaVandaag.length === 0 ? (
              <p style={{ color: '#8ba8c4', fontSize: '.82rem', margin: 0 }}>Geen afspraken vandaag.</p>
            ) : agendaVandaag.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 4, borderRadius: 4, background: '#3b82f6', flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{a.titel}</div>
                  <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>
                    {new Date(a.datum_start).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    {a.klant_naam && ` · ${a.klant_naam}`}
                  </div>
                </div>
              </div>
            ))}
            <Link href="/agenda" className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
              Agenda openen
            </Link>
          </div>

          {/* Open facturen */}
          <div className="card">
            <div className="section-label" style={{ marginBottom: 12 }}>Open facturen</div>
            {openFacturen.length === 0 ? (
              <p style={{ color: '#8ba8c4', fontSize: '.82rem', margin: 0 }}>Geen openstaande facturen.</p>
            ) : openFacturen.map((f: any) => (
              <Link key={f.id} href={`/facturen/${f.id}`} style={{ display: 'block', textDecoration: 'none', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.84rem', color: '#0d1b3e' }}>{f.klant_naam}</div>
                    <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>{f.factuurnummer}</div>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
              </Link>
            ))}
            <Link href="/facturen" className="btn btn-ghost btn-sm" style={{ marginTop: 4, width: '100%', justifyContent: 'center' }}>
              Alle facturen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
