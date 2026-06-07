import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const factuurId = parseInt(id)

  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres
    FROM facturen f
    JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${factuurId}
  `
  const f = rows[0]
  if (!f) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  let regels: any[] = []
  if (Array.isArray(f.regels)) regels = f.regels
  else if (typeof f.regels === 'string') { try { regels = JSON.parse(f.regels) } catch {} }

  const btwPct = Number(f.btw_pct ?? 21)
  const totalen = berekenTotalen(regels, 0, btwPct)

  const vervalDatum = new Date(f.factuurdatum)
  vervalDatum.setDate(vervalDatum.getDate() + (Number(f.betalingstermijn) || 14))
  const teLaat = f.status !== 'betaald' && vervalDatum < new Date()

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Factuur ${f.factuurnummer}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy: #1d2f4c; --navy2: #162440; --blue: #4c7191;
    --slate: #374151; --light: #f0f4f8; --muted: #64748b;
    --border: #d0dce8; --green: #15803d; --red: #dc2626;
  }
  body {
    font-family: 'Poppins', -apple-system, sans-serif;
    color: var(--navy); background: #fff;
    font-size: 13px; line-height: 1.6;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; }

  .header { background: var(--navy); color: #fff; padding: 0; display: grid; grid-template-columns: 1fr auto; }
  .header-left { padding: 36px 44px 32px; }
  .header-right { background: var(--navy2); padding: 36px 44px 32px; text-align: right; display: flex; flex-direction: column; justify-content: space-between; min-width: 200px; }

  .logo-img { height: 52px; width: auto; object-fit: contain; display: block; margin-bottom: 20px; }
  .company-info { font-size: 11px; color: rgba(255,255,255,.5); line-height: 1.9; }
  .company-info strong { color: rgba(255,255,255,.8); font-weight: 600; }

  .doc-label { font-size: 10px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: 4px; }
  .doc-type { font-size: 28px; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -.5px; }
  .doc-nr { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.6); margin-top: 6px; letter-spacing: .5px; }
  .doc-status { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-top: 10px; align-self: flex-end; }
  .status-betaald { background: rgba(21,128,61,.25); color: #86efac; border: 1px solid rgba(21,128,61,.3); }
  .status-open    { background: rgba(255,255,255,.12); color: rgba(255,255,255,.85); border: 1px solid rgba(255,255,255,.18); }
  .status-laat    { background: rgba(220,38,38,.25); color: #fca5a5; border: 1px solid rgba(220,38,38,.3); }

  .stripe { height: 4px; background: var(--blue); }
  .body { padding: 40px 44px 44px; }

  .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 36px; }
  .info-card { background: var(--light); border-radius: 10px; padding: 20px 22px; }
  .info-card-label { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--blue); margin-bottom: 10px; }
  .info-card h3 { font-size: 15px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
  .info-card p { font-size: 12px; color: var(--muted); line-height: 1.9; }
  .meta-row { display: flex; font-size: 12px; margin-bottom: 4px; }
  .meta-k { color: var(--muted); min-width: 130px; }
  .meta-v { font-weight: 600; color: var(--navy); }
  .meta-v.laat { color: var(--red); }

  .sec-title { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--blue); margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
  .sec-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  table.items { width: 100%; border-collapse: collapse; }
  table.items thead tr { background: var(--navy); }
  table.items thead th { padding: 10px 14px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.65); }
  table.items thead th:not(:first-child) { text-align: right; }
  table.items tbody tr { border-bottom: 1px solid var(--border); }
  table.items tbody tr:last-child { border-bottom: 2px solid var(--border); }
  table.items tbody tr:nth-child(even) { background: #f8fafc; }
  table.items tbody td { padding: 11px 14px; vertical-align: top; }
  table.items tbody td:not(:first-child) { text-align: right; font-size: 12.5px; }
  .td-omschrijving { font-weight: 600; color: var(--navy); font-size: 13px; }
  .td-beschrijving { font-size: 11px; color: var(--muted); margin-top: 2px; }

  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 18px; }
  .totals-box { width: 290px; }
  .tot-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12.5px; border-bottom: 1px solid var(--border); }
  .tot-row:last-child { border-bottom: none; }
  .tot-row .l { color: var(--muted); }
  .tot-row .v { font-weight: 600; }
  .tot-final { background: var(--navy); border-radius: 10px; padding: 13px 18px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
  .tot-final .l { color: rgba(255,255,255,.65); font-size: 13px; font-weight: 600; }
  .tot-final .v { color: #fff; font-size: 22px; font-weight: 800; }

  .betaalbox { margin-top: 28px; background: var(--light); border-radius: 10px; padding: 20px 22px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--navy); }
  .betaal-left .bl { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--blue); margin-bottom: 6px; }
  .betaal-left .iban { font-size: 14px; font-weight: 700; color: var(--navy); }
  .betaal-left .iban-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .betaal-right .bl { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--blue); margin-bottom: 4px; text-align: right; }
  .betaal-amount { font-size: 24px; font-weight: 800; color: var(--navy); }

  .notities { margin-top: 24px; padding: 16px 20px; background: var(--light); border-left: 3px solid var(--blue); border-radius: 8px; }
  .notities-title { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--blue); margin-bottom: 6px; }
  .notities p { font-size: 12px; color: #374151; line-height: 1.75; white-space: pre-wrap; }

  .footer { background: var(--light); border-top: 1px solid var(--border); padding: 18px 44px; display: flex; justify-content: space-between; align-items: center; margin-top: 40px; }
  .footer p { font-size: 10.5px; color: var(--muted); }

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
  <span class="printbar-info">Betaalnota ${f.factuurnummer} — ${f.klant_naam}</span>
  <div class="printbar-btns">
    <button class="btn-p" onclick="window.print()">🖨 Afdrukken / PDF opslaan</button>
    <button class="btn-x" onclick="window.close()">✕</button>
  </div>
</div>

<div class="page">

  <div class="header">
    <div class="header-left">
      <img class="logo-img" src="https://portaal.ozvoltelektro.nl/logo-wit-site.png" alt="Ozvolt" onerror="this.style.display='none'">
      <div class="company-info">
        <strong>Ozvolt Elektrotechniek</strong><br>
        KVK 99837366 · BTW NL000000000B00<br>
        info@ozvoltelektro.nl · www.ozvoltelektro.nl<br>
        06 449 98 789
      </div>
    </div>
    <div class="header-right">
      <div>
        <div class="doc-label">Document</div>
        <div class="doc-type">Betaalnota</div>
        <div class="doc-nr">${f.factuurnummer}</div>
      </div>
      <div class="doc-status ${f.status === 'betaald' ? 'status-betaald' : teLaat ? 'status-laat' : 'status-open'}">
        ${f.status === 'betaald' ? '✓ Betaald' : teLaat ? '⚠ Vervallen' : 'Openstaand'}
      </div>
    </div>
  </div>
  <div class="stripe"></div>

  <div class="body">

    <div class="info-row">
      <div class="info-card">
        <div class="info-card-label">Factuur aan</div>
        <h3>${f.klant_naam}</h3>
        <p>
          ${f.klant_adres ? f.klant_adres.replace(/\n/g, '<br>') + '<br>' : ''}
          ${f.klant_email ? f.klant_email + '<br>' : ''}
          ${f.klant_telefoon ? f.klant_telefoon : ''}
        </p>
      </div>
      <div class="info-card">
        <div class="info-card-label">Factuurgegevens</div>
        <div class="meta-row"><span class="meta-k">Factuurnummer</span><span class="meta-v">${f.factuurnummer}</span></div>
        <div class="meta-row"><span class="meta-k">Factuurdatum</span><span class="meta-v">${new Date(f.factuurdatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div class="meta-row"><span class="meta-k">Vervaldatum</span><span class="meta-v${teLaat ? ' laat' : ''}">${vervalDatum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div class="meta-row"><span class="meta-k">Betalingstermijn</span><span class="meta-v">${f.betalingstermijn ?? 14} dagen</span></div>
      </div>
    </div>

    <div class="sec-title">Gefactureerde werkzaamheden</div>

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
            Sla de factuur op om de regels te zien in de PDF.
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
        <div class="tot-row"><span class="l">BTW ${btwPct}%</span><span class="v">${formatEuro(totalen.btw)}</span></div>
        <div class="tot-final"><span class="l">Te betalen incl. BTW</span><span class="v">${formatEuro(totalen.inclBtw)}</span></div>
      </div>
    </div>

    ${f.notities ? `
    <div class="notities">
      <div class="notities-title">Opmerkingen</div>
      <p>${f.notities}</p>
    </div>` : ''}

    <div class="betaalbox">
      <div class="betaal-left">
        <div class="bl">Betaalgegevens</div>
        <div class="iban">IBAN: NL69 KNAB 0780 9871 79</div>
        <div class="iban-sub">t.n.v. Ozvolt Elektrotechniek &nbsp;·&nbsp; Kenmerk: ${f.factuurnummer}</div>
      </div>
      <div class="betaal-right">
        <div class="bl">Te betalen</div>
        <div class="betaal-amount">${formatEuro(totalen.inclBtw)}</div>
      </div>
    </div>

  </div>

  <div class="footer">
    <p><strong style="color:var(--navy)">Ozvolt Elektrotechniek</strong> · KVK 99837366 · info@ozvoltelektro.nl · 06 449 98 789</p>
    <p>${f.factuurnummer}</p>
  </div>

</div>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
