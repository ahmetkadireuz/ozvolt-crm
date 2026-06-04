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
const BRAND = '#1b2d4a'
const GREEN = '#1a7a3c'
const F = `'Helvetica Neue',Helvetica,Arial,sans-serif`

// ── Gedeelde wrapper ──────────────────────────────────────────────────────────

function mailWrapper(opts: {
  accentColor: string
  headerBg: string
  body: string
}) {
  const { accentColor, headerBg, body } = opts
  return `<!DOCTYPE html>
<html lang="nl" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Ozvolt Elektrotechniek</title>
</head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:${F};-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1f6;">
<tr><td align="center" style="padding:48px 16px 56px;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

    <!-- Kleur accent balk bovenaan -->
    <tr><td style="background:${accentColor};height:4px;border-radius:6px 6px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- Header: alleen logo -->
    <tr><td style="background:${headerBg};padding:28px 40px;">
      <img src="${LOGO_URL}" alt="Ozvolt Elektrotechniek" height="40" width="auto"
           style="display:block;height:40px;width:auto;border:0;outline:none;text-decoration:none;">
    </td></tr>

    <!-- Witte card body -->
    <tr><td style="background:#ffffff;padding:40px 40px 36px;">
      ${body}
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f7f9fc;border-top:1px solid #e4e9f0;padding:20px 40px;border-radius:0 0 6px 6px;">
      <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#1b2d4a;font-family:${F};">Ozvolt Elektrotechniek</p>
      <p style="margin:0 0 10px;font-size:11px;color:#9daab8;font-family:${F};">KVK 99837366 &nbsp;·&nbsp; BTW NL005413208B33</p>
      <p style="margin:0;font-size:11px;color:#9daab8;font-family:${F};line-height:2;">
        <a href="mailto:financien@ozvoltelektro.nl" style="color:#9daab8;text-decoration:none;">financien@ozvoltelektro.nl</a> &nbsp;·&nbsp;
        06 449 98 789 &nbsp;·&nbsp;
        <a href="https://ozvoltelektro.nl" style="color:#9daab8;text-decoration:none;">ozvoltelektro.nl</a>
      </p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>`
}

function primaryBtn(href: string, label: string, bg = BRAND) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:16px;">
  <tr><td align="center" style="border-radius:6px;background:${bg};">
    <a href="${href}"
       style="display:block;padding:16px 28px;font-size:15px;font-weight:700;
              color:#ffffff;text-decoration:none;font-family:${F};
              border-radius:6px;text-align:center;">${label}</a>
  </td></tr>
  </table>`
}

function infoBox(rows: { label: string; value: string; valueColor?: string; borderRight?: boolean }[]) {
  const cells = rows.map(r => `
    <td style="padding:16px 20px;${r.borderRight ? 'border-right:1px solid #e4e9f0;' : ''}vertical-align:top;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#9daab8;text-transform:uppercase;
         letter-spacing:0.12em;font-family:${F};">${r.label}</p>
      <p style="margin:0;font-size:15px;font-weight:700;color:${r.valueColor ?? '#1b2d4a'};
         font-family:${F};">${r.value}</p>
    </td>`).join('')

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="border:1px solid #e4e9f0;border-radius:6px;overflow:hidden;margin-bottom:20px;">
  <tr>${cells}</tr>
  </table>`
}

// ── Offerte mail (naar klant) ─────────────────────────────────────────────────

