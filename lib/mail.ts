import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

export async function sendMail(opts: {
  to: string
  subject: string
  html: string
  replyTo?: string
}) {
  const t = getTransporter()
  await t.sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? 'Ozvolt Elektrotechniek'}" <${process.env.SMTP_USER}>`,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    html: opts.html,
  })
}

const LOGO_URL = 'https://portaal.ozvoltelektro.nl/logo-wit.png'
const BRAND = '#1d2f4c'
const F = `-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif`

function mailWrapper(headerColor: string, headerContent: string, bodyContent: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Ozvolt Elektrotechniek</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:${F};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Document card -->
  <tr><td style="background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 24px rgba(0,0,0,0.06);">
  <table width="100%" cellpadding="0" cellspacing="0">

    <!-- Header met logo -->
    <tr><td style="background:${headerColor};padding:32px 44px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><img src="${LOGO_URL}" alt="Ozvolt Elektrotechniek" height="40" style="display:block;height:40px;width:auto;"></td>
        <td style="text-align:right;vertical-align:bottom;">
          ${headerContent}
        </td>
      </tr>
      </table>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:36px 44px 32px;">
      ${bodyContent}
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f8fafc;border-top:1px solid #e8edf3;padding:20px 44px;">
      <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:top;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;font-family:${F};">Ozvolt Elektrotechniek</p>
          <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;font-family:${F};">KVK 99837366 · BTW NL005413208B33</p>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <p style="margin:0;font-size:11px;color:#94a3b8;font-family:${F};line-height:1.8;">
            financien@ozvoltelektro.nl<br>
            06 449 98 789
          </p>
        </td>
      </tr>
      </table>
    </td></tr>

  </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function btn(href: string, label: string, color = BRAND) {
  return `<table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
  <tr><td style="background:${color};border-radius:4px;">
    <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:${F};">${label}</a>
  </td></tr>
  </table>`
}

// ── Offerte mail ──────────────────────────────────────────────────────────────

export function offerteMailHtml(params: {
  klantNaam: string
  offerteNr: string
  acceptUrl: string
  betaalUrl?: string
  totaal?: string
}) {
  const { klantNaam, offerteNr, acceptUrl, betaalUrl, totaal } = params
  const voornaam = klantNaam.split(' ')[0]

  const header = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.12em;font-family:${F};">Persoonlijke offerte</p>
    <p style="margin:0;font-size:20px;font-weight:800;color:#fff;font-family:${F};">${offerteNr}</p>`

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;font-family:${F};">Beste <strong>${voornaam}</strong>,</p>
    <p style="margin:0 0 28px;font-size:14px;color:#4b5563;line-height:1.8;font-family:${F};">
      Wij hebben een offerte voor u klaarstaan. Bekijk de offerte via onderstaande knop en onderteken digitaal als u akkoord gaat.
    </p>

    ${btn(acceptUrl, 'Offerte bekijken &amp; ondertekenen →')}
    ${betaalUrl ? btn(betaalUrl, 'Direct online betalen →', '#16a34a') : ''}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 28px;background:#f8fafc;border-radius:4px;border:1px solid #e8edf3;">
    <tr>
      <td style="padding:14px 18px;border-right:1px solid #e8edf3;">
        <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;font-family:${F};">Offerte</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;font-family:${F};">${offerteNr}</p>
      </td>
      ${totaal ? `<td style="padding:14px 18px;">
        <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;font-family:${F};">Totaalbedrag</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;font-family:${F};">${totaal}</p>
      </td>` : ''}
    </tr>
    </table>

    <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;font-family:${F};">Link werkt niet? Kopieer:</p>
    <p style="margin:0 0 28px;font-size:12px;font-family:${F};"><a href="${acceptUrl}" style="color:#4c7191;word-break:break-all;">${acceptUrl}</a></p>

    <hr style="margin:0 0 24px;border:none;border-top:1px solid #e8edf3;">
    <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;font-family:${F};">Met vriendelijke groet,<br><strong style="color:#0f172a;">Ahmet Öz — Ozvolt Elektrotechniek</strong></p>`

  return mailWrapper(BRAND, header, body)
}

// ── Offerte bevestiging (intern) ──────────────────────────────────────────────

export function offerteBevestigingMailHtml(params: {
  klantNaam: string
  offerteNr: string
  acceptedName: string
  acceptUrl: string
  totaal: string
}) {
  const { klantNaam, offerteNr, acceptedName, acceptUrl, totaal } = params

  const header = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.12em;font-family:${F};">Offerte geaccepteerd ✓</p>
    <p style="margin:0;font-size:18px;font-weight:800;color:#fff;font-family:${F};">${klantNaam}</p>`

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;font-family:${F};">
      <strong>${acceptedName}</strong> heeft zojuist offerte <strong>${offerteNr}</strong> ondertekend.<br>
      Totaalbedrag: <strong>${totaal}</strong>
    </p>

    ${btn(acceptUrl, 'Offerte bekijken in CRM →')}

    <hr style="margin:16px 0 20px;border:none;border-top:1px solid #e8edf3;">
    <p style="margin:0;font-size:12px;color:#94a3b8;font-family:${F};">Automatische melding van het CRM systeem</p>`

  return mailWrapper('#15803d', header, body)
}

// ── Factuur mail ──────────────────────────────────────────────────────────────

export function factuurMailHtml(params: {
  klantNaam: string
  factuurNr: string
  bedrag: string
  vervaldatum: string
  betaalUrl?: string
}) {
  const { klantNaam, factuurNr, bedrag, vervaldatum, betaalUrl } = params
  const voornaam = klantNaam.split(' ')[0]

  const header = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.12em;font-family:${F};">Factuur</p>
    <p style="margin:0;font-size:20px;font-weight:800;color:#fff;font-family:${F};">${factuurNr} · ${bedrag}</p>`

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;font-family:${F};">Beste <strong>${voornaam}</strong>,</p>
    <p style="margin:0 0 28px;font-size:14px;color:#4b5563;line-height:1.8;font-family:${F};">
      Hierbij ontvangt u factuur <strong>${factuurNr}</strong> voor een bedrag van <strong>${bedrag}</strong>.<br>
      Wij verzoeken u vriendelijk dit bedrag vóór <strong>${vervaldatum}</strong> te voldoen.
    </p>

    ${betaalUrl ? btn(betaalUrl, 'Direct online betalen →', '#16a34a') : ''}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f8fafc;border-radius:4px;border:1px solid #e8edf3;">
    <tr>
      <td style="padding:14px 18px;border-right:1px solid #e8edf3;">
        <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;font-family:${F};">Factuurnummer</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;font-family:${F};">${factuurNr}</p>
      </td>
      <td style="padding:14px 18px;border-right:1px solid #e8edf3;">
        <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;font-family:${F};">Bedrag</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;font-family:${F};">${bedrag}</p>
      </td>
      <td style="padding:14px 18px;">
        <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;font-family:${F};">Vervaldatum</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#dc2626;font-family:${F};">${vervaldatum}</p>
      </td>
    </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#f8fafc;border-radius:4px;border:1px solid #e8edf3;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;font-family:${F};">Betalen via bankoverschrijving</p>
      <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:#0f172a;font-family:${F};">NL04 ABNA 0154 5811 43</p>
      <p style="margin:2px 0 0;font-size:12px;color:#475569;font-family:${F};">t.n.v. Ozvolt Elektrotechniek · o.v.v. ${factuurNr}</p>
    </td></tr>
    </table>

    <hr style="margin:0 0 24px;border:none;border-top:1px solid #e8edf3;">
    <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;font-family:${F};">Met vriendelijke groet,<br><strong style="color:#0f172a;">Ahmet Öz — Ozvolt Elektrotechniek</strong></p>`

  return mailWrapper('#14532d', header, body)
}
