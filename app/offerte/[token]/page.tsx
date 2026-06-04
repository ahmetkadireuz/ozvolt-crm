import { sql } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/utils'
import { notFound } from 'next/navigation'
import SignForm from './SignForm'

export default async function OffertePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres
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
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Poppins', sans-serif; background: #f0f4f8; color: #1d2f4c; font-size: 14px; }
          .wrap { max-width: 740px; margin: 0 auto; padding: 24px 16px 60px; }
          .header { background: #1d2f4c; border-radius: 16px 16px 0 0; padding: 28px 36px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 22px; font-weight: 900; color: #fff; }
          .sub { font-size: 11px; color: rgba(255,255,255,.5); }
          .doc-nr { font-size: 20px; font-weight: 800; color: #fff; text-align: right; }
          .doc-lbl { font-size: 11px; color: rgba(255,255,255,.5); text-align: right; margin-bottom: 2px; }
          .stripe { height: 4px; background: #4c7191; }
          .body { background: #fff; padding: 32px 36px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
          .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
          .card { background: #f0f4f8; border-radius: 10px; padding: 18px 20px; }
          .card-lbl { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #4c7191; margin-bottom: 8px; }
          .card h3 { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
          .card p { font-size: 12px; color: #64748b; line-height: 1.9; }
          .meta-row { display: flex; gap: 0; font-size: 12px; padding: 3px 0; }
          .meta-k { color: #64748b; min-width: 110px; }
          .meta-v { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          thead tr { background: #1d2f4c; }
          thead th { padding: 10px 14px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.65); }
          thead th:not(:first-child) { text-align: right; }
          tbody tr { border-bottom: 1px solid #d0dce8; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          tbody td { padding: 11px 14px; vertical-align: top; }
          tbody td:not(:first-child) { text-align: right; font-size: 12.5px; }
          .td-title { font-weight: 600; font-size: 13px; }
          .td-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
          .totals-box { width: 280px; }
          .tot-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12.5px; border-bottom: 1px solid #d0dce8; }
          .tot-row:last-child { border-bottom: none; }
          .tot-row .l { color: #64748b; }
          .tot-row .v { font-weight: 600; }
          .tot-final { background: #1d2f4c; border-radius: 10px; padding: 13px 18px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
          .tot-final .l { color: rgba(255,255,255,.65); font-size: 13px; font-weight: 600; }
          .tot-final .v { color: #fff; font-size: 22px; font-weight: 800; }
          .sec-title { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #4c7191; margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
          .sec-title::after { content: ''; flex: 1; height: 1px; background: #d0dce8; }
          .notities { margin-bottom: 28px; padding: 16px 20px; background: #f0f4f8; border-left: 3px solid #4c7191; border-radius: 8px; }
          .nt { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: #4c7191; margin-bottom: 6px; }
          .nt-p { font-size: 12px; color: #374151; line-height: 1.75; white-space: pre-wrap; }
          .akkoord-box { border: 2px solid #1d2f4c; border-radius: 12px; padding: 24px 28px; }
          .success-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 24px 28px; text-align: center; }
          .success-icon { font-size: 48px; margin-bottom: 8px; }
          .success-title { font-size: 20px; font-weight: 800; color: #15803d; margin-bottom: 8px; }
          .success-sub { font-size: 14px; color: #4a5568; }
          footer { margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8; }
          @media (max-width: 600px) {
            .info-row { grid-template-columns: 1fr; }
            .header { flex-direction: column; gap: 12px; }
            .doc-nr { text-align: left; }
            .doc-lbl { text-align: left; }
          }
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <div className="header">
            <div>
              <div className="logo">OZVOLT</div>
              <div className="sub">Elektrotechniek</div>
            </div>
            <div>
              <div className="doc-lbl">Offerte</div>
              <div className="doc-nr">{offerteNr}</div>
            </div>
          </div>
          <div className="stripe" />
          <div className="body">
            <div className="info-row">
              <div className="card">
                <div className="card-lbl">Offerte voor</div>
                <h3>{o.klant_naam}</h3>
                <p>
                  {o.klant_adres && <>{o.klant_adres}<br /></>}
                  {o.klant_email && <>{o.klant_email}<br /></>}
                  {o.klant_telefoon}
                </p>
              </div>
              <div className="card">
                <div className="card-lbl">Offertegegevens</div>
                <div className="meta-row"><span className="meta-k">Nummer</span><span className="meta-v">{offerteNr}</span></div>
                <div className="meta-row"><span className="meta-k">Datum</span><span className="meta-v">{datum}</span></div>
                {o.geldig_tot && (
                  <div className="meta-row">
                    <span className="meta-k">Geldig tot</span>
                    <span className="meta-v">{new Date(o.geldig_tot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="sec-title">Werkzaamheden &amp; materialen</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '55%' }}>Omschrijving</th>
                  <th style={{ width: '10%' }}>Aantal</th>
                  <th style={{ width: '15%' }}>Stukprijs</th>
                  <th style={{ width: '15%' }}>Totaal</th>
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

            <div className="totals">
              <div className="totals-box">
                <div className="tot-row"><span className="l">Subtotaal (ex. BTW)</span><span className="v">{formatEuro(totalen.subtotaal)}</span></div>
                {totalen.korting > 0 && <div className="tot-row" style={{ color: '#15803d' }}><span className="l">Korting</span><span className="v">− {formatEuro(totalen.korting)}</span></div>}
                <div className="tot-row"><span className="l">BTW {btwPct}%</span><span className="v">{formatEuro(totalen.btw)}</span></div>
                <div className="tot-final"><span className="l">Te betalen incl. BTW</span><span className="v">{formatEuro(totalen.inclBtw)}</span></div>
              </div>
            </div>

            {o.notities && (
              <div className="notities">
                <div className="nt">Opmerkingen</div>
                <p className="nt-p">{o.notities}</p>
              </div>
            )}

            <div className="sec-title">Akkoord &amp; ondertekening</div>
            <SignForm
              token={token}
              isGeaccepteerd={isGeaccepteerd}
              acceptedName={o.accepted_name}
              acceptedAt={o.accepted_at ? new Date(o.accepted_at).toLocaleString('nl-NL') : null}
              klantEmail={o.klant_email ?? ''}
              totaal={formatEuro(totalen.inclBtw)}
              btwPct={btwPct}
            />
          </div>
          <footer>Ozvolt Elektrotechniek · KVK 99837366 · financien@ozvoltelektro.nl</footer>
        </div>
      </body>
    </html>
  )
}
