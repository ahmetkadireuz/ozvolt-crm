import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const factuurId = parseInt(id)

  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres, k.type AS klant_type
    FROM facturen f
    JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${factuurId}
  `
  const f = rows[0]
  if (!f) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const regels = Array.isArray(f.regels) ? f.regels : []
  const totalen = berekenTotalen(regels, 0, f.btw_pct)

  const vervalDatum = new Date(f.factuurdatum)
  vervalDatum.setDate(vervalDatum.getDate() + (f.betalingstermijn ?? 14))
  const teLaat = f.status !== 'betaald' && vervalDatum < new Date()

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Factuur ${f.factuurnummer} — Ozvolt Elektrotechniek</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy: #0d1b3e;
    --orange: #f97316;
    --orange2: #ea580c;
    --bg: #f8fafc;
    --text: #1e293b;
    --muted: #64748b;
    --border: #e2e8f0;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--text); background: #fff;
    font-size: 13px; line-height: 1.6;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; }

  .header {
    background: var(--navy); padding: 36px 48px 32px;
    display: flex; justify-content: space-between; align-items: flex-start;
    position: relative; overflow: hidden;
  }
  .header::before { content:''; position:absolute; top:-60px; right:-60px; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,.03); }
  .header::after  { content:''; position:absolute; bottom:-40px; left:20%; width:140px; height:140px; border-radius:50%; background:rgba(255,255,255,.025); }

  .logo-area { position: relative; z-index: 1; }
  .logo-icon { width:48px; height:48px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:12px; font-size:22px; font-weight:900; color:#fff; letter-spacing:-1px; }
  .logo-name { font-size:24px; font-weight:900; color:#fff; letter-spacing:-.5px; line-height:1; }
  .logo-sub  { font-size:12px; color:rgba(255,255,255,.55); margin-top:3px; letter-spacing:.5px; text-transform:uppercase; }
  .logo-info { margin-top:20px; display:flex; flex-direction:column; gap:2px; }
  .logo-info span { font-size:11px; color:rgba(255,255,255,.5); }

  .doc-area { position:relative; z-index:1; text-align:right; }
  .doc-type { font-size:32px; font-weight:900; color:#fff; letter-spacing:-1px; line-height:1; text-transform:uppercase; }
  .doc-nr { font-size:15px; font-weight:600; color:rgba(249,115,22,.9); margin-top:4px; letter-spacing:.5px; }
  .doc-status { margin-top:12px; }
  .status-pill { display:inline-block; padding:4px 14px; border-radius:999px; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; }
  .status-concept  { background:rgba(255,255,255,.12); color:rgba(255,255,255,.8); border:1px solid rgba(255,255,255,.2); }
  .status-verstuurd{ background:rgba(59,130,246,.25); color:#93c5fd; border:1px solid rgba(59,130,246,.3); }
  .status-betaald  { background:rgba(34,197,94,.2); color:#86efac; border:1px solid rgba(34,197,94,.25); }
  .status-te_laat  { background:rgba(239,68,68,.25); color:#fca5a5; border:1px solid rgba(239,68,68,.3); }

  .accent-strip { height:5px; background:linear-gradient(90deg,var(--orange) 0%,var(--orange2) 60%,#c2410c 100%); }

  .body { padding:40px 48px 48px; }

  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; margin-bottom:36px; border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  .info-block { padding:22px 24px; }
  .info-block:first-child { border-right:1px solid var(--border); }
  .info-label { font-size:9px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; color:var(--orange); margin-bottom:10px; }
  .info-block h3 { font-size:15px; font-weight:800; color:var(--navy); margin-bottom:4px; }
  .info-block p  { font-size:12.5px; color:var(--muted); line-height:1.8; }
  .meta-row { display:flex; gap:0; margin-bottom:4px; }
  .meta-key { font-size:12px; color:var(--muted); min-width:130px; }
  .meta-val { font-size:12px; font-weight:600; color:var(--navy); }
  .meta-val.red { color:#dc2626; }

  .section-title { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
  .section-title-text { font-size:9px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; color:var(--muted); }
  .section-title-line { flex:1; height:1px; background:var(--border); }

  table.items { width:100%; border-collapse:collapse; border-radius:10px; overflow:hidden; }
  table.items thead tr { background:var(--navy); }
  table.items thead th { padding:11px 14px; text-align:left; font-size:9px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.7); }
  table.items thead th:not(:first-child) { text-align:right; }
  table.items tbody td { padding:12px 14px; font-size:12.5px; border-bottom:1px solid var(--border); }
  table.items tbody td:not(:first-child) { text-align:right; }
  table.items tbody tr:last-child td { border-bottom:none; }
  table.items tbody tr:nth-child(even) { background:#fafbfc; }
  .item-desc { font-weight:600; color:var(--navy); }

  .totals-wrap { display:flex; justify-content:flex-end; margin-top:20px; }
  .totals-box { width:300px; }
  .totals-row { display:flex; justify-content:space-between; padding:5px 0; font-size:12.5px; border-bottom:1px solid var(--border); }
  .totals-row:last-child { border-bottom:none; }
  .totals-row .lbl { color:var(--muted); }
  .totals-row .val { font-weight:600; }
  .totals-final { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; margin-top:8px; background:var(--navy); border-radius:10px; }
  .totals-final .lbl { font-size:14px; font-weight:700; color:rgba(255,255,255,.7); }
  .totals-final .val { font-size:22px; font-weight:900; color:#fff; }

  .betaal-box { margin-top:28px; background:var(--navy); border-radius:12px; padding:22px 24px; display:flex; justify-content:space-between; align-items:center; }
  .betaal-left .betaal-label { font-size:9px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; color:rgba(255,255,255,.5); margin-bottom:6px; }
  .betaal-left .iban { font-size:14px; font-weight:700; color:#fff; }
  .betaal-left .iban-sub { font-size:11px; color:rgba(255,255,255,.5); margin-top:2px; }
  .betaal-right .betaal-label { font-size:9px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; color:rgba(255,255,255,.5); margin-bottom:4px; text-align:right; }
  .betaal-amount { font-size:26px; font-weight:900; color:#fff; }

  .notes-box { margin-top:24px; padding:16px 18px; background:var(--bg); border-left:3px solid var(--orange); border-radius:8px; }
  .notes-label { font-size:9px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
  .notes-box p { font-size:12px; color:var(--text); white-space:pre-wrap; line-height:1.7; }

  .footer { margin-top:40px; padding:20px 48px; background:var(--bg); border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
  .footer p { font-size:10.5px; color:var(--muted); }
  .footer .footer-bold { font-weight:600; color:var(--navy); }

  .print-bar { position:fixed; top:0; left:0; right:0; z-index:999; background:var(--navy); padding:12px 24px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(0,0,0,.2); }
  .print-bar span { color:rgba(255,255,255,.7); font-size:13px; }
  .print-bar-btns { display:flex; gap:8px; }
  .btn-print { background:var(--orange); color:#fff; border:none; padding:9px 20px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
  .btn-close  { background:rgba(255,255,255,.1); color:#fff; border:none; padding:9px 16px; border-radius:8px; font-size:13px; cursor:pointer; font-family:inherit; }

  @media print {
    .print-bar { display:none !important; }
    body { padding-top:0 !important; }
    .page { width:100%; }
  }
  body.has-bar { padding-top:52px; }
</style>
</head>
<body class="has-bar">

<div class="print-bar">
  <span>Factuur ${f.factuurnummer} — ${f.klant_naam}</span>
  <div class="print-bar-btns">
    <button class="btn-print" onclick="window.print()">🖨 Afdrukken / PDF opslaan</button>
    <button class="btn-close" onclick="window.close()">✕ Sluiten</button>
  </div>
</div>

<div class="page">

  <div class="header">
    <div class="logo-area">
      <div class="logo-icon">OZ</div>
      <div class="logo-name">Ozvolt</div>
      <div class="logo-sub">Elektrotechniek</div>
      <div class="logo-info">
        <span>KVK 99837366</span>
        <span>BTW NL000000000B00</span>
        <span>info@ozvoltelektro.nl</span>
        <span>www.ozvoltelektro.nl</span>
      </div>
    </div>
    <div class="doc-area">
      <div class="doc-type">Factuur</div>
      <div class="doc-nr">${f.factuurnummer}</div>
      <div class="doc-status">
        <span class="status-pill status-${teLaat ? 'te_laat' : f.status}">${
          f.status === 'betaald' ? '✓ Betaald' :
          teLaat ? '⚠ Vervallen' :
          f.status === 'verstuurd' ? 'Openstaand' : 'Concept'
        }</span>
      </div>
    </div>
  </div>
  <div class="accent-strip"></div>

  <div class="body">

    <div class="info-grid">
      <div class="info-block">
        <div class="info-label">Factuur aan</div>
        <h3>${f.klant_naam}</h3>
        <p>
          ${f.klant_adres ? f.klant_adres.replace(/\n/g, '<br>') + '<br>' : ''}
          ${f.klant_email ? f.klant_email + '<br>' : ''}
          ${f.klant_telefoon ? f.klant_telefoon : ''}
        </p>
      </div>
      <div class="info-block">
        <div class="info-label">Factuurgegevens</div>
        <div class="meta-row"><span class="meta-key">Factuurnummer</span><span class="meta-val">${f.factuurnummer}</span></div>
        <div class="meta-row"><span class="meta-key">Factuurdatum</span><span class="meta-val">${new Date(f.factuurdatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div class="meta-row"><span class="meta-key">Vervaldatum</span><span class="meta-val${teLaat ? ' red' : ''}">${vervalDatum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div class="meta-row"><span class="meta-key">Betalingstermijn</span><span class="meta-val">${f.betalingstermijn ?? 14} dagen</span></div>
      </div>
    </div>

    <div class="section-title">
      <span class="section-title-text">Gefactureerde werkzaamheden</span>
      <div class="section-title-line"></div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:48%">Omschrijving</th>
          <th style="width:10%">Aantal</th>
          <th style="width:14%">Stukprijs</th>
          <th style="width:8%">BTW</th>
          <th style="width:14%">Totaal</th>
        </tr>
      </thead>
      <tbody>
        ${regels.length === 0 ? `
        <tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;font-style:italic;">Geen regels</td></tr>
        ` : regels.map((r: any) => `
        <tr>
          <td><div class="item-desc">${r.omschrijving}</div></td>
          <td>${Number(r.aantal).toLocaleString('nl-NL')}</td>
          <td>${formatEuro(Number(r.prijs))}</td>
          <td>${r.btw ?? f.btw_pct}%</td>
          <td>${formatEuro(Number(r.aantal) * Number(r.prijs))}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <div class="totals-row">
          <span class="lbl">Subtotaal (ex. BTW)</span>
          <span class="val">${formatEuro(totalen.subtotaal)}</span>
        </div>
        <div class="totals-row">
          <span class="lbl">BTW ${f.btw_pct}%</span>
          <span class="val">${formatEuro(totalen.btw)}</span>
        </div>
        <div class="totals-final">
          <span class="lbl">Te betalen</span>
          <span class="val">${formatEuro(totalen.inclBtw)}</span>
        </div>
      </div>
    </div>

    ${f.notities ? `
    <div class="notes-box">
      <div class="notes-label">Opmerkingen</div>
      <p>${f.notities}</p>
    </div>` : ''}

    <div class="betaal-box">
      <div class="betaal-left">
        <div class="betaal-label">Betaalgegevens</div>
        <div class="iban">IBAN: NL00 BANK 0000 0000 00</div>
        <div class="iban-sub">t.n.v. Ozvolt Elektrotechniek &nbsp;·&nbsp; Vermeld: ${f.factuurnummer}</div>
      </div>
      <div class="betaal-right">
        <div class="betaal-label">Totaalbedrag</div>
        <div class="betaal-amount">${formatEuro(totalen.inclBtw)}</div>
      </div>
    </div>

  </div>

  <div class="footer">
    <p><span class="footer-bold">Ozvolt Elektrotechniek</span> &nbsp;·&nbsp; KVK 99837366 &nbsp;·&nbsp; info@ozvoltelektro.nl &nbsp;·&nbsp; www.ozvoltelektro.nl</p>
    <p style="color:#94a3b8">Factuur ${f.factuurnummer}</p>
  </div>

</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
