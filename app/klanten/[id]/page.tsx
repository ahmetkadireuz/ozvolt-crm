export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import StatusBadge from '@/components/StatusBadge'
import KlantActions from './KlantActions'

export const metadata: Metadata = { title: 'Klantprofiel' }

export default async function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klantId = parseInt(id)
  if (isNaN(klantId)) notFound()

  const [klantRows, klussen, offertes, facturen] = await Promise.all([
    sql`SELECT * FROM klanten WHERE id = ${klantId}`,
    sql`SELECT * FROM klussen WHERE klant_id = ${klantId} ORDER BY aangemaakt_op DESC`,
    sql`SELECT * FROM offertes WHERE klant_id = ${klantId} ORDER BY datum DESC LIMIT 10`,
    sql`SELECT * FROM facturen WHERE klant_id = ${klantId} ORDER BY factuurdatum DESC LIMIT 10`,
  ])

  const klant = klantRows[0]
  if (!klant) notFound()

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/klanten" className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <h1 className="page-title">{klant.naam}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/klussen/nieuw?klant=${klantId}`} className="btn btn-primary btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>add</span>
            Nieuwe klus
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Gegevens */}
          <div className="card">
            <div className="section-label">Gegevens</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', fontSize: '.84rem' }}>
              {[
                ['Naam', klant.naam],
                ['Type', klant.type],
                ['Telefoon', klant.telefoon],
                ['E-mail', klant.email],
                ['Locatie', klant.locatie],
                ['Klant sinds', new Date(klant.aangemaakt_op).toLocaleDateString('nl-NL')],
              ].map(([label, value]) => (
                <div key={label}>
                  <span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem' }}>{label}</span>
                  <span>{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status notitie */}
          {klant.status_notitie && (
            <div className="card" style={{ borderLeft: '3px solid #4c7191' }}>
              <div className="section-label" style={{ marginBottom: 6 }}>Situatie</div>
              <p style={{ fontSize: '.84rem', color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>{klant.status_notitie}</p>
            </div>
          )}

          {/* Klussen */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-label" style={{ margin: 0 }}>Klussen ({klussen.length})</div>
              <Link href={`/klussen/nieuw`} className="btn btn-ghost btn-sm">+ Nieuw</Link>
            </div>
            {klussen.length === 0
              ? <p style={{ color: '#8ba8c4', fontSize: '.82rem', margin: 0 }}>Geen klussen.</p>
              : klussen.map((k: any) => (
                  <Link key={k.id} href={`/klussen/${k.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0d1b3e', fontSize: '.84rem' }}>{k.type_werk || `Klus #${k.id}`}</div>
                      <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>{new Date(k.aangemaakt_op).toLocaleDateString('nl-NL')}</div>
                    </div>
                    <StatusBadge status={k.status} />
                  </Link>
                ))}
          </div>

          {/* Offertes */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-label" style={{ margin: 0 }}>Offertes ({offertes.length})</div>
              <Link href={`/offertes/nieuw?klant=${klantId}`} className="btn btn-primary btn-sm">
                <span className="nav-ico" style={{ fontSize: 14 }}>add</span>
                Nieuwe offerte
              </Link>
            </div>
            {offertes.length === 0
              ? <p style={{ color: '#8ba8c4', fontSize: '.82rem', margin: 0 }}>Geen offertes.</p>
              : offertes.map((o: any) => (
                <Link key={o.id} href={`/offertes/${o.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0d1b3e', fontSize: '.84rem' }}>OZVT-{String(o.offertenummer).padStart(4,'0')}</div>
                    <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>{new Date(o.datum).toLocaleDateString('nl-NL')}</div>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              ))}
          </div>

          {/* Facturen */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-label" style={{ margin: 0 }}>Facturen ({facturen.length})</div>
              <Link href={`/facturen/nieuw?klant=${klantId}`} className="btn btn-ghost btn-sm">
                <span className="nav-ico" style={{ fontSize: 14 }}>add</span>
                Nieuwe factuur
              </Link>
            </div>
            {facturen.length === 0
              ? <p style={{ color: '#8ba8c4', fontSize: '.82rem', margin: 0 }}>Geen facturen.</p>
              : facturen.map((f: any) => (
                <Link key={f.id} href={`/facturen/${f.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0d1b3e', fontSize: '.84rem' }}>{f.factuurnummer}</div>
                    <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>{new Date(f.factuurdatum).toLocaleDateString('nl-NL')}</div>
                  </div>
                  <StatusBadge status={f.status} />
                </Link>
              ))}
          </div>
        </div>

        <KlantActions klant={klant} klantId={klantId} />
      </div>
    </div>
  )
}
