import { sql } from '@/lib/db'
import { notFound } from 'next/navigation'
import AfspraakSignForm from './AfspraakSignForm'

export default async function WerkafspraakPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const rows = await sql`
    SELECT w.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres
    FROM werkafspraken w JOIN klanten k ON k.id = w.klant_id
    WHERE w.accept_token = ${token}
  `
  const w = rows[0]
  if (!w) notFound()

  let afspraken: any[] = []
  if (Array.isArray(w.afspraken)) afspraken = w.afspraken
  else if (typeof w.afspraken === 'string') { try { afspraken = JSON.parse(w.afspraken) } catch {} }

  const afspraakNr = `OZWA-${String(w.afspraaknummer).padStart(4, '0')}`
  const datum = new Date(w.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const isGeaccepteerd = !!w.accepted_at

  return (
    <html lang="nl">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Werkafspraken {afspraakNr} — Ozvolt Elektrotechniek</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Poppins', sans-serif; background: #f0f4f8; color: #1d2f4c; font-size: 14px; }
          .wrap { max-width: 740px; margin: 0 auto; padding: 24px 16px 60px; }
          .header { background: #1d2f4c; border-radius: 16px 16px 0 0; padding: 28px 36px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 22px; font-weight: 900; color: #fff; }
          .sub { font-size: 11px; color: rgba(255,255,255,.5); }
          .doc-nr { font-size: 18px; font-weight: 800; color: #fff; text-align: right; }
          .doc-lbl { font-size: 11px; color: rgba(255,255,255,.5); text-align: right; margin-bottom: 2px; }
          .stripe { height: 4px; background: #4c7191; }
          .body { background: #fff; padding: 32px 36px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
          .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
          .card { background: #f0f4f8; border-radius: 10px; padding: 18px 20px; }
          .card-lbl { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #4c7191; margin-bottom: 8px; }
          .card h3 { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
          .card p { font-size: 12px; color: #64748b; line-height: 1.9; }
          .meta-row { display: flex; font-size: 12px; padding: 3px 0; }
          .meta-k { color: #64748b; min-width: 110px; }
          .meta-v { font-weight: 600; }
          .sec-title { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #4c7191; margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
          .sec-title::after { content: ''; flex: 1; height: 1px; background: #d0dce8; }
          .afspraken-list { list-style: none; margin-bottom: 28px; border: 1px solid #d0dce8; border-radius: 10px; overflow: hidden; }
          .afspraken-list li { padding: 14px 16px; border-bottom: 1px solid #d0dce8; display: flex; gap: 14px; align-items: flex-start; }
          .afspraken-list li:last-child { border-bottom: none; }
          .afspraken-list li:nth-child(even) { background: #f8fafc; }
          .bullet { width: 24px; height: 24px; border-radius: 50%; background: #1d2f4c; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
          .at { font-weight: 600; font-size: 13px; }
          .as { font-size: 11px; color: #64748b; margin-top: 3px; line-height: 1.6; }
          .ver { display: inline-block; margin-top: 5px; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
          .ver-ozvolt { background: #dbeafe; color: #1d4ed8; }
          .ver-klant { background: #fef9c3; color: #92400e; }
          footer { margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8; }
          @media (max-width: 600px) { .info-row { grid-template-columns: 1fr; } .header { flex-direction: column; gap: 12px; } }
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
              <div className="doc-lbl">Werkafspraken</div>
              <div className="doc-nr">{afspraakNr}</div>
            </div>
          </div>
          <div className="stripe" />
          <div className="body">
            <div className="info-row">
              <div className="card">
                <div className="card-lbl">Afspraken voor</div>
                <h3>{w.klant_naam}</h3>
                <p>
                  {w.klant_adres && <>{w.klant_adres}<br /></>}
                  {w.klant_email && <>{w.klant_email}<br /></>}
                  {w.klant_telefoon}
                </p>
              </div>
              <div className="card">
                <div className="card-lbl">Documentgegevens</div>
                <div className="meta-row"><span className="meta-k">Nummer</span><span className="meta-v">{afspraakNr}</span></div>
                <div className="meta-row"><span className="meta-k">Datum</span><span className="meta-v">{datum}</span></div>
                {w.titel && <div className="meta-row"><span className="meta-k">Onderwerp</span><span className="meta-v">{w.titel}</span></div>}
              </div>
            </div>

            <div className="sec-title">Wat spreken wij met elkaar af</div>
            <ul className="afspraken-list">
              {afspraken.map((a: any, i: number) => (
                <li key={i}>
                  <div className="bullet">{i + 1}</div>
                  <div>
                    <div className="at">{a.omschrijving || '—'}</div>
                    {a.toelichting && <div className="as">{a.toelichting}</div>}
                    {a.verantwoordelijke === 'klant' && <span className="ver ver-klant">Regelt u zelf</span>}
                    {a.verantwoordelijke === 'ozvolt' && <span className="ver ver-ozvolt">Regelt Ozvolt</span>}
                  </div>
                </li>
              ))}
            </ul>

            {w.notities && (
              <div style={{ marginBottom: 28, padding: '16px 20px', background: '#f0f4f8', borderLeft: '3px solid #4c7191', borderRadius: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#4c7191', marginBottom: 6 }}>Aanvullende opmerkingen</div>
                <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{w.notities}</p>
              </div>
            )}

            <div className="sec-title">Bevestiging</div>
            <AfspraakSignForm
              token={token}
              isGeaccepteerd={isGeaccepteerd}
              acceptedName={w.accepted_name}
              acceptedAt={w.accepted_at ? new Date(w.accepted_at).toLocaleString('nl-NL') : null}
              klantEmail={w.klant_email ?? ''}
            />
          </div>
          <footer>Ozvolt Elektrotechniek · KVK 99837366 · financien@ozvoltelektro.nl</footer>
        </div>
      </body>
    </html>
  )
}
