import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const offerteId = parseInt(id)

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres, k.type AS klant_type
    FROM offertes o
    JOIN klanten k ON k.id = o.klant_id
    WHERE o.id = ${offerteId}
  `
  const o = rows[0]
  if (!o) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const regels = Array.isArray(o.regels) ? o.regels : []
  const totalen = berekenTotalen(regels, o.korting_pct, o.btw_pct)

  const offerteNr = `OZVT-${String(o.offertenummer).padStart(4, '0')}`
  const geldigheidLabel = o.geldig_tot
    ? new Date(o.geldig_tot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offerte ${offerteNr} — Ozvolt Elektrotechniek</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy: #0d1b3e;
    --navy2: #162244;
    --orange: #f97316;
    --orange2: #ea580c;
    --blue-light: #3b82f6;
    --bg: #f8fafc;
    --text: #1e293b;
    --muted: #64748b;
    --border: #e2e8f0;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--text);
    background: #fff;
    font-size: 13px;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #fff;
  }

  /* ── HEADER ── */
  .header {
    background: var(--navy);
    padding: 36px 48px 32px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: rgba(255,255,255,.03);
  }
  .header::after {
    content: '';
    position: absolute;
    bottom: -40px; left: 20%;
    width: 140px; height: 140px;
    border-radius: 50%;
    background: rgba(255,255,255,.025);
  }

  .logo-area { position: relative; z-index: 1; }
  .logo-icon {
    width: 48px; height: 48px;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
    font-size: 22px; font-weight: 900; color: #fff;
    letter-spacing: -1px;
  }
  .logo-name { font-size: 24px; font-weight: 900; color: #fff; letter-spacing: -.5px; line-height: 1; }
  .logo-sub  { font-size: 12px; color: rgba(255,255,255,.55); margin-top: 3px; letter-spacing: .5px; text-transform: uppercase; }
  .logo-info { margin-top: 20px; display: flex; flex-direction: column; gap: 2px; }
  .logo-info span { font-size: 11px; color: rgba(255,255,255,.5); }

  .doc-area { position: relative; z-index: 1; text-align: right; }
  .doc-type {
    font-size: 32px; font-weight: 900; color: #fff;
    letter-spacing: -1px; line-height: 1;
    text-transform: uppercase;
  }
  .doc-nr { font-size: 15px; font-weight: 600; color: rgba(249,115,22,.9); margin-top: 4px; letter-spacing: .5px; }
  .doc-status { margin-top: 12px; }
  .status-pill {
    display: inline-block; padding: 4px 14px;
    border-radius: 999px; font-size: 11px; font-weight: 700;
    letter-spacing: .05em; text-transform: uppercase;
  }
  .status-concept    { background: rgba(255,255,255,.12); color: rgba(255,255,255,.8); border: 1px solid rgba(255,255,255,.2); }
  .status-gestuurd   { background: rgba(59,130,246,.25); color: #93c5fd; border: 1px solid rgba(59,130,246,.3); }
  .status-geaccepteerd { background: rgba(34,197,94,.2); color: #86efac; border: 1px solid rgba(34,197,94,.25); }
  .status-verlopen   { background: rgba(239,68,68,.2); color: #fca5a5; border: 1px solid rgba(239,68,68,.25); }

  /* ── ACCENT STRIP ── */
  .accent-strip {
    height: 5px;
    background: linear-gradient(90deg, var(--orange) 0%, var(--orange2) 60%, #c2410c 100%);
  }

  /* ── BODY ── */
  .body { padding: 40px 48px 48px; }

  /* ── INFO GRID ── */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    margin-bottom: 36px;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }
  .info-block { padding: 22px 24px; }
  .info-block:first-child { border-right: 1px solid var(--border); }
  .info-label {
    font-size: 9px; font-weight: 800; letter-spacing: .15em;
    text-transform: uppercase; color: var(--orange);
    margin-bottom: 10px;
  }
  .info-block h3 { font-size: 15px; font-weight: 800; color: var(--navy); margin-bottom: 4px; }
  .info-block p  { font-size: 12.5px; color: var(--muted); line-height: 1.8; }

  .meta-row { display: flex; gap: 0; margin-bottom: 4px; }
  .meta-key { font-size: 12px; color: var(--muted); min-width: 120px; }
  .meta-val { font-size: 12px; font-weight: 600; color: var(--navy); }

  /* ── SECTION TITLE ── */
  .section-title {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 12px;
  }
  .section-title-text {
    font-size: 9px; font-weight: 800; letter-spacing: .15em;
    text-transform: uppercase; color: var(--muted);
  }
  .section-title-line { flex: 1; height: 1px; background: var(--border); }

  /* ── ITEMS TABLE ── */
  table.items { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; }
  table.items thead tr { background: var(--navy); }
  table.items thead th {
    padding: 11px 14px; text-align: left;
    font-size: 9px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: rgba(255,255,255,.7);
  }
  table.items thead th:not(:first-child) { text-align: right; }
  table.items tbody td {
    padding: 12px 14px;
    font-size: 12.5px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  table.items tbody td:not(:first-child) { text-align: right; }
  table.items tbody tr:last-child td { border-bottom: none; }
  table.items tbody tr:nth-child(even) { background: #fafbfc; }
  .item-desc { font-weight: 600; color: var(--navy); }
  .item-meta { font-size: 11px; color: var(--muted); margin-top: 1px; }

  /* ── TOTALS ── */
  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 20px; }
  .totals-box { width: 300px; }
  .totals-row {
    display: flex; justify-content: space-between;
    padding: 5px 0; font-size: 12.5px;
    border-bottom: 1px solid var(--border);
  }
  .totals-row:last-child { border-bottom: none; }
  .totals-row .lbl { color: var(--muted); }
  .totals-row .val { font-weight: 600; }
  .totals-row.korting .val { color: #16a34a; }
  .totals-final {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 18px; margin-top: 8px;
    background: var(--navy); border-radius: 10px;
  }
  .totals-final .lbl { font-size: 14px; font-weight: 700; color: rgba(255,255,255,.7); }
  .totals-final .val { font-size: 22px; font-weight: 900; color: #fff; }

  /* ── NOTES ── */
  .notes-box {
    margin-top: 28px; padding: 18px 20px;
    background: var(--bg); border-left: 3px solid var(--orange);
    border-radius: 8px;
  }
  .notes-box .notes-label { font-size: 9px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
  .notes-box p { font-size: 12px; color: var(--text); white-space: pre-wrap; line-height: 1.7; }

  /* ── AKKOORD ── */
  .akkoord-box {
    margin-top: 28px; padding: 22px 24px;
    border: 1.5px dashed var(--border); border-radius: 12px;
    background: #fafbfc;
  }
  .akkoord-box .akkoord-title { font-size: 9px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .akkoord-box p { font-size: 11.5px; color: var(--muted); line-height: 1.7; }
  .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px; }
  .sign-line { border-bottom: 1.5px solid #cbd5e1; padding-bottom: 2px; }
  .sign-label { font-size: 10px; color: var(--muted); margin-top: 5px; }

  /* ── FOOTER ── */
  .footer {
    margin-top: 40px; padding: 20px 48px;
    background: var(--bg); border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer p { font-size: 10.5px; color: var(--muted); }
  .footer .footer-bold { font-weight: 600; color: var(--navy); }

  /* ── PRINT BUTTON ── */
  .print-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: var(--navy); padding: 12px 24px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 2px 12px rgba(0,0,0,.2);
  }
  .print-bar span { color: rgba(255,255,255,.7); font-size: 13px; }
  .print-bar-btns { display: flex; gap: 8px; }
  .btn-print {
    background: var(--orange); color: #fff; border: none;
    padding: 9px 20px; border-radius: 8px;
    font-size: 13px; font-weight: 700; cursor: pointer;
    font-family: inherit; display: flex; align-items: center; gap: 6px;
  }
  .btn-close {
    background: rgba(255,255,255,.1); color: #fff; border: none;
    padding: 9px 16px; border-radius: 8px;
    font-size: 13px; cursor: pointer; font-family: inherit;
  }

  @media print {
    .print-bar { display: none !important; }
    body { padding-top: 0 !important; }
    .page { width: 100%; }
  }

  body.has-bar { padding-top: 52px; }
</style>
</head>
<body class="has-bar">

<div class="print-bar no-print">
  <span>Offerte ${offerteNr} — ${o.klant_naam}</span>
  <div class="print-bar-btns">
    <button class="btn-print" onclick="window.print()">🖨 Afdrukken / PDF opslaan</button>
    <button class="btn-close" onclick="window.close()">✕ Sluiten</button>
  </div>
</div>

<div class="page">

  <!-- HEADER -->
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
      <div class="doc-type">Offerte</div>
      <div class="doc-nr">${offerteNr}</div>
      <div class="doc-status">
        <span class="status-pill status-${o.status}">${
          o.status === 'geaccepteerd' ? '✓ Geaccepteerd' :
          o.status === 'gestuurd' ? 'Verstuurd' :
          o.status === 'verlopen' ? 'Verlopen' :
          o.status === 'geweigerd' ? 'Afgewezen' : 'Concept'
        }</span>
      </div>
    </div>
  </div>
  <div class="accent-strip"></div>

  <!-- BODY -->
  <div class="body">

    <!-- INFO GRID -->
    <div class="info-grid">
      <div class="info-block">
        <div class="info-label">Offerte voor</div>
        <h3>${o.klant_naam}</h3>
        <p>
          ${o.klant_adres ? o.klant_adres.replace(/\n/g, '<br>') + '<br>' : ''}
          ${o.klant_email ? o.klant_email + '<br>' : ''}
          ${o.klant_telefoon ? o.klant_telefoon : ''}
        </p>
      </div>
      <div class="info-block">
        <div class="info-label">Offertegegevens</div>
        <div class="meta-row"><span class="meta-key">Nummer</span><span class="meta-val">${offerteNr}</span></div>
        <div class="meta-row"><span class="meta-key">Datum</span><span class="meta-val">${new Date(o.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div class="meta-row"><span class="meta-key">Geldig tot</span><span class="meta-val">${geldigheidLabel}</span></div>
        <div class="meta-row"><span class="meta-key">BTW</span><span class="meta-val">${o.btw_pct}%</span></div>
      </div>
    </div>

    <!-- WERKZAAMHEDEN -->
    <div class="section-title">
      <span class="section-title-text">Werkzaamheden &amp; materialen</span>
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
          <td>${r.btw ?? o.btw_pct}%</td>
          <td>${formatEuro(Number(r.aantal) * Number(r.prijs))}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- TOTALEN -->
    <div class="totals-wrap">
      <div class="totals-box">
        <div class="totals-row">
          <span class="lbl">Subtotaal (ex. BTW)</span>
          <span class="val">${formatEuro(totalen.subtotaal)}</span>
        </div>
        ${Number(o.korting_pct) > 0 ? `
        <div class="totals-row korting">
          <span class="lbl">Korting ${o.korting_pct}%</span>
          <span class="val">− ${formatEuro(totalen.korting)}</span>
        </div>` : ''}
        <div class="totals-row">
          <span class="lbl">BTW ${o.btw_pct}%</span>
          <span class="val">${formatEuro(totalen.btw)}</span>
        </div>
        <div class="totals-final">
          <span class="lbl">Te betalen</span>
          <span class="val">${formatEuro(totalen.inclBtw)}</span>
        </div>
      </div>
    </div>

    ${o.notities ? `
    <!-- NOTITIES -->
    <div class="notes-box">
      <div class="notes-label">Opmerkingen</div>
      <p>${o.notities}</p>
    </div>` : ''}

    <!-- AKKOORDVERKLARING -->
    <div class="akkoord-box">
      <div class="akkoord-title">Akkoordverklaring</div>
      <p>Door ondertekening gaat u akkoord met de uitvoering van bovenstaande werkzaamheden door
      Ozvolt Elektrotechniek tegen de vermelde bedragen (incl. ${o.btw_pct}% BTW).
      Op al onze werkzaamheden zijn onze algemene voorwaarden van toepassing.</p>
      <div class="sign-grid">
        <div>
          <div class="sign-line"></div>
          <div class="sign-label">Naam &amp; handtekening opdrachtgever</div>
        </div>
        <div>
          <div class="sign-line"></div>
          <div class="sign-label">Datum &amp; plaats</div>
        </div>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p><span class="footer-bold">Ozvolt Elektrotechniek</span> &nbsp;·&nbsp; KVK 99837366 &nbsp;·&nbsp; info@ozvoltelektro.nl &nbsp;·&nbsp; www.ozvoltelektro.nl</p>
    <p style="color:#94a3b8">Offerte ${offerteNr}</p>
  </div>

</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
