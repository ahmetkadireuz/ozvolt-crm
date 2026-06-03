import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // PDF is publiek toegankelijk via directe link (voor klanten)

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

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Factuur ${f.factuurnummer}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 13px; line-height: 1.5; }

  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; }

  /* Header */
  .header { background: #0d1b3e; color: #fff; padding: 36px 44px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px; }
  .header-left p { color: #8ba8c4; font-size: 12px; }
  .header-right { text-align: right; }
  .header-right .doc-type { font-size: 22px; font-weight: 800; color: #fff; }
  .header-right .doc-number { font-size: 13px; color: #8ba8c4; margin-top: 4px; }

  /* Orange accent bar */
  .accent-bar { height: 4px; background: linear-gradient(90deg, #f97316 0%, #ea580c 100%); }

  /* Body */
  .body { padding: 40px 44px; }

  /* Two column info */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
  .info-block h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8ba8c4; margin-bottom: 10px; }
  .info-block p { color: #1a1a2e; font-size: 13px; line-height: 1.7; }
  .info-block strong { font-weight: 700; }

  /* Meta table */
  .meta-table { width: 100%; font-size: 12px; }
  .meta-table tr td:first-child { color: #8ba8c4; width: 130px; }
  .meta-table tr td:last-child { font-weight: 600; color: #0d1b3e; }
  .meta-table tr td { padding: 3px 0; }

  /* Items */
  .items-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8ba8c4; margin-bottom: 12px; }
  table.items { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  table.items thead th { background: #0d1b3e; color: #fff; padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
  table.items thead th:last-child { text-align: right; }
  table.items thead th:nth-child(2), table.items thead th:nth-child(3) { text-align: right; }
  table.items tbody td { padding: 11px 14px; border-bottom: 1px solid #f1f5f9; }
  table.items tbody td:nth-child(2), table.items tbody td:nth-child(3) { text-align: right; color: #5b7fa6; }
  table.items tbody td:last-child { text-align: right; font-weight: 600; }
  table.items tbody tr:last-child td { border-bottom: none; }
  table.items tbody tr:hover { background: #f8fafc; }

  /* Totals */
  .totals { margin-top: 24px; display: flex; justify-content: flex-end; }
  .totals-inner { width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
  .totals-row.subtotaal { color: #5b7fa6; }
  .totals-row.btw { color: #5b7fa6; }
  .totals-row.totaal { border-top: 2px solid #0d1b3e; margin-top: 6px; padding-top: 10px; font-size: 17px; font-weight: 900; color: #0d1b3e; }

  /* Notes */
  .notes { margin-top: 36px; padding: 20px; background: #f8fafc; border-left: 3px solid #0d1b3e; border-radius: 6px; }
  .notes h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8ba8c4; margin-bottom: 8px; }
  .notes p { color: #374151; font-size: 12px; line-height: 1.7; white-space: pre-wrap; }

  /* Footer */
  .footer { margin-top: 60px; padding: 24px 44px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .footer p { font-size: 11px; color: #8ba8c4; }
  .footer-iban { font-size: 12px; color: #0d1b3e; font-weight: 700; }

  /* Status badge */
  .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .status-betaald { background: #dcfce7; color: #15803d; }
  .status-verstuurd { background: #dbeafe; color: #1d4ed8; }
  .status-te_laat { background: #fee2e2; color: #991b1b; }
  .status-concept { background: #f1f5f9; color: #475569; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page { width: 100%; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Print knop -->
  <div class="no-print" style="position:fixed;top:16px;right:16px;z-index:99;display:flex;gap:8px;">
    <button onclick="window.print()" style="background:#0d1b3e;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
      🖨️ Afdrukken / Opslaan als PDF
    </button>
    <button onclick="window.close()" style="background:#f1f5f9;color:#374151;border:none;padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;">
      ✕
    </button>
  </div>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>Ozvolt</h1>
      <p>Elektrotechniek</p>
      <p style="margin-top:16px;color:#c8d8ea;font-size:11px;line-height:1.8;">
        KVK 99837366<br>
        BTW NL000000000B00<br>
        info@ozvoltelektro.nl<br>
        www.ozvoltelektro.nl
      </p>
    </div>
    <div class="header-right">
      <div class="doc-type">FACTUUR</div>
      <div class="doc-number">${f.factuurnummer}</div>
      <div style="margin-top:16px;">
        <span class="status status-${f.status}">${
          f.status === 'betaald' ? '✓ Betaald' :
          f.status === 'verstuurd' ? 'Verstuurd' :
          f.status === 'te_laat' ? '⚠ Te laat' : 'Concept'
        }</span>
      </div>
    </div>
  </div>
  <div class="accent-bar"></div>

  <!-- Body -->
  <div class="body">
    <div class="info-grid">
      <!-- Klant -->
      <div class="info-block">
        <h3>Factuur aan</h3>
        <p>
          <strong>${f.klant_naam}</strong><br>
          ${f.klant_adres ? f.klant_adres.replace(/\n/g, '<br>') : ''}
          ${f.klant_email ? `<br>${f.klant_email}` : ''}
          ${f.klant_telefoon ? `<br>${f.klant_telefoon}` : ''}
        </p>
      </div>

      <!-- Meta -->
      <div class="info-block">
        <h3>Factuurgegevens</h3>
        <table class="meta-table">
          <tr><td>Factuurdatum:</td><td>${new Date(f.factuurdatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
          <tr><td>Vervaldatum:</td><td style="color:${vervalDatum < new Date() && f.status !== 'betaald' ? '#dc2626' : 'inherit'}">${vervalDatum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
          <tr><td>Betalingstermijn:</td><td>${f.betalingstermijn ?? 14} dagen</td></tr>
          <tr><td>Factuurnummer:</td><td>${f.factuurnummer}</td></tr>
        </table>
      </div>
    </div>

    <!-- Regels -->
    <div class="items-title">Omschrijving</div>
    <table class="items">
      <thead>
        <tr>
          <th style="width:50%">Omschrijving</th>
          <th style="width:12%">Aantal</th>
          <th style="width:16%">Prijs</th>
          <th style="width:10%">BTW</th>
          <th style="width:12%">Totaal</th>
        </tr>
      </thead>
      <tbody>
        ${regels.map((r: any) => `
        <tr>
          <td>${r.omschrijving}</td>
          <td style="text-align:right">${Number(r.aantal).toLocaleString('nl-NL')}</td>
          <td style="text-align:right">${formatEuro(Number(r.prijs))}</td>
          <td style="text-align:right">${r.btw ?? f.btw_pct}%</td>
          <td style="text-align:right">${formatEuro(Number(r.aantal) * Number(r.prijs))}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totalen -->
    <div class="totals">
      <div class="totals-inner">
        <div class="totals-row subtotaal">
          <span>Subtotaal (ex. BTW)</span>
          <span>${formatEuro(totalen.subtotaal)}</span>
        </div>
        <div class="totals-row btw">
          <span>BTW ${f.btw_pct}%</span>
          <span>${formatEuro(totalen.btw)}</span>
        </div>
        <div class="totals-row totaal">
          <span>Totaal</span>
          <span>${formatEuro(totalen.inclBtw)}</span>
        </div>
      </div>
    </div>

    ${f.notities ? `
    <!-- Notities -->
    <div class="notes">
      <h3>Opmerkingen</h3>
      <p>${f.notities}</p>
    </div>
    ` : ''}

    <!-- Betaalinfo -->
    <div style="margin-top:40px;padding:20px 24px;background:#0d1b3e;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#8ba8c4;margin-bottom:6px;">Betaalgegevens</div>
        <div style="color:#fff;font-size:13px;font-weight:600;">IBAN: NL00 BANK 0000 0000 00</div>
        <div style="color:#8ba8c4;font-size:12px;margin-top:2px;">t.n.v. Ozvolt Elektrotechniek · Vermelding: ${f.factuurnummer}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#8ba8c4;margin-bottom:4px;">Te betalen</div>
        <div style="font-size:22px;font-weight:900;color:#fff;">${formatEuro(totalen.inclBtw)}</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Ozvolt Elektrotechniek · KVK 99837366 · info@ozvoltelektro.nl</p>
    <p>Pagina 1 van 1</p>
  </div>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
