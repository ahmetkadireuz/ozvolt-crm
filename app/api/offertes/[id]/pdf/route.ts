import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const offerteId = parseInt(id)

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres
    FROM offertes o
    JOIN klanten k ON k.id = o.klant_id
    WHERE o.id = ${offerteId}
  `
  const o = rows[0]
  if (!o) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  // Zorg dat regels altijd een array is
  let regels: any[] = []
  if (Array.isArray(o.regels)) regels = o.regels
  else if (typeof o.regels === 'string') { try { regels = JSON.parse(o.regels) } catch {} }

  const korting = Number(o.korting_pct ?? 0)
  const btwPct = Number(o.btw_pct ?? 21)
  const totalen = berekenTotalen(regels, korting, btwPct)

  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const offerteNr = `OZVT-${String(o.offertenummer).padStart(4, '0')}`
  const datum = new Date(o.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const geldigheidLabel = o.geldig_tot
    ? new Date(o.geldig_tot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : '30 dagen na offertedatum'

  const statusLabel: Record<string, string> = {
    concept: 'Concept', gestuurd: 'Verstuurd',
    geaccepteerd: '✓ Akkoord', verlopen: 'Verlopen', geweigerd: 'Afgewezen',
  }

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offerte ${offerteNr}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy:   #1d2f4c;
    --navy2:  #162440;
    --blue:   #4c7191;
    --slate:  #374151;
    --light:  #f0f4f8;
    --muted:  #64748b;
    --border: #d0dce8;
    --white:  #ffffff;
  }
  body {
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--navy); background: #fff;
    font-size: 13px; line-height: 1.6;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; }

  /* HEADER */
  .header {
    background: var(--navy); color: #fff;
    padding: 0;
    display: grid; grid-template-columns: 1fr auto;
  }
  .header-left { padding: 36px 44px 32px; }
  .header-right {
    background: var(--navy2);
    padding: 36px 44px 32px;
    text-align: right;
    display: flex; flex-direction: column; justify-content: space-between;
    min-width: 200px;
  }

  .logo-img { height: 52px; width: auto; object-fit: contain; display: block; margin-bottom: 20px; }
  .company-info { font-size: 11px; color: rgba(255,255,255,.5); line-height: 1.9; }
  .company-info strong { color: rgba(255,255,255,.8); font-weight: 600; }

  .doc-label { font-size: 10px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: 4px; }
  .doc-type { font-size: 28px; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -.5px; }
  .doc-nr { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.6); margin-top: 6px; letter-spacing: .5px; }
  .doc-status {
    display: inline-block; padding: 4px 12px; border-radius: 6px;
    font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    background: rgba(255,255,255,.12); color: rgba(255,255,255,.85);
    border: 1px solid rgba(255,255,255,.18); margin-top: 10px; align-self: flex-end;
  }

  /* BLAUWE STREEP */
  .stripe { height: 4px; background: var(--blue); }

  /* BODY */
  .body { padding: 40px 44px 44px; }

  /* INFO KAARTEN */
  .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 36px; }
  .info-card { background: var(--light); border-radius: 10px; padding: 20px 22px; }
  .info-card-label {
    font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
    color: var(--blue); margin-bottom: 10px;
  }
  .info-card h3 { font-size: 15px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
  .info-card p { font-size: 12px; color: var(--muted); line-height: 1.9; }
  .meta-list { display: flex; flex-direction: column; gap: 4px; }
  .meta-row { display: flex; gap: 0; font-size: 12px; }
  .meta-k { color: var(--muted); min-width: 110px; }
  .meta-v { font-weight: 600; color: var(--navy); }

  /* SECTIE TITEL */
  .sec-title {
    font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
    color: var(--blue); margin-bottom: 14px;
    display: flex; align-items: center; gap: 10px;
  }
  .sec-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  /* TABEL */
  table.items { width: 100%; border-collapse: collapse; }
  table.items thead tr { background: var(--navy); }
  table.items thead th {
    padding: 10px 14px; text-align: left;
    font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
    color: rgba(255,255,255,.65);
  }
  table.items thead th:not(:first-child) { text-align: right; }
  table.items tbody tr { border-bottom: 1px solid var(--border); }
  table.items tbody tr:last-child { border-bottom: 2px solid var(--border); }
  table.items tbody tr:nth-child(even) { background: #f8fafc; }
  table.items tbody td { padding: 11px 14px; vertical-align: top; }
  table.items tbody td:not(:first-child) { text-align: right; font-size: 12.5px; }
  .td-omschrijving { font-weight: 600; color: var(--navy); font-size: 13px; }
  .td-beschrijving { font-size: 11px; color: var(--muted); margin-top: 2px; font-weight: 400; }

  /* TOTALEN */
  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 18px; }
  .totals-box { width: 290px; }
  .tot-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12.5px; border-bottom: 1px solid var(--border); }
  .tot-row:last-child { border-bottom: none; }
  .tot-row .l { color: var(--muted); }
  .tot-row .v { font-weight: 600; }
  .tot-row.korting .v { color: #15803d; }
  .tot-final { background: var(--navy); border-radius: 10px; padding: 13px 18px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
  .tot-final .l { color: rgba(255,255,255,.65); font-size: 13px; font-weight: 600; }
  .tot-final .v { color: #fff; font-size: 22px; font-weight: 800; }

  /* NOTITIES */
  .notities { margin-top: 28px; padding: 16px 20px; background: var(--light); border-left: 3px solid var(--blue); border-radius: 8px; }
  .notities-title { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--blue); margin-bottom: 6px; }
  .notities p { font-size: 12px; color: #374151; line-height: 1.75; white-space: pre-wrap; }

  /* AKKOORD */
  .akkoord { margin-top: 28px; border: 1.5px dashed var(--border); border-radius: 10px; padding: 20px 22px; }
  .akkoord-title { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .akkoord p { font-size: 11.5px; color: var(--muted); line-height: 1.75; }
  .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px; }
  .sign-line { border-bottom: 1.5px solid #b0bec5; padding-bottom: 2px; }
  .sign-lbl { font-size: 10px; color: var(--muted); margin-top: 4px; }

  /* FOOTER */
  .footer { background: var(--light); border-top: 1px solid var(--border); padding: 18px 44px; display: flex; justify-content: space-between; align-items: center; margin-top: 40px; }
  .footer p { font-size: 10.5px; color: var(--muted); }

  /* PRINT BAR */
  .printbar { position: fixed; top: 0; left: 0; right: 0; background: var(--navy); z-index: 999; padding: 10px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 12px rgba(0,0,0,.25); }
  .printbar-info { color: rgba(255,255,255,.65); font-size: 13px; }
  .printbar-btns { display: flex; gap: 8px; }
  .btn-p { background: var(--slate); color: #fff; border: none; padding: 8px 20px; border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .btn-x { background: rgba(255,255,255,.1); color: #fff; border: none; padding: 8px 14px; border-radius: 7px; font-size: 13px; cursor: pointer; font-family: inherit; }

  @media print {
    .printbar { display: none !important; }
    body { padding-top: 0 !important; }
    .page { width: 100%; }
  }
  body { padding-top: 52px; }
</style>
</head>
<body>

<div class="printbar">
  <span class="printbar-info">Offerte ${offerteNr} — ${o.klant_naam}</span>
  <div class="printbar-btns">
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
        <div class="doc-type">Offerte</div>
      </div>
      <div class="doc-status">${statusLabel[o.status] ?? o.status}</div>
    </div>
  </div>
  <div class="stripe"></div>

  <div class="body">

    <div class="info-row">
      <div class="info-card">
        <div class="info-card-label">Offerte voor</div>
        <h3>${o.klant_naam}</h3>
        <p>
          ${o.klant_adres ? o.klant_adres.replace(/\n/g, '<br>') + '<br>' : ''}
          ${o.klant_email ? o.klant_email + '<br>' : ''}
          ${o.klant_telefoon ? o.klant_telefoon : ''}
        </p>
      </div>
      <div class="info-card">
        <div class="info-card-label">Offertegegevens</div>
        <div class="meta-list">
          <div class="meta-row"><span class="meta-k">Nummer</span><span class="meta-v">${offerteNr}</span></div>
          <div class="meta-row"><span class="meta-k">Datum</span><span class="meta-v">${datum}</span></div>
          <div class="meta-row"><span class="meta-k">Geldig tot</span><span class="meta-v">${geldigheidLabel}</span></div>
        </div>
      </div>
    </div>

    <div class="sec-title">Werkzaamheden &amp; materialen</div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:50%">Omschrijving</th>
          <th style="width:9%">Aantal</th>
          <th style="width:14%">Stukprijs</th>
          <th style="width:8%">BTW</th>
          <th style="width:14%">Totaal</th>
        </tr>
      </thead>
      <tbody>
        ${regels.length === 0 ? `
          <tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;font-style:italic;font-size:12px;">
            Sla de offerte op om de regels te zien in de PDF.
          </td></tr>
        ` : regels.map((r: any) => `
          <tr>
            <td>
              <div class="td-omschrijving">${r.omschrijving || '—'}</div>
              ${r.beschrijving ? `<div class="td-beschrijving">${r.beschrijving}</div>` : ''}
            </td>
            <td>${Number(r.aantal).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
            <td>${formatEuro(Number(r.prijs))}</td>
            <td>${r.btw ?? btwPct}%</td>
            <td style="font-weight:700;">${formatEuro(Number(r.aantal) * Number(r.prijs))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <div class="tot-row"><span class="l">Subtotaal (ex. BTW)</span><span class="v">${formatEuro(totalen.subtotaal)}</span></div>
        ${totalen.korting > 0 ? `<div class="tot-row korting"><span class="l">Korting</span><span class="v">− ${formatEuro(totalen.korting)}</span></div>` : ''}
        <div class="tot-row"><span class="l">BTW ${btwPct}%</span><span class="v">${formatEuro(totalen.btw)}</span></div>
        <div class="tot-final"><span class="l">Te betalen incl. BTW</span><span class="v">${formatEuro(totalen.inclBtw)}</span></div>
      </div>
    </div>

    ${o.notities ? `
    <div class="notities">
      <div class="notities-title">Opmerkingen</div>
      <p>${o.notities}</p>
    </div>` : ''}

    ${o.accepted_at ? `
    <div class="akkoord">
      <div class="akkoord-title">Akkoordverklaring</div>
      <div style="color: #16a34a; font-size: 12px; font-weight: 600;">✓ Digitaal geaccepteerd door ${o.accepted_name ?? ''} op ${new Date(o.accepted_at).toLocaleString('nl-NL')}</div>
    </div>` : ''}

  </div>

  <div class="footer">
    <p><strong style="color:var(--navy)">Ozvolt Elektrotechniek</strong> · KVK 99837366 · financien@ozvoltelektro.nl</p>
  </div>

</div>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
