import { sql } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/utils'
import { notFound } from 'next/navigation'
import SignForm from './SignForm'

const SITE = 'https://portaal.ozvoltelektro.nl'

export default async function OffertePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres,
           o.betaal_url, o.betaling_50_50, o.betaal_url_2
    FROM offertes o JOIN klanten k ON k.id = o.klant_id
    WHERE o.accept_token = ${token}
  `
  const o = rows[0]
  if (!o) notFound()

  let regels: any[] = []
  if (Array.isArray(o.regels)) regels = o.regels
  else if (typeof o.regels === 'string') { try { regels = JSON.parse(o.regels) } catch {} }

  const korting = Number(o.korting_pct ?? 0)
  const btwPct = Number(o.btw_pct ?? 21)
  const totalen = berekenTotalen(regels, korting, btwPct)
  const offerteNr = `OZVT-${String(o.offertenummer).padStart(4, '0')}`
  const datum = new Date(o.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const isGeaccepteerd = !!o.accepted_at

  return (
    <html lang="nl">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Offerte {offerteNr} — Ozvolt Elektrotechniek</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { min-height: 100%; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f4f6f9; color: #0f172a; font-size: 14px; -webkit-font-smoothing: antialiased; }

          .page { max-width: 760px; margin: 0 auto; padding: 32px 16px 80px; }

          /* Document card */
          .doc { background: #fff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 24px rgba(0,0,0,.06); overflow: hidden; }

          /* Header */
          .doc-header { background: #1d2f4c; padding: 36px 44px 32px; display: flex; justify-content: space-between; align-items: flex-start; }
          .doc-logo { height: 44px; width: auto; display: block; }
          .doc-meta { text-align: right; }
          .doc-type { font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: 6px; }
          .doc-nr { font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -.5px; }

          /* Body */
          .doc-body { padding: 40px 44px; }

          /* Info row */
          .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 36px; padding-bottom: 36px; border-bottom: 1px solid #e8edf3; }
          .info-block-label { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; }
          .info-block-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
          .info-block-line { font-size: 13px; color: #475569; line-height: 1.8; }
          .info-meta-row { display: flex; gap: 0; font-size: 13px; padding: 4px 0; }
          .info-meta-k { color: #94a3b8; min-width: 100px; }
          .info-meta-v { font-weight: 600; color: #0f172a; }

          /* Section title */
          .sec { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #94a3b8; margin-bottom: 12px; }

          /* Table */
          .tbl-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 0; border: 1px solid #e8edf3; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          thead tr { background: #f8fafc; border-bottom: 1px solid #e8edf3; }
          thead th { padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; white-space: nowrap; }
          thead th:not(:first-child) { text-align: right; }
          tbody tr { border-bottom: 1px solid #f1f5f9; }
          tbody tr:last-child { border-bottom: none; }
          tbody td { padding: 14px 16px; vertical-align: top; }
          tbody td:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
          .td-title { font-weight: 600; font-size: 14px; color: #0f172a; }
          .td-sub { font-size: 12px; color: #64748b; margin-top: 3px; line-height: 1.5; }

          /* Totals */
          .totals { display: flex; justify-content: flex-end; margin-top: 20px; margin-bottom: 36px; }
          .totals-box { width: 300px; }
          .tot-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
          .tot-row:last-child { border-bottom: none; }
          .tot-l { color: #64748b; }
          .tot-v { font-weight: 600; font-variant-numeric: tabular-nums; }
          .tot-final { background: #1d2f4c; border-radius: 4px; padding: 14px 18px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
          .tot-final .l { color: rgba(255,255,255,.65); font-size: 13px; font-weight: 500; }
          .tot-final .v { color: #fff; font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -.5px; }

          /* Notities */
          .notities { margin-bottom: 36px; padding: 16px 20px; background: #f8fafc; border-left: 3px solid #1d2f4c; border-radius: 0 4px 4px 0; }
          .nt-lbl { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; }
          .nt-p { font-size: 13px; color: #374151; line-height: 1.75; white-space: pre-wrap; }

          /* Betalen */
          .pay-section { margin-bottom: 32px; }
          .pay-btn { display: inline-flex; align-items: center; gap: 8px; background: #16a34a; color: #fff; border-radius: 4px; padding: 14px 28px; text-decoration: none; font-weight: 700; font-size: 15px; }
          .pay-btn-secondary { background: #1d2f4c; }
          .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

          /* Akkoord */
          .sign-section { border: 1.5px solid #e8edf3; border-radius: 4px; padding: 28px 32px; }
          .success-section { background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 4px; padding: 28px 32px; }

          /* Footer */
          .doc-footer { background: #f8fafc; border-top: 1px solid #e8edf3; padding: 24px 44px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
          .footer-brand { font-size: 13px; font-weight: 700; color: #0f172a; }
          .footer-details { font-size: 12px; color: #94a3b8; line-height: 1.8; text-align: right; }

          @media (max-width: 600px) {
            .doc-header { flex-direction: column; gap: 16px; padding: 24px 20px 20px; }
            .doc-meta { text-align: left; }
            .doc-body { padding: 24px 20px; }
            .info-row { grid-template-columns: 1fr; gap: 16px; }
            .totals { justify-content: flex-start; }
            .totals-box { width: 100%; }
            .pay-grid { grid-template-columns: 1fr; }
            .doc-footer { flex-direction: column; align-items: flex-start; padding: 20px; }
            .footer-details { text-align: left; }
            .sign-section, .success-section { padding: 20px 16px; }
          }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="doc">

            {/* Header */}
            <div className="doc-header">
              <img src={`${SITE}/logo-wit.png`} alt="Ozvolt Elektrotechniek" className="doc-logo" />
              <div className="doc-meta">
                <div className="doc-type">Offerte</div>
                <div className="doc-nr">{offerteNr}</div>
              </div>
            </div>

            {/* Body */}
            <div className="doc-body">

              {/* Klant + offerte info */}
              <div className="info-row">
                <div>
                  <div className="info-block-label">Offerte voor</div>
                  <div className="info-block-name">{o.klant_naam}</div>
                  <div className="info-block-line">
                    {o.klant_adres && <>{o.klant_adres}<br /></>}
                    {o.klant_email && <>{o.klant_email}<br /></>}
                    {o.klant_telefoon}
                  </div>
                </div>
                <div>
                  <div className="info-block-label">Offerte details</div>
                  <div className="info-meta-row"><span className="info-meta-k">Nummer</span><span className="info-meta-v">{offerteNr}</span></div>
                  <div className="info-meta-row"><span className="info-meta-k">Datum</span><span className="info-meta-v">{datum}</span></div>
                  {o.geldig_tot && (
                    <div className="info-meta-row">
                      <span className="info-meta-k">Geldig tot</span>
                      <span className="info-meta-v">{new Date(o.geldig_tot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  )}
                  <div className="info-meta-row"><span className="info-meta-k">BTW</span><span className="info-meta-v">{btwPct}%</span></div>
                </div>
              </div>

              {/* Regels */}
              <div className="sec">Werkzaamheden &amp; materialen</div>
              <div className="tbl-wrap" style={{ marginBottom: 20 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '52%' }}>Omschrijving</th>
                      <th style={{ width: '10%' }}>Aantal</th>
                      <th style={{ width: '16%' }}>Stukprijs</th>
                      <th style={{ width: '16%' }}>Totaal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regels.map((r: any, i: number) => (
                      <tr key={i}>
                        <td>
                          <div className="td-title">{r.omschrijving || '—'}</div>
                          {r.beschrijving && <div className="td-sub">{r.beschrijving}</div>}
                        </td>
                        <td>{Number(r.aantal).toLocaleString('nl-NL', { maximumFractionDigits: 2 })}</td>
                        <td>{formatEuro(Number(r.prijs))}</td>
                        <td style={{ fontWeight: 700 }}>{formatEuro(Number(r.aantal) * Number(r.prijs))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totalen */}
              <div className="totals">
                <div className="totals-box">
                  <div className="tot-row"><span className="tot-l">Subtotaal (ex. BTW)</span><span className="tot-v">{formatEuro(totalen.subtotaal)}</span></div>
                  {totalen.korting > 0 && (
                    <div className="tot-row" style={{ color: '#16a34a' }}>
                      <span className="tot-l" style={{ color: '#16a34a' }}>Korting</span>
                      <span className="tot-v">− {formatEuro(totalen.korting)}</span>
                    </div>
                  )}
                  <div className="tot-row"><span className="tot-l">BTW {btwPct}%</span><span className="tot-v">{formatEuro(totalen.btw)}</span></div>
                  <div className="tot-final">
                    <span className="l">Te betalen incl. BTW</span>
                    <span className="v">{formatEuro(totalen.inclBtw)}</span>
                  </div>
                </div>
              </div>

              {/* Notities */}
              {o.notities && (
                <div className="notities" style={{ marginBottom: 32 }}>
                  <div className="nt-lbl">Opmerkingen</div>
                  <p className="nt-p">{o.notities}</p>
                </div>
              )}

              {/* Betaalknop (alleen als er een betaallink is en nog niet betaald) */}
              {(o.betaal_url || o.betaling_50_50) && isGeaccepteerd && (
                <div className="pay-section">
                  <div className="sec" style={{ marginBottom: 16 }}>Online betalen</div>
                  {o.betaling_50_50 ? (
                    <div className="pay-grid">
                      <a href={o.betaal_url ?? '#'} className="pay-btn pay-btn-secondary" style={{ justifyContent: 'center', flexDirection: 'column', textAlign: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, opacity: .7 }}>Eerste termijn (50%)</span>
                        <span>{formatEuro(totalen.inclBtw / 2)}</span>
                      </a>
                      <a href={o.betaal_url_2 ?? '#'} className="pay-btn" style={{ background: '#475569', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, opacity: .7 }}>Tweede termijn (50%)</span>
                        <span>{formatEuro(totalen.inclBtw / 2)}</span>
                      </a>
                    </div>
                  ) : (
                    <a href={o.betaal_url} className="pay-btn">
                      Betalen — {formatEuro(totalen.inclBtw)} →
                    </a>
                  )}
                </div>
              )}

              {/* Akkoord sectie */}
              <div className="sec" style={{ marginBottom: 16 }}>Akkoord &amp; ondertekening</div>
              <div className={isGeaccepteerd ? 'success-section' : 'sign-section'}>
                <SignForm
                  token={token}
                  isGeaccepteerd={isGeaccepteerd}
                  acceptedName={o.accepted_name}
                  acceptedAt={o.accepted_at ? new Date(o.accepted_at).toLocaleString('nl-NL') : null}
                  klantEmail={o.klant_email ?? ''}
                  totaal={formatEuro(totalen.inclBtw)}
                  btwPct={btwPct}
                  betaalUrl={o.betaal_url ?? null}
                  betaling50_50={!!o.betaling_50_50}
                  betaalUrl2={o.betaal_url_2 ?? null}
                  eersteTermijn={formatEuro(totalen.inclBtw / 2)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="doc-footer">
              <div>
                <div className="footer-brand">Ozvolt Elektrotechniek</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>KVK 99837366 · BTW NL005413208B33</div>
              </div>
              <div className="footer-details">
                financien@ozvoltelektro.nl<br />
                06 449 98 789 · ozvoltelektro.nl
              </div>
            </div>

          </div>
        </div>
      </body>
    </html>
  )
}
