export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import StatusBadge from '@/components/StatusBadge'
import KlusActions from './KlusActions'
import PuntenEditor from './PuntenEditor'

export const metadata: Metadata = { title: 'Klus detail' }

const STATUSES = ['nieuw','in_behandeling','offerte_gestuurd','gepland','afgerond']
const STATUS_LABELS: Record<string, string> = {
  nieuw: 'Nieuw', in_behandeling: 'In behandeling',
  offerte_gestuurd: 'Offerte gestuurd', gepland: 'Gepland', afgerond: 'Afgerond',
}

export default async function KlusDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ msg?: string }>
}) {
  const { id } = await params
  const { msg } = await searchParams
  const klusId = parseInt(id)
  if (isNaN(klusId)) notFound()

  const [klusRows, offertesRows, facturenRows, afsprakenRows, siblingRows] = await Promise.all([
    sql`
      SELECT k.*, kt.id AS klant_id, kt.naam AS klant_naam,
             kt.email AS klant_email, kt.telefoon AS klant_tel,
             kt.type AS klant_type, kt.locatie AS klant_locatie
      FROM klussen k JOIN klanten kt ON kt.id = k.klant_id
      WHERE k.id = ${klusId}
    `,
    sql`SELECT id, offertenummer, status, datum, wa_items FROM offertes WHERE klus_id = ${klusId} ORDER BY datum DESC`,
    sql`SELECT id, factuurnummer, status, factuurdatum FROM facturen WHERE klus_id = ${klusId} ORDER BY factuurdatum DESC`,
    sql`SELECT id, afspraaknummer, status, datum, titel, afspraken FROM werkafspraken WHERE klus_id = ${klusId} ORDER BY datum DESC`,
    sql`SELECT id, type_werk, status, aangemaakt_op FROM klussen WHERE klant_id = (SELECT klant_id FROM klussen WHERE id = ${klusId}) AND id != ${klusId} ORDER BY aangemaakt_op DESC LIMIT 5`,
  ])

  const klus = klusRows[0]
  if (!klus) notFound()

  const tel = (klus.klant_tel ?? '').replace(/[^0-9+]/g, '')
  const telWA = tel.startsWith('0') ? '31' + tel.slice(1) : tel.replace(/^\+/, '')
  const waUrl = `https://wa.me/${telWA}?text=${encodeURIComponent(`Hallo ${klus.klant_naam}, hier is Ozvolt Elektrotechniek over uw aanvraag.`)}`

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/klussen" className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>{klus.klant_naam}</h1>
            <span className="mono" style={{ color: '#8ba8c4' }}>Klus #{klus.id} · {new Date(klus.aangemaakt_op).toLocaleDateString('nl-NL')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={waUrl} target="_blank" rel="noopener" className="btn btn-success btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>chat</span>
            WhatsApp
          </a>
          {klus.klant_tel && (
            <a href={`tel:${klus.klant_tel}`} className="btn btn-ghost btn-sm">
              <span className="nav-ico" style={{ fontSize: 16 }}>call</span>
              Bellen
            </a>
          )}
        </div>
      </div>

      {msg && <div className="alert alert-ok">{decodeURIComponent(msg)}</div>}

      <div className="detail-grid">
        {/* Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Klant info */}
          <div className="card">
            <div className="section-label">Klantgegevens</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: '.84rem' }}>
              <div><span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem' }}>Naam</span>{klus.klant_naam}</div>
              <div><span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem' }}>Type</span>{klus.klant_type}</div>
              <div><span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem' }}>Telefoon</span>
                {klus.klant_tel ? <a href={`tel:${klus.klant_tel}`} style={{ color: '#0d1b3e', textDecoration: 'none', fontWeight: 600 }}>{klus.klant_tel}</a> : '—'}
              </div>
              <div><span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem' }}>E-mail</span>
                {klus.klant_email ? <a href={`mailto:${klus.klant_email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>{klus.klant_email}</a> : '—'}
              </div>
              <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem' }}>Locatie</span>{klus.klant_locatie || '—'}</div>
            </div>
            <Link href={`/klanten/${klus.klant_id}`} className="btn btn-ghost btn-sm" style={{ marginTop: 14 }}>
              Klantprofiel →
            </Link>
          </div>

          {/* Aanvraagdetails */}
          <div className="card">
            <div className="section-label">Aanvraagdetails</div>
            <div style={{ display: 'grid', gap: '10px 20px', gridTemplateColumns: '1fr 1fr', fontSize: '.84rem' }}>
              <div><span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem' }}>Type werk</span>{klus.type_werk || '—'}</div>
              <div><span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem' }}>Product</span>{klus.product || '—'}</div>
              <div><span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem' }}>Bron</span>{klus.bron}</div>
              <div><span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem' }}>Status</span><StatusBadge status={klus.status} /></div>
              {klus.omschrijving && (
                <div style={{ gridColumn: '1/-1' }}>
                  <span style={{ color: '#8ba8c4', display: 'block', fontSize: '.72rem', marginBottom: 4 }}>Omschrijving</span>
                  <p style={{ margin: 0, lineHeight: 1.6 }}>{klus.omschrijving}</p>
                </div>
              )}
            </div>
          </div>

          {/* Documenten: Offertes, Facturen & Werkafspraken */}
          <div className="card">
            <div className="section-label">Gekoppelde documenten</div>

            {offertesRows.length === 0 && facturenRows.length === 0 && afsprakenRows.length === 0 && (
              <p style={{ color: '#8ba8c4', fontSize: '.84rem', margin: '0 0 12px' }}>Nog geen documenten voor deze klus.</p>
            )}

            {offertesRows.map((o: any) => (
              <Link key={o.id} href={`/offertes/${o.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#0d1b3e', fontSize: '.84rem' }}>Offerte OZVT-{String(o.offertenummer).padStart(4,'0')}</span>
                  <span style={{ color: '#8ba8c4', fontSize: '.75rem', marginLeft: 8 }}>{new Date(o.datum).toLocaleDateString('nl-NL')}</span>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}

            {facturenRows.map((f: any) => (
              <Link key={f.id} href={`/facturen/${f.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#0d1b3e', fontSize: '.84rem' }}>Factuur {f.factuurnummer}</span>
                  <span style={{ color: '#8ba8c4', fontSize: '.75rem', marginLeft: 8 }}>{new Date(f.factuurdatum).toLocaleDateString('nl-NL')}</span>
                </div>
                <StatusBadge status={f.status} />
              </Link>
            ))}

            {afsprakenRows.map((a: any) => (
              <div key={a.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Link href={`/afspraken/${a.id}`} style={{ fontWeight: 600, color: '#0d1b3e', fontSize: '.84rem', textDecoration: 'none' }}>
                      {a.titel || `OZWA-${String(a.afspraaknummer).padStart(4,'0')}`}
                    </Link>
                    <span style={{ color: '#8ba8c4', fontSize: '.75rem', marginLeft: 8 }}>{new Date(a.datum).toLocaleDateString('nl-NL')}</span>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <WerkafspraakInlineEditor
                  afspraakId={a.id}
                  klantId={klus.klant_id}
                  klusId={klusId}
                  initialItems={Array.isArray(a.afspraken) ? a.afspraken : []}
                  titel={a.titel ?? ''}
                  datum={String(a.datum).slice(0, 10)}
                />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <Link href={`/offertes/nieuw?klus=${klusId}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', minWidth: 120 }}>
                <span className="nav-ico" style={{ fontSize: 15 }}>description</span>
                Offerte
              </Link>
              <Link href={`/facturen/nieuw?klus=${klusId}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', minWidth: 120 }}>
                <span className="nav-ico" style={{ fontSize: 15 }}>receipt</span>
                Factuur
              </Link>
              <Link href={`/afspraken/nieuw?klus=${klusId}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', minWidth: 120 }}>
                <span className="nav-ico" style={{ fontSize: 15 }}>handshake</span>
                Werkafspraken
              </Link>
            </div>
          </div>

          {/* Punten voor klant portaal */}
          {offertesRows.length > 0 && (
            <PuntenEditor
              offerteId={offertesRows[0].id}
              initialPunten={Array.isArray(offertesRows[0].wa_items) ? offertesRows[0].wa_items : []}
            />
          )}

          {/* Andere klussen van klant */}
          {siblingRows.length > 0 && (
            <div className="card">
              <div className="section-label">Andere klussen van {klus.klant_naam}</div>
              {siblingRows.map((s: any) => (
                <Link key={s.id} href={`/klussen/${s.id}`} style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '.84rem', color: '#0d1b3e' }}>{s.type_werk || `Klus #${s.id}`}</span>
                  <StatusBadge status={s.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Rechts: acties */}
        <KlusActions
          klus={klus}
          statuses={STATUSES}
          statusLabels={STATUS_LABELS}
          klusId={klusId}
        />
      </div>
    </div>
  )
}
