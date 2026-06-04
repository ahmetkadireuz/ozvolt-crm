import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const rows = await sql`
    SELECT w.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres
    FROM werkafspraken w JOIN klanten k ON k.id = w.klant_id
    WHERE w.id = ${parseInt(id)}
  `
  const w = rows[0]
  if (!w) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  let afspraken: any[] = []
  if (Array.isArray(w.afspraken)) afspraken = w.afspraken
  else if (typeof w.afspraken === 'string') { try { afspraken = JSON.parse(w.afspraken) } catch {} }

  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const afspraakNr = `OZWA-${String(w.afspraaknummer).padStart(4, '0')}`
  const datum = new Date(w.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Werkafspraken ${afspraakNr}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --navy:#1d2f4c; --navy2:#162440; --blue:#4c7191; --light:#f0f4f8; --muted:#64748b; --border:#d0dce8; }
  body { font-family: 'Poppins', sans-serif; color: var(--navy); background: #fff; font-size: 13px; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; }
  .header { background: var(--navy); color: #fff; padding: 0; display: grid; grid-template-columns: 1fr auto; }
  .header-left { padding: 36px 44px 32px; }
  .header-right { background: var(--navy2); padding: 36px 44px 32px; text-align: right; display: flex; flex-direction: column; justify-content: space-between; min-width: 220px; }
  .logo-img { height: 52px; width: auto; object-fit: contain; display: block; margin-bottom: 20px; }
  .company-info { font-size: 11px; color: rgba(255,255,255,.5); line-height: 1.9; }
  .company-info strong { color: rgba(255,255,255,.8); font-weight: 600; }
  .doc-type { font-size: 24px; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -.5px; }
  .doc-nr { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.6); margin-top: 6px; letter-spacing: .5px; }
  .doc-status { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; background: rgba(255,255,255,.12); color: rgba(255,255,255,.85); border: 1px solid rgba(255,255,255,.18); margin-top: 10px; align-self: flex-end; }
  .stripe { height: 4px; background: var(--blue); }
  .body { padding: 40px 44px 44px; }
  .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 36px; }
  .info-card { background: var(--light); border-radius: 10px; padding: 20px 22px; }
  .info-card-label { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--blue); margin-bottom: 10px; }
  .info-card h3 { font-size: 15px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
  .info-card p { font-size: 12px; color: var(--muted); line-height: 1.9; }
  .meta-row { display: flex; font-size: 12px; padding: 2px 0; }
  .meta-k { color: var(--muted); min-width: 110px; }
  .meta-v { font-weight: 600; color: var(--navy); }
  .sec-title { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--blue); margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
  .sec-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .afspraken-list { list-style: none; margin-bottom: 28px; }
  .afspraken-list li { padding: 13px 16px; border-bottom: 1px solid var(--border); display: flex; gap: 14px; align-items: flex-start; }
  .afspraken-list li:last-child { border-bottom: 2px solid var(--border); }
  .afspraken-list li:nth-child(even) { background: #f8fafc; }
  .bullet { width: 22px; height: 22px; border-radius: 50%; background: var(--navy); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .afspraak-title { font-weight: 600; font-size: 13px; color: var(--navy); }
  .afspraak-sub { font-size: 11px; color: var(--muted); margin-top: 3px; line-height: 1.6; }
  .verantwoordelijkheid { display: inline-block; margin-top: 5px; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .ver-ozvolt { background: #dbeafe; color: #1d4ed8; }
  .ver-klant { background: #fef9c3; color: #92400e; }
  .akkoord { margin-top: 28px; border: 1.5px solid var(--border); border-radius: 10px; padding: 20px 22px; }
  .akkoord-title { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .akkoord p { font-size: 11.5px; color: var(--muted); line-height: 1.75; }
  .notities { margin-top: 20px; padding: 16px 20px; background: var(--light); border-left: 3px solid var(--blue); border-radius: 8px; }
  .notities-title { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--blue); margin-bottom: 6px; }
  .notities p { font-size: 12px; color: #374151; line-height: 1.75; white-space: pre-wrap; }
  .footer { background: var(--light); border-top: 1px solid var(--border); padding: 18px 44px; display: flex; justify-content: space-between; align-items: center; margin-top: 40px; }
  .footer p { font-size: 10.5px; color: var(--muted); }
  .printbar { position: fixed; top: 0; left: 0; right: 0; background: var(--navy); z-index: 999; padding: 10px 24px; display: flex; justify-content: space-between; align-items: center; }
  .btn-p { background: #374151; color: #fff; border: none; padding: 8px 20px; border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .btn-x { background: rgba(255,255,255,.1); color: #fff; border: none; padding: 8px 14px; border-radius: 7px; font-size: 13px; cursor: pointer; font-family: inherit; }
  body { padding-top: 52px; }
  @media print { .printbar { display: none !important; } body { padding-top: 0 !important; } .page { width: 100%; } }
</style>
</head>
<body>

<div class="printbar">
  <span style="color:rgba(255,255,255,.65);font-size:13px;">Werkafspraken ${afspraakNr} — ${w.klant_naam}</span>
  <div style="display:flex;gap:8px;">
    <button class="btn-p" onclick="window.print()">🖨 Afdrukken / PDF opslaan</button>
    <button class="btn-x" onclick="window.close()">✕</button>
  </div>
</div>

<div class="page">
  <div class="header">
    <div class="header-left">
      <img class="logo-img" src="https://portaal.ozvoltelektro.nl/logo-wit-site.png" alt="Ozvolt Elektrotechniek" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div style="display:none;font-size:22px;font-weight:900;color:#fff;margin-bottom:20px;">Ozvolt</div>
      <div class="company-info">
        <strong>Ozvolt Elektrotechniek</strong><br>
        KVK 99837366<br>
        IBAN: NL04 ABNA 0154 5811 43<br>
        financien@ozvoltelektro.nl
      </div>
    </div>
    <div class="header-right">
      <div>
        <div class="doc-type">Werkafspraken</div>
        <div class="doc-nr">${afspraakNr}</div>
      </div>
      <div class="doc-status">${w.status ?? 'concept'}</div>
    </div>
  </div>
  <div class="stripe"></div>

  <div class="body">
    <div class="info-row">
      <div class="info-card">
        <div class="info-card-label">Afspraken voor</div>
        <h3>${w.klant_naam}</h3>
        <p>
          ${w.klant_adres ? w.klant_adres.replace(/\n/g, '<br>') + '<br>' : ''}
          ${w.klant_email ? w.klant_email + '<br>' : ''}
          ${w.klant_telefoon ?? ''}
        </p>
      </div>
      <div class="info-card">
        <div class="info-card-label">Documentgegevens</div>
        <div class="meta-row"><span class="meta-k">Nummer</span><span class="meta-v">${afspraakNr}</span></div>
        <div class="meta-row"><span class="meta-k">Datum</span><span class="meta-v">${datum}</span></div>
        ${w.titel ? `<div class="meta-row"><span class="meta-k">Onderwerp</span><span class="meta-v">${w.titel}</span></div>` : ''}
      </div>
    </div>

    <div class="sec-title">Wat spreken wij met elkaar af</div>

    <ul class="afspraken-list">
      ${afspraken.length === 0
        ? `<li><span style="color:#94a3b8;font-style:italic;font-size:12px;">Sla de werkafspraken op om de items te zien in de PDF.</span></li>`
        : afspraken.map((a: any, i: number) => `
          <li>
            <div class="bullet">${i + 1}</div>
            <div>
              <div class="afspraak-title">${a.omschrijving || '—'}</div>
              ${a.toelichting ? `<div class="afspraak-sub">${a.toelichting}</div>` : ''}
              ${a.verantwoordelijke === 'klant'
                ? `<span class="verantwoordelijkheid ver-klant">Regelt u zelf</span>`
                : a.verantwoordelijke === 'ozvolt'
                ? `<span class="verantwoordelijkheid ver-ozvolt">Regelt Ozvolt</span>`
                : ''}
            </div>
          </li>
        `).join('')}
    </ul>

    ${w.notities ? `
    <div class="notities">
      <div class="notities-title">Aanvullende opmerkingen</div>
      <p>${w.notities}</p>
    </div>` : ''}

    ${w.accept_token ? `
    <div class="akkoord">
      <div class="akkoord-title">Digitaal akkoord gaan</div>
      <p>U kunt deze werkafspraken digitaal bevestigen via onderstaande link.</p>
      <div style="margin-top: 16px; background: #f0f4f8; border-radius: 10px; padding: 14px 18px;">
        <div style="font-size: 10px; font-weight: 700; color: #4c7191; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 6px;">Bevestigingslink</div>
        <a href="${siteUrl}/werkafspraak/${w.accept_token}" style="color: #1d2f4c; font-size: 12px; word-break: break-all;">${siteUrl}/werkafspraak/${w.accept_token}</a>
      </div>
      ${w.accepted_at ? `<div style="margin-top: 12px; color: #16a34a; font-size: 12px; font-weight: 600;">✓ Digitaal bevestigd door ${w.accepted_name ?? ''} op ${new Date(w.accepted_at).toLocaleString('nl-NL')}</div>` : ''}
    </div>` : `
    <div class="akkoord">
      <div class="akkoord-title">Akkoordverklaring</div>
      <p>Door ondertekening bevestigt u kennis te hebben genomen van en akkoord te gaan met bovenstaande werkafspraken.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:24px;">
        <div><div style="border-bottom:1.5px solid #b0bec5;padding-bottom:2px;"></div><div style="font-size:10px;color:#64748b;margin-top:4px;">Naam &amp; handtekening opdrachtgever</div></div>
        <div><div style="border-bottom:1.5px solid #b0bec5;padding-bottom:2px;"></div><div style="font-size:10px;color:#64748b;margin-top:4px;">Datum &amp; plaats</div></div>
      </div>
    </div>`}
  </div>

  <div class="footer">
    <p><strong style="color:var(--navy)">Ozvolt Elektrotechniek</strong> · KVK 99837366 · financien@ozvoltelektro.nl</p>
    <p>${afspraakNr}</p>
  </div>
</div>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
