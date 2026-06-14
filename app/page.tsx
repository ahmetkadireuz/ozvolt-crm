export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { formatEuro } from '@/lib/db'
import { getDashboardData } from '@/lib/dashboard-cache'
import StatusBadge from '@/components/StatusBadge'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Overzicht' }

function timeAgo(dt: string) {
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
  if (diff < 60)    return 'zojuist'
  if (diff < 3600)  return `${Math.round(diff / 60)}m geleden`
  if (diff < 86400) return `${Math.round(diff / 3600)}u geleden`
  return `${Math.round(diff / 86400)}d geleden`
}

export default async function Dashboard() {
  const { stats, geldStats, nieuweKlussen, agendaVandaag, openFacturen, recenteOffertes, teLaatFacturen } = await getDashboardData()

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

  const hasActies =
    nieuweKlussen.length > 0 || teLaatFacturen.length > 0 || recenteOffertes.length > 0

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Overzicht</h1>
          <p className="page-sub">
            {nu.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/klussen/nieuw" className="btn btn-primary">
          <Icon name="plus" size={16} />
          Nieuw project
        </Link>
      </div>

      {/* ── Actiestrook: wat moet je nu doen ── */}
      {hasActies && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="section-label" style={{ marginBottom: 14 }}>
            <Icon name="sparkles" size={14} /> Vandaag op te pakken
          </div>

          {/* Nieuwe aanvragen */}
          {nieuweKlussen.map((k: any) => (
            <Link key={`nw-${k.id}`} href={`/klussen/${k.id}`} className="action-row">
              <span className="action-row-icon blue">
                <Icon name="briefcase" size={18} />
              </span>
              <div className="action-row-body">
                <div className="action-row-title">{k.klant_naam}</div>
                <div className="action-row-meta">
                  {k.type_werk || 'Nieuwe aanvraag'}{k.locatie ? ` · ${k.locatie}` : ''} · via {k.bron || 'handmatig'}
                </div>
              </div>
              <div className="action-row-side">{timeAgo(k.aangemaakt_op)}</div>
            </Link>
          ))}

          {/* Te late facturen */}
          {teLaatFacturen.map((f: any) => (
            <Link key={`tl-${f.id}`} href={`/facturen/${f.id}`} className="action-row">
              <span className="action-row-icon red">
                <Icon name="receipt" size={18} />
              </span>
              <div className="action-row-body">
                <div className="action-row-title">{f.klant_naam} · {f.factuurnummer}</div>
                <div className="action-row-meta">Factuur is verlopen · stuur een herinnering</div>
              </div>
              <div className="action-row-side">Te laat</div>
            </Link>
          ))}

          {/* Open offertes */}
          {recenteOffertes.slice(0, 2).map((o: any) => (
            <Link key={`of-${o.id}`} href={`/offertes/${o.id}`} className="action-row">
              <span className="action-row-icon purple">
                <Icon name="file-text" size={18} />
              </span>
              <div className="action-row-body">
                <div className="action-row-title">{o.klant_naam}</div>
                <div className="action-row-meta">
                  Offerte OZVT-{String(o.offertenummer).padStart(4,'0')} · wacht op reactie
                </div>
              </div>
              <div className="action-row-side">{formatEuro(totaalOfferte(o))}</div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Geld-statistieken (Moneybird-rust) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Link href="/facturen?status=betaald" className="stat-link">
          <div className="stat-card">
            <div className="stat-label"><span className="stat-dot green" /> Omzet {maandNaam}</div>
            <div className="stat-value">{formatEuro(Number(g.omzet_maand))}</div>
            {omzetTrend !== null
              ? <div className="stat-sub" style={{ color: omzetTrend >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {omzetTrend >= 0 ? '↑' : '↓'} {Math.abs(omzetTrend)}% vs vorige maand
                </div>
              : <div className="stat-sub">Betaalde facturen</div>}
          </div>
        </Link>

        <Link href="/offertes" className="stat-link">
          <div className="stat-card">
            <div className="stat-label"><span className="stat-dot purple" /> Open offertes</div>
            <div className="stat-value">{formatEuro(Number(g.offertes_waarde))}</div>
            <div className="stat-sub">{s.offertes_open} offerte{s.offertes_open !== 1 ? 's' : ''} uitstaand</div>
          </div>
        </Link>

        <Link href="/facturen" className="stat-link">
          <div className="stat-card">
            <div className="stat-label"><span className="stat-dot orange" /> Open facturen</div>
            <div className="stat-value">{formatEuro(Number(g.facturen_open_waarde))}</div>
            <div className="stat-sub">{s.facturen_open} factuur/facturen open</div>
          </div>
        </Link>

        <Link href="/facturen?status=te_laat" className="stat-link">
          <div className="stat-card">
            <div className="stat-label"><span className={`stat-dot ${s.te_laat > 0 ? 'red' : 'green'}`} /> Te laat</div>
            <div className="stat-value" style={{ color: s.te_laat > 0 ? 'var(--red)' : 'var(--text-soft)' }}>
              {s.te_laat > 0 ? formatEuro(Number(g.te_laat_waarde)) : '—'}
            </div>
            <div className="stat-sub" style={{ color: s.te_laat > 0 ? 'var(--red)' : 'var(--text-mute)' }}>
              {s.te_laat > 0 ? `${s.te_laat} factuur/facturen verlopen` : 'Alles op tijd'}
            </div>
          </div>
        </Link>
      </div>

      {/* ── Onderaan: twee kolommen ── */}
      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Open facturen */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-label" style={{ margin: 0 }}>
                <Icon name="receipt" size={14} /> Openstaande facturen
              </div>
              <Link href="/facturen" className="btn-link" style={{ fontSize: '.76rem' }}>Alle facturen →</Link>
            </div>
            {openFacturen.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '.84rem', margin: 0 }}>Geen openstaande facturen.</p>
            ) : openFacturen.map((f: any) => (
              <Link key={f.id} href={`/facturen/${f.id}`} style={{ display: 'block', textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.86rem', color: 'var(--navy)' }}>{f.klant_naam}</div>
                    <div style={{ fontSize: '.74rem', color: 'var(--text-mute)' }}>{f.factuurnummer} · {new Date(f.factuurdatum).toLocaleDateString('nl-NL')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '.88rem', color: f.status === 'te_laat' ? 'var(--red)' : 'var(--navy)' }}>
                      {formatEuro(totaalFactuur(f))}
                    </div>
                    <StatusBadge status={f.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Open offertes (alleen tonen als er meer zijn dan in actiestrook) */}
          {recenteOffertes.length > 2 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="section-label" style={{ margin: 0 }}>
                  <Icon name="file-text" size={14} /> Andere open offertes
                </div>
                <Link href="/offertes" className="btn-link" style={{ fontSize: '.76rem' }}>Alle offertes →</Link>
              </div>
              {recenteOffertes.slice(2).map((o: any) => (
                <Link key={o.id} href={`/offertes/${o.id}`} style={{ display: 'block', textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.86rem', color: 'var(--navy)' }}>{o.klant_naam}</div>
                      <div style={{ fontSize: '.74rem', color: 'var(--text-mute)' }}>OZVT-{String(o.offertenummer).padStart(4,'0')} · {new Date(o.datum).toLocaleDateString('nl-NL')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--purple)' }}>{formatEuro(totaalOfferte(o))}</div>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Agenda vandaag */}
          <div className="card">
            <div className="section-label">
              <Icon name="calendar" size={14} /> Agenda vandaag
            </div>
            {agendaVandaag.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '.82rem', margin: '0 0 12px' }}>Geen afspraken vandaag.</p>
            ) : agendaVandaag.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 3, borderRadius: 4, background: 'var(--accent)', flexShrink: 0, marginTop: 4, alignSelf: 'stretch', minHeight: 24 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.84rem', color: 'var(--navy)' }}>{a.titel}</div>
                  <div style={{ fontSize: '.74rem', color: 'var(--text-mute)' }}>
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

          {/* Snel-stats */}
          <div className="card">
            <div className="section-label">
              <Icon name="dashboard" size={14} /> Snel overzicht
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/klussen?status=nieuw" style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', fontSize: '.86rem', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-mute)' }}>Nieuwe aanvragen</span>
                <span style={{ fontWeight: 700, color: s.nieuw > 0 ? 'var(--accent)' : 'var(--text-soft)' }}>{s.nieuw}</span>
              </Link>
              <Link href="/klussen" style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', fontSize: '.86rem', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-mute)' }}>Lopende projecten</span>
                <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{s.open}</span>
              </Link>
              <Link href="/klanten" style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', fontSize: '.86rem', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-mute)' }}>Klanten</span>
                <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{s.klanten}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