export function offerteMailHtml(params: {
  klantNaam: string
  offerteNr: string
  acceptUrl: string
  betaalUrl?: string
  totaal?: string
  werkafspraakUrl?: string
  werkafspraakNr?: string
}) {
  const { klantNaam, offerteNr, acceptUrl, betaalUrl, totaal, werkafspraakUrl, werkafspraakNr } = params
  const voornaam = klantNaam.split(' ')[0]
  const heeftAfspraak = !!(werkafspraakUrl && werkafspraakNr)

  const body = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9daab8;text-transform:uppercase;
       letter-spacing:0.12em;font-family:${F};">${heeftAfspraak ? 'Offerte & werkafspraken' : 'Persoonlijke offerte'}</p>
    <p style="margin:0 0 20px;font-size:26px;font-weight:800;color:#1b2d4a;letter-spacing:-0.5px;
       font-family:${F};">${offerteNr}</p>

    <p style="margin:0 0 8px;font-size:15px;color:#1b2d4a;line-height:1.5;font-family:${F};">
      Beste <strong>${voornaam}</strong>,
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#4a5568;line-height:1.85;font-family:${F};">
      ${heeftAfspraak
        ? `Hierbij ontvangt u de offerte en de bijbehorende werkafspraken. Bekijk en onderteken beide documenten digitaal via onderstaande knoppen.`
        : `Wij hebben een offerte voor u klaarstaan. Bekijk en onderteken de offerte digitaal via onderstaande knop als u akkoord gaat met de werkzaamheden.`
      }
    </p>

    ${primaryBtn(acceptUrl, 'Offerte bekijken &amp; ondertekenen  →')}
    ${heeftAfspraak ? primaryBtn(werkafspraakUrl!, 'Werkafspraken bekijken &amp; bevestigen  →', '#1a5a8a') : ''}
    ${betaalUrl ? primaryBtn(betaalUrl, 'Direct online betalen  →', GREEN) : ''}

    ${totaal ? infoBox([
      { label: 'Offerte', value: offerteNr, borderRight: heeftAfspraak },
      ...(heeftAfspraak ? [{ label: 'Werkafspraken', value: werkafspraakNr! }] : []),
      ...(!heeftAfspraak ? [{ label: 'Totaalbedrag', value: totaal }] : []),
    ]) : ''}

    ${heeftAfspraak && totaal ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e4e9f0;border-radius:6px;overflow:hidden;margin-bottom:20px;">
    <tr><td style="padding:14px 20px;background:#f7f9fc;">
      <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#9daab8;text-transform:uppercase;
         letter-spacing:0.12em;font-family:${F};">Totaalbedrag</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#1b2d4a;font-family:${F};">${totaal}</p>
    </td></tr>
    </table>` : ''}

    <p style="margin:16px 0 4px;font-size:12px;color:#9daab8;font-family:${F};">
      Knop werkt niet? Kopieer de offerte-link:
    </p>
    <p style="margin:0 0 ${heeftAfspraak ? '8' : '32'}px;font-family:${F};">
      <a href="${acceptUrl}" style="font-size:12px;color:#3b6fa0;word-break:break-all;">${acceptUrl}</a>
    </p>
    ${heeftAfspraak ? `
    <p style="margin:0 0 4px;font-size:12px;color:#9daab8;font-family:${F};">Werkafspraken-link:</p>
    <p style="margin:0 0 32px;font-family:${F};">
      <a href="${werkafspraakUrl}" style="font-size:12px;color:#3b6fa0;word-break:break-all;">${werkafspraakUrl}</a>
    </p>` : ''}

    <div style="border-top:1px solid #e4e9f0;padding-top:24px;">
      <p style="margin:0;font-size:13px;color:#4a5568;line-height:1.7;font-family:${F};">
        Met vriendelijke groet,<br>
        <strong style="color:#1b2d4a;font-size:14px;">Ahmet Öz</strong><br>
        <span style="color:#9daab8;">Ozvolt Elektrotechniek</span>
      </p>
    </div>`

  return mailWrapper({ accentColor: GREEN, headerBg: BRAND, body })
}

// ── Offerte bevestiging (intern naar Ozvolt) ──────────────────────────────────

export function offerteBevestigingMailHtml(params: {
  klantNaam: string
  offerteNr: string
  acceptedName: string
  acceptUrl: string
  totaal: string
}) {
  const { klantNaam, offerteNr, acceptedName, acceptUrl, totaal } = params

  const body = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;
       letter-spacing:0.12em;font-family:${F};">Offerte geaccepteerd ✓</p>
    <p style="margin:0 0 24px;font-size:20px;font-weight:800;color:#1b2d4a;font-family:${F};">
      <strong>${acceptedName}</strong> heeft <strong>${offerteNr}</strong> geaccepteerd.
    </p>

    ${infoBox([
      { label: 'Klant', value: klantNaam, borderRight: true },
      { label: 'Offerte', value: offerteNr, borderRight: true },
      { label: 'Bedrag', value: totaal, valueColor: GREEN },
    ])}

    ${primaryBtn(acceptUrl, 'Offerte openen in CRM  →')}

    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e4e9f0;">
      <p style="margin:0;font-size:11px;color:#9daab8;font-family:${F};">
        Automatische melding van het Ozvolt CRM systeem
      </p>
    </div>`

  return mailWrapper({ accentColor: GREEN, headerBg: '#15622e', body })
}

// ── Factuur mail (naar klant) ─────────────────────────────────────────────────

export function factuurMailHtml(params: {
  klantNaam: string
  factuurNr: string
  bedrag: string
  vervaldatum: string
  betaalUrl?: string
}) {
  const { klantNaam, factuurNr, bedrag, vervaldatum, betaalUrl } = params
  const voornaam = klantNaam.split(' ')[0]

  const body = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9daab8;text-transform:uppercase;
       letter-spacing:0.12em;font-family:${F};">Factuur</p>
    <p style="margin:0 0 20px;font-size:26px;font-weight:800;color:#1b2d4a;letter-spacing:-0.5px;
       font-family:${F};">${factuurNr}</p>

    <p style="margin:0 0 8px;font-size:15px;color:#1b2d4a;line-height:1.5;font-family:${F};">
      Beste <strong>${voornaam}</strong>,
    </p>
    <p style="margin:0 0 12px;font-size:14px;color:#4a5568;line-height:1.85;font-family:${F};">
      Hierbij ontvangt u factuur <strong>${factuurNr}</strong> voor een totaalbedrag van
      <strong>${bedrag}</strong>.
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#4a5568;line-height:1.85;font-family:${F};">
      Gelieve dit bedrag vóór <strong>${vervaldatum}</strong> te voldoen.
    </p>

    ${betaalUrl ? primaryBtn(betaalUrl, 'Direct online betalen  →', GREEN) : ''}

    ${infoBox([
      { label: 'Factuurnummer', value: factuurNr, borderRight: true },
      { label: 'Bedrag', value: bedrag, borderRight: true },
      { label: 'Vervaldatum', value: vervaldatum, valueColor: '#c0392b' },
    ])}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e4e9f0;border-radius:6px;overflow:hidden;margin-bottom:32px;">
    <tr><td style="padding:16px 20px;background:#f7f9fc;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#9daab8;text-transform:uppercase;
         letter-spacing:0.12em;font-family:${F};">Betalen via bankoverschrijving</p>
      <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#1b2d4a;
         letter-spacing:0.02em;font-family:${F};">NL04 ABNA 0154 5811 43</p>
      <p style="margin:0;font-size:12px;color:#64748b;font-family:${F};">
        T.n.v. Ozvolt Elektrotechniek &nbsp;·&nbsp; o.v.v. ${factuurNr}
      </p>
    </td></tr>
    </table>

    <div style="border-top:1px solid #e4e9f0;padding-top:24px;">
      <p style="margin:0;font-size:13px;color:#4a5568;line-height:1.7;font-family:${F};">
        Met vriendelijke groet,<br>
        <strong style="color:#1b2d4a;font-size:14px;">Ahmet Öz</strong><br>
        <span style="color:#9daab8;">Ozvolt Elektrotechniek</span>
      </p>
    </div>`

  return mailWrapper({ accentColor: GREEN, headerBg: BRAND, body })
}
