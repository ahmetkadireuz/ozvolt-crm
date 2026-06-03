import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { form, groepen, klantNaam, klusNaam } = await req.json()

  const datum = new Date(form.installatiedatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

  const groepenHtml = groepen.map((g: any) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;font-weight:700">${g.nummer}</td>
      <td style="padding:8px 12px;border:1px solid #ddd">${g.naam || '—'}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:center">${g.ampere}A</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:center">${g.vermogen}V</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:center">${g.type}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Groepenverklaring — ${klantNaam ?? 'Klant'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; padding: 20mm; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #0d1b3e; }
    .header-left h1 { font-size: 20pt; color: #0d1b3e; margin-bottom: 4px; }
    .header-left p { color: #666; font-size: 9pt; }
    .bedrijf { text-align: right; font-size: 9pt; color: #555; }
    .bedrijf strong { color: #0d1b3e; font-size: 11pt; display: block; }
    .sectie { margin-bottom: 20px; }
    .sectie h2 { font-size: 11pt; color: #0d1b3e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
    .veld { margin-bottom: 6px; }
    .veld label { font-size: 8pt; color: #888; display: block; }
    .veld span { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    thead tr { background: #0d1b3e; color: #fff; }
    thead td { padding: 8px 12px; border: 1px solid #0d1b3e; font-weight: 700; }
    tbody tr:nth-child(even) { background: #f5f7fa; }
    .ondertekening { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .handtekening { border-top: 2px solid #111; padding-top: 8px; }
    .handtekening label { font-size: 9pt; color: #666; }
    .kader { border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; background: #f9f9f9; }
    @media print { body { padding: 10mm; } }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <h1>Groepenverklaring</h1>
      <p>Verklaring van elektrische installatie conform NEN 1010</p>
    </div>
    <div class="bedrijf">
      <strong>Ozvolt Elektrotechniek</strong>
      KVK: 99837366<br>
      BTW: NL005413208B33<br>
      Tel: 06 449 98 789<br>
      info@ozvoltelektro.nl
    </div>
  </div>

  <div class="sectie">
    <h2>Projectgegevens</h2>
    <div class="grid">
      <div class="veld"><label>Klant</label><span>${klantNaam ?? '—'}</span></div>
      <div class="veld"><label>Klus</label><span>${klusNaam ?? '—'}</span></div>
      <div class="veld"><label>Installatieadres</label><span>${form.adres || '—'}</span></div>
      <div class="veld"><label>Postcode & Plaats</label><span>${form.postcode || ''} ${form.plaats || ''}</span></div>
      <div class="veld"><label>Installatiedatum</label><span>${datum}</span></div>
      <div class="veld"><label>Installateur</label><span>${form.installateurNaam}</span></div>
      <div class="veld"><label>Certificering</label><span>${form.installateurCertificaat}</span></div>
    </div>
  </div>

  <div class="sectie">
    <h2>Installatie specificaties</h2>
    <div class="grid">
      <div class="veld"><label>Aansluiting</label><span>${form.aansluiting}</span></div>
      <div class="veld"><label>Hoofdzekering</label><span>${form.hoofdzekering}A</span></div>
      <div class="veld"><label>Aardlekschakelaar</label><span>${form.aardlekschakelaar ? 'Aanwezig' : 'Niet aanwezig'}</span></div>
      <div class="veld"><label>Aantal groepen</label><span>${groepen.length}</span></div>
    </div>
    ${form.opmerkingen ? `<div class="veld" style="margin-top:10px"><label>Opmerkingen</label><span>${form.opmerkingen}</span></div>` : ''}
  </div>

  <div class="sectie">
    <h2>Groepenlijst</h2>
    <table>
      <thead>
        <tr>
          <td style="width:50px">Nr.</td>
          <td>Naam / Omschrijving</td>
          <td style="width:80px">Ampere</td>
          <td style="width:80px">Voltage</td>
          <td style="width:120px">Type</td>
        </tr>
      </thead>
      <tbody>
        ${groepenHtml}
      </tbody>
    </table>
  </div>

  <div class="sectie">
    <h2>Verklaring</h2>
    <div class="kader">
      <p>Ondergetekende verklaart dat de elektrische installatie op bovengenoemd adres is uitgevoerd conform de geldende normen
      (NEN 1010, NEN 3140) en veilig in gebruik gesteld. De installatie is gecontroleerd en voldoet aan de eisen van de
      netbeheerder en de verzekeringsmaatschappij.</p>
    </div>
  </div>

  <div class="ondertekening">
    <div>
      <p style="margin-bottom:6px;font-size:10pt"><strong>Installateur</strong></p>
      <div class="handtekening" style="height:60px"></div>
      <label>${form.installateurNaam} — ${datum}</label>
    </div>
    <div>
      <p style="margin-bottom:6px;font-size:10pt"><strong>Opdrachtgever</strong></p>
      <div class="handtekening" style="height:60px"></div>
      <label>${klantNaam ?? '—'} — _______________</label>
    </div>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="groepenverklaring-${(klantNaam ?? 'document').replace(/\s/g, '-')}.html"`,
    },
  })
}
