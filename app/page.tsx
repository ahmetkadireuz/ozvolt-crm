export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { sql, formatEuro } from '@/lib/db'
import DashboardKlussenRijen from './DashboardKlussenRijen'
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
  const [stats, geldStats, nieuweKlussen, agendaVandaag, openFacturen, recenteOffertes] = await Promise.all([
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
      SELECT
        -- Waarde open offertes (incl. korting + btw)
        COALESCE((
          SELECT SUM(
            (SELECT COALESCE(SUM((r->>'aantal')::numeric * (r->>'prijs')::numeric), 0)
             FROM jsonb_array_elements(regels) r)
            * (1 - korting_pct / 100.0)
            * (1 + btw_pct / 100.0)
          )
          FROM offertes WHERE status IN ('concept','gestuurd')
        ), 0) AS offertes_waarde,

        -- Waarde open facturen (incl. btw)
        COALESCE((
          SELECT SUM(
            (SELECT COALESCE(SUM((r->>'aantal')::numeric * (r->>'prijs')::numeric), 0)
             FROM jsonb_array_elements(regels) r)
            * (1 + btw_pct / 100.0)
          )
          FROM facturen WHERE status IN ('verstuurd','te_laat')
        ), 0) AS facturen_open_waarde,

        -- Waarde te laat facturen
        COALESCE((
          SELECT SUM(
            (SELECT COALESCE(SUM((r->>'aantal')::numeric * (r->>'prijs')::numeric), 0)
             FROM jsonb_array_elements(regels) r)
            * (1 + btw_pct / 100.0)
          )
          FROM facturen WHERE status = 'te_laat'
        ), 0) AS te_laat_waarde,

        -- Omzet deze maand (betaald)
        COALESCE((
          SELECT SUM(
            (SELECT COALESCE(SUM((r->>'aantal')::numeric * (r->>'prijs')::numeric), 0)
             FROM jsonb_array_elements(regels) r)
            * (1 + btw_pct / 100.0)
          )
          FROM facturen
          WHERE (status = 'betaald' OR mollie_status = 'paid')
            AND DATE_TRUNC('month', factuurdatum) = DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS omzet_maand,

        -- Omzet vorige maand
        COALESCE((
          SELECT SUM(
            (SELECT COALESCE(SUM((r->>'aantal')::numeric * (r->>'prijs')::numeric), 0)
             FROM jsonb_array_elements(regels) r)
            * (1 + btw_pct / 100.0)
          )
          FROM facturen
          WHERE (status = 'betaald' OR mollie_status = 'paid')
            AND DATE_TRUNC('month', factuurdatum) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        ), 0) AS omzet_vorige_maand
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
      SELECT f.id, f.factuurnummer, f.status, f.factuurdatum, f.regels, f.btw_pct, kt.naam AS klant_naam
      FROM facturen f
      JOIN klanten kt ON kt.id = f.klant_id
      WHERE f.status IN ('verstuurd','te_laat')
      ORDER BY f.status DESC, f.factuurdatum ASC
      LIMIT 6
    `,
    sql`
      SELECT o.id, o.offertenummer, o.status, o.datum, o.regels, o.korting_pct, o.btw_pct, kt.naam AS klant_naam
      FROM offertes o
      JOIN klanten kt ON kt.id = o.klant_id
      WHERE o.status IN ('concept','gestuurd')
      ORDER BY o.datum DESC
      LIMIT 4
    `,
  ])

  const s = stats[0]
  const g = geldStats[0]

  function totaalFactuur(f: any) {
    const sub = f.regels.reduce((acc: number, r: any) => acc + Number(r.aantal) * Number(r.prijs), 0)
    return sub * (1 + f.btw_pct / 100)
  }
  function totaalOfferte(o: any) {
    const sub = o.regels.reduce((acc: number, r: any) => acc + Number(r.aantal) * Number(r.prijs), 0)
    return sub * (1 - o.korting_pct / 100) * (1 + o.btw_pct / 100)
  }

  const omzetTrend = Number(g.omzet_vorige_maand) > 0
    ? Math.round(((Number(g.omzet_maand) - Number(g.omzet_vorige_maand)) / Number(g.omzet_vorige_maand)) * 100)
    : null

  const nu = new Date()
  const maandNaam = nu.toLocaleDateString('nl-NL', { month: 'long' })

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Overzicht</h1>
          <p style={{ margin: 0, fontSize: '.78rem', color: '#8ba8c4' }}>
            {nu.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/klussen/nieuw" className="btn btn-primary">
          <span className="nav-ico" style={{ fontSize: 18 }}>add</span>
          Nieuw project
        </Link>
      </div>

      {/* ── Geld-statistieken ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>

        {/* Omzet deze maand */}
        <Link href="/facturen?status=betaald" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ borderLeft: '3px solid #16a34a' }}>
            <div className="stat-label">Omzet {maandNaam}</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', color: '#15803d' }}>{formatEuro(Number(g.omzet_maand))}</div>
            {omzetTrend !== null && (
              <div className="stat-sub" style={{ color: omzetTrend >= 0 ? '#16a34a' : '#dc2626' }}>
                {omzetTrend >= 0 ? '▲' : '▼'} {Math.abs(omzetTrend)}% vs vorige maand
              </div>
            )}
            {omzetTrend === null && <div className="stat-sub">Betaalde facturen</div>}
          </div>
        </Link>

        {/* Open offertes waarde */}
        <Link href="/offertes" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ borderLeft: '3px solid #7c3aed' }}>
            <div className="stat-label">Open offertes</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', color: '#7c3aed' }}>{formatEuro(Number(g.offertes_waarde))}</div>
            <div className="stat-sub">{s.offertes_open} offerte{s.offertes_open !== 1 ? 's' : ''} uitstaand</div>
          </div>
        </Link>

        {/* Open facturen waarde */}
        <Link href="/facturen" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ borderLeft: '3px solid #ea580c' }}>
            <div className="stat-label">Open facturen</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', color: '#ea580c' }}>{formatEuro(Number(g.facturen_open_waarde))}</div>
            <div className="stat-sub">{s.facturen_open} factuur/facturen open</div>
          </div>
        </Link>

        {/* Te laat */}
        <Link href="/facturen?status=te_laat" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ borderLeft: `3px solid ${s.te_laat > 0 ? '#dc2626' : '#e2e8f0'}` }}>
            <div className="stat-label">Te laat</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', color: s.te_laat > 0 ? '#dc2626' : '#8ba8c4' }}>
              {s.te_laat > 0 ? formatEuro(Number(g.te_laat_waarde)) : '—'}
            </div>
            <div className="stat-sub" style={{ color: s.te_laat > 0 ? '#dc2626' : '#8ba8c4' }}>
              {s.te_laat > 0 ? `${s.te_laat} factuur/facturen verlopen` : 'Alles op tijd'}
            </div>
          </div>
        </Link>
      </div>

      {/* ── Aantallen ── */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <Link href="/klussen?status=nieuw" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ borderLeft: '3px solid #3b82f6' }}>
            <div className="stat-label">Nieuwe aanvragen</div>
            <div className="stat-value" style={{ color: '#1d4ed8' }}>{s.nieuw}</div>
            <div className="stat-sub">Wachten op opvolging</div>
          </div>
        </Link>
        <Link href="/klussen" style={{ textDecoration: 'none' }}>
          <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div className="stat-label">Lopende projecten</div>
            <div className="stat-value">{s.open}</div>
            <div className="stat-sub">In behandeling / gepland</div>
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
        {/* Links: nieuwe aanvragen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="section-label" style={{ margin: 0 }}>Nieuwe aanvragen</div>
              <Link href="/klussen?status=nieuw" style={{ fontSize: '.78rem', color: '#3b82f6', textDecoration: 'none' }}>Alle projecten →</Link>
            </div>
            {nieuweKlussen.length === 0 ? (
              <p style={{ color: '#8ba8c4', fontSize: '.84rem', margin: 0 }}>Geen nieuwe aanvragen 🎉</p>
            ) : (
              <>
                {/* Desktop tabel */}
                <div className="table-wrap desktop-only">
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
                      <DashboardKlussenRijen klussen={nieuweKlussen} />
                    </tbody>
                  </table>
                </div>
                {/* Mobiel kaartjes */}
                <div className="mobile-only" style={{ display: 'none' }}>
                  {nieuweKlussen.map((k: any) => (
                    <Link key={k.id} href={`/klussen/${k.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '.88rem', color: '#0d1b3e' }}>{k.klant_naam}</div>
                            <div style={{ fontSize: '.74rem', color: '#8ba8c4', marginTop: 2 }}>{k.type_werk || '—'}</div>
                          </div>
                          <StatusBadge status={k.status} />
                        </div>
                        <div style={{ fontSize: '.72rem', color: '#94a3b8', marginTop: 4 }}>{timeAgo(k.aangemaakt_op)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Open offertes */}
          {recenteOffertes.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div className="section-label" style={{ margin: 0 }}>Openstaande offertes</div>
                <Link href="/offertes" style={{ fontSize: '.78rem', color: '#3b82f6', textDecoration: 'none' }}>Alle offertes →</Link>
              </div>
              {recenteOffertes.map((o: any) => (
                <Link key={o.id} href={`/offertes/${o.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.84rem', color: '#0d1b3e' }}>{o.klant_naam}</div>
                      <div style={{ fontSize: '.74rem', color: '#8ba8c4' }}>OZVT-{String(o.offertenummer).padStart(4,'0')} · {new Date(o.datum).toLocaleDateString('nl-NL')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#7c3aed' }}>{formatEuro(totaalOfferte(o))}</div>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Rechts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Agenda vandaag */}
          <div className="card">
            <div className="section-label" style={{ marginBottom: 12 }}>
              <span className="nav-ico" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>calendar_today</span>
              Agenda vandaag
            </div>
            {agendaVandaag.length === 0 ? (
              <p style={{ color: '#8ba8c4', fontSize: '.82rem', margin: '0 0 12px' }}>Geen afspraken vandaag.</p>
            ) : agendaVandaag.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 3, borderRadius: 4, background: '#3b82f6', flexShrink: 0, marginTop: 4, alignSelf: 'stretch', minHeight: 24 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.84rem', color: '#0d1b3e' }}>{a.titel}</div>
                  <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>
                    {new Date(a.datum_start).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    {a.klant_naam && ` · ${a.klant_naam}`}
                  </div>
                </div>
              </div>
            ))}
            <Link href="/agenda" className="btn btn-ghost btn-sm" style={{ marginTop: 4, width: '100%', justifyContent: 'center' }}>
              Agenda openen
            </Link>
          </div>

          {/* Open facturen */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-label" style={{ margin: 0 }}>
                <span className="nav-ico" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>receipt_long</span>
                Open facturen
              </div>
              <Link href="/facturen" style={{ fontSize: '.78rem', color: '#3b82f6', textDecoration: 'none' }}>Alle →</Link>
            </div>
            {openFacturen.length === 0 ? (
              <p style={{ color: '#8ba8c4', fontSize: '.82rem', margin: '0 0 12px' }}>Geen openstaande facturen.</p>
            ) : openFacturen.map((f: any) => (
              <Link key={f.id} href={`/facturen/${f.id}`} style={{ display: 'block', textDecoration: 'none', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.84rem', color: '#0d1b3e' }}>{f.klant_naam}</div>
                    <div style={{ fontSize: '.74rem', color: '#8ba8c4' }}>{f.factuurnummer} · {new Date(f.factuurdatum).toLocaleDateString('nl-NL')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '.88rem', color: f.status === 'te_laat' ? '#dc2626' : '#ea580c' }}>
                      {formatEuro(totaalFactuur(f))}
                    </div>
                    <StatusBadge status={f.status} />
                  </div>
                </div>
              </Link>
            ))}
            <Link href="/facturen" className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
              Alle facturen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
