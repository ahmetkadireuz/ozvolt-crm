export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import OfferteActions from './OfferteActions'
import OfferteForm from './OfferteForm'

export const metadata: Metadata = { title: 'Offerte' }

export default async function OfferteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ msg?: string }>
}) {
  const { id } = await params
  const { msg } = await searchParams
  const offerteId = parseInt(id)
  if (isNaN(offerteId)) notFound()

  const [offerteRows, klanten, factuurRows, afspraakRows] = await Promise.all([
    sql`SELECT o.*, kt.naam AS klant_naam, kt.email AS klant_email FROM offertes o JOIN klanten kt ON kt.id = o.klant_id WHERE o.id = ${offerteId}`,
    sql`SELECT id, naam, email FROM klanten ORDER BY naam`,
    sql`SELECT id, factuurnummer, status FROM facturen WHERE offerte_id = ${offerteId}`,
    sql`SELECT id, afspraaknummer, status, accept_token, sent_at FROM werkafspraken WHERE offerte_id = ${offerteId} ORDER BY aangemaakt_op DESC`.catch(() => []),
  ])

  // Kosten voor deze klant (alle kosten van de klant tonen, gefilterd op klus indien aanwezig)
  const kostenRows = offerteRows[0]?.klant_id
    ? await sql`SELECT k.*, kl.naam AS klant_naam, ks.type_werk AS klus_naam
                FROM kosten k
                LEFT JOIN klanten kl ON kl.id = k.klant_id
                LEFT JOIN klussen ks ON ks.id = k.klus_id
                WHERE k.klant_id = ${offerteRows[0].klant_id}
                ORDER BY k.datum DESC`
    : []

  const offerte = JSON.parse(JSON.stringify(offerteRows[0]))
  if (!offerte) notFound()

  const totalen = berekenTotalen(offerte.regels ?? [], offerte.korting_pct, offerte.btw_pct)
  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const acceptUrl = offerte.accept_token ? `${siteUrl}/api/offertes/${offerteId}/accepteren?token=${offerte.accept_token}` : null
  const klanten2 = JSON.parse(JSON.stringify(klanten))
  const facturen2 = JSON.parse(JSON.stringify(factuurRows))
  const kosten = JSON.parse(JSON.stringify(kostenRows))
  const afspraken2 = JSON.parse(JSON.stringify(Array.isArray(afspraakRows) ? afspraakRows : []))

  const totaalKosten = kosten.reduce((s: number, k: any) => s + Number(k.bedrag), 0)
  const marge = totalen.naTotaal - totaalKosten
  const margePct = totalen.naTotaal > 0 ? (marge / totalen.naTotaal) * 100 : 0

  const CAT_LABELS: Record<string, string> = {
    materiaal: 'Materiaal', transport: 'Transport', lead: 'Lead',
    software: 'Software', overig: 'Overig',
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/offertes" className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <div>
            <h1 className="page-title">Offerte OZVT-{String(offerte.offertenummer).padStart(4,'0')}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <StatusBadge status={offerte.status} />
              <span style={{ color: '#8ba8c4', fontSize: '.78rem' }}>{offerte.klant_naam}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}></div>
      </div>

      {msg && <div className="alert alert-ok">{decodeURIComponent(msg)}</div>}

      <div className="detail-grid">
        {/* Formulier */}
        <OfferteForm offerte={offerte} klanten={klanten2} offerteId={offerteId} />

        {/* Acties sidebar */}
        <OfferteActions
          offerte={offerte}
          offerteId={offerteId}
          totalen={totalen}
          acceptUrl={acceptUrl}
          facturen={facturen2}
          afspraken={afspraken2}
        />
      </div>

      {/* Kosten & marge sectie */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0d1b3e', margin: 0 }}>
            Kosten &amp; marge — {offerte.klant_naam}
          </h2>
          <Link href="/kosten" className="btn btn-ghost btn-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
            Alle kosten
          </Link>
        </div>

        {/* Marge samenvatting */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Offerte ex BTW', value: formatEuro(totalen.naTotaal), color: '#0d1b3e' },
            { label: 'Totaal kosten', value: formatEuro(totaalKosten), color: '#dc2626' },
            { label: 'Bruto marge', value: formatEuro(marge), color: marge >= 0 ? '#16a34a' : '#dc2626' },
            { label: 'Marge %', value: `${margePct.toFixed(1)}%`, color: margePct >= 30 ? '#16a34a' : margePct >= 15 ? '#f59e0b' : '#dc2626' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Kostentabel */}
        <div className="card" style={{ padding: 0 }}>
          {kosten.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#8ba8c4', fontSize: '.85rem' }}>
              Geen kosten geregistreerd voor deze klant.{' '}
              <Link href="/kosten" style={{ color: '#0d1b3e', fontWeight: 600 }}>Kosten toevoegen →</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Categorie</th>
                    <th>Omschrijving</th>
                    <th>Leverancier</th>
                    <th>Klus</th>
                    <th style={{ textAlign: 'right' }}>Bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {kosten.map((k: any) => (
                    <tr key={k.id}>
                      <td style={{ fontSize: '.82rem', color: '#8ba8c4' }}>
                        {new Date(k.datum).toLocaleDateString('nl-NL')}
                      </td>
                      <td>
                        <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#475569' }}>
                          {CAT_LABELS[k.categorie] ?? k.categorie}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{k.omschrijving}</td>
                      <td style={{ fontSize: '.82rem', color: '#8ba8c4' }}>{k.leverancier ?? '—'}</td>
                      <td style={{ fontSize: '.82rem', color: '#5b7fa6' }}>{k.klus_naam ?? '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                        {formatEuro(Number(k.bedrag))}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #0d1b3e' }}>
                    <td colSpan={5} style={{ fontWeight: 700, fontSize: '.84rem', padding: '10px 12px' }}>Totaal kosten</td>
                    <td style={{ textAlign: 'right', fontWeight: 900, color: '#dc2626', fontSize: '1rem' }}>
                      {formatEuro(totaalKosten)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
