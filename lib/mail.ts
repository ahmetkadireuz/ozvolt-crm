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
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
}) {
  const t = getTransporter()
  await t.sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? 'Ozvolt Elektrotechniek'}" <${process.env.SMTP_USER}>`,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments,
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
  tagline: string
  body: string
}) {
  const { accentColor, headerBg, tagline, body } = opts
  return `<!DOCTYPE html>
<html lang="nl" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Ozvolt Elektrotechniek</title>
</head>
<body style="margin:0;padding:0;background:#e8ecf2;font-family:${F};-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8ecf2;">
<tr><td align="center" style="padding:40px 16px 56px;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

    <!-- Top accent stripe -->
    <tr><td style="background:${accentColor};height:5px;border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- Header: logo + tagline -->
    <tr><td style="background:${headerBg};padding:26px 40px 22px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>
          <img src="${LOGO_URL}" alt="Ozvolt Elektrotechniek" height="38" width="auto"
               style="display:block;height:38px;width:auto;border:0;outline:none;text-decoration:none;">
        </td>
        <td align="right" style="vertical-align:middle;">
          <span style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);
                border-radius:20px;padding:4px 14px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.75);
                font-family:${F};letter-spacing:0.04em;">${tagline}</span>
        </td>
      </tr>
      </table>
    </td></tr>

    <!-- Witte card body -->
    <tr><td style="background:#ffffff;padding:44px 44px 40px;border-left:1px solid #dde3ec;border-right:1px solid #dde3ec;">
      ${body}
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f5f7fa;border:1px solid #dde3ec;border-top:none;padding:22px 44px 24px;border-radius:0 0 8px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:top;">
          <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#1b2d4a;font-family:${F};">Ozvolt Elektrotechniek</p>
          <p style="margin:0 0 2px;font-size:11px;color:#9daab8;font-family:${F};">KVK 99837366 &nbsp;·&nbsp; BTW NL005413208B33</p>
          <p style="margin:0;font-size:11px;color:#9daab8;font-family:${F};">
            <a href="mailto:financien@ozvoltelektro.nl" style="color:#9daab8;text-decoration:none;">financien@ozvoltelektro.nl</a>
            &nbsp;·&nbsp; 06 449 98 789
          </p>
        </td>
        <td align="right" style="vertical-align:top;">
          <a href="https://ozvoltelektro.nl" style="font-size:11px;color:#6b7fa0;text-decoration:none;font-family:${F};">
            ozvoltelektro.nl
          </a>
        </td>
      </tr>
      </table>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>`
}

function primaryBtn(href: string, label: string, bg = BRAND, icon = '') {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:12px;">
  <tr><td style="border-radius:8px;background:${bg};box-shadow:0 2px 8px rgba(0,0,0,0.15);">
    <a href="${href}"
       style="display:block;padding:17px 28px;font-size:15px;font-weight:700;
              color:#ffffff;text-decoration:none;font-family:${F};
              border-radius:8px;text-align:center;letter-spacing:0.01em;">${icon ? icon + ' ' : ''}${label}</a>
  </td></tr>
  </table>`
}

function infoBox(rows: { label: string; value: string; valueColor?: string; borderRight?: boolean }[]) {
  const cells = rows.map(r => `
    <td style="padding:16px 20px;${r.borderRight ? 'border-right:1px solid #e4e9f0;' : ''}vertical-align:top;background:#f8fafd;">
      <p style="margin:0 0 5px;font-size:10px;font-weight:700;color:#9daab8;text-transform:uppercase;
         letter-spacing:0.14em;font-family:${F};">${r.label}</p>
      <p style="margin:0;font-size:16px;font-weight:800;color:${r.valueColor ?? '#1b2d4a'};
         font-family:${F};letter-spacing:-0.2px;">${r.value}</p>
    </td>`).join('')

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="border:1px solid #e4e9f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
  <tr>${cells}</tr>
  </table>`
}

function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
  <tr><td style="height:1px;background:#e4e9f0;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`
}

// ── Werkvoorstel mail (naar klant) ────────────────────────────────────────────

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
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#7b92b2;text-transform:uppercase;
       letter-spacing:0.16em;font-family:${F};">${heeftAfspraak ? 'Werkvoorstel &amp; Werkafspraken' : 'Persoonlijk werkvoorstel'}</p>
    <p style="margin:0 0 28px;font-size:30px;font-weight:900;color:#1b2d4a;letter-spacing:-0.8px;
       font-family:${F};line-height:1.1;">${offerteNr}</p>

    <p style="margin:0 0 10px;font-size:16px;color:#1b2d4a;line-height:1.5;font-family:${F};">
      Beste <strong>${voornaam}</strong>,
    </p>
    <p style="margin:0 0 32px;font-size:14.5px;color:#4a5568;line-height:1.9;font-family:${F};">
      ${heeftAfspraak
        ? `Wij hebben uw <strong style="color:#1b2d4a;">werkvoorstel en werkafspraken</strong> klaarstaan. U kunt beide documenten hieronder digitaal bekijken en ondertekenen.`
        : `Wij hebben een <strong style="color:#1b2d4a;">persoonlijk werkvoorstel</strong> voor u opgesteld. Bekijk het via onderstaande knop en onderteken digitaal als u akkoord gaat.`
      }
    </p>

    ${primaryBtn(acceptUrl, 'Werkvoorstel bekijken &amp; ondertekenen', BRAND, '📋')}
    ${heeftAfspraak ? primaryBtn(werkafspraakUrl!, 'Werkafspraken bekijken &amp; bevestigen', '#1a5a8a', '🔧') : ''}
    ${betaalUrl ? primaryBtn(betaalUrl, 'Direct online betalen', GREEN, '💳') : ''}

    ${totaal ? infoBox([
      { label: 'Referentie', value: offerteNr, borderRight: true },
      ...(heeftAfspraak ? [{ label: 'Werkafspraken', value: werkafspraakNr!, borderRight: true }] : []),
      { label: 'Totaalbedrag', value: totaal, valueColor: GREEN },
    ]) : ''}

    ${divider()}

    <p style="margin:0 0 6px;font-size:12px;color:#9daab8;font-family:${F};">
      Knop werkt niet? Gebruik deze directe link:
    </p>
    <p style="margin:0 0 ${heeftAfspraak ? '10' : '28'}px;font-family:${F};">
      <a href="${acceptUrl}" style="font-size:12px;color:#3b6fa0;word-break:break-all;text-decoration:underline;">${acceptUrl}</a>
    </p>
    ${heeftAfspraak ? `
    <p style="margin:0 0 6px;font-size:12px;color:#9daab8;font-family:${F};">Link werkafspraken:</p>
    <p style="margin:0 0 28px;font-family:${F};">
      <a href="${werkafspraakUrl}" style="font-size:12px;color:#3b6fa0;word-break:break-all;text-decoration:underline;">${werkafspraakUrl}</a>
    </p>` : ''}

    <p style="margin:0;font-size:13.5px;color:#4a5568;line-height:1.8;font-family:${F};">
      Met vriendelijke groet,<br>
      <strong style="color:#1b2d4a;font-size:15px;">Ahmet Öz</strong><br>
      <span style="color:#9daab8;font-size:12px;">Ozvolt Elektrotechniek &nbsp;·&nbsp; 06 449 98 789</span>
    </p>`

  return mailWrapper({ accentColor: GREEN, headerBg: BRAND, tagline: 'Werkvoorstel', body })
}

// ── Werkvoorstel bevestiging (intern naar Ozvolt) ─────────────────────────────

export function offerteBevestigingMailHtml(params: {
  klantNaam: string
  offerteNr: string
  acceptedName: string
  acceptUrl: string
  totaal: string
}) {
  const { klantNaam, offerteNr, acceptedName, acceptUrl, totaal } = params

  const body = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#7b9e7b;text-transform:uppercase;
       letter-spacing:0.16em;font-family:${F};">✓ Werkvoorstel geaccepteerd</p>
    <p style="margin:0 0 28px;font-size:24px;font-weight:900;color:#1b2d4a;letter-spacing:-0.5px;font-family:${F};">
      <strong>${acceptedName}</strong> ging akkoord!
    </p>

    ${infoBox([
      { label: 'Klant', value: klantNaam, borderRight: true },
      { label: 'Referentie', value: offerteNr, borderRight: true },
      { label: 'Bedrag', value: totaal, valueColor: GREEN },
    ])}

    ${primaryBtn(acceptUrl, 'Openen in CRM', BRAND, '🔗')}

    ${divider()}

    <p style="margin:0;font-size:11px;color:#9daab8;font-family:${F};">
      Automatische melding — Ozvolt CRM systeem
    </p>`

  return mailWrapper({ accentColor: GREEN, headerBg: '#15622e', tagline: 'CRM melding', body })
}

// ── Betaalnota mail (naar klant) ──────────────────────────────────────────────

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
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#7b92b2;text-transform:uppercase;
       letter-spacing:0.16em;font-family:${F};">Betaalnota</p>
    <p style="margin:0 0 28px;font-size:30px;font-weight:900;color:#1b2d4a;letter-spacing:-0.8px;
       font-family:${F};line-height:1.1;">${factuurNr}</p>

    <p style="margin:0 0 10px;font-size:16px;color:#1b2d4a;line-height:1.5;font-family:${F};">
      Beste <strong>${voornaam}</strong>,
    </p>
    <p style="margin:0 0 10px;font-size:14.5px;color:#4a5568;line-height:1.9;font-family:${F};">
      Hartelijk dank voor uw opdracht. Hierbij ontvangt u de <strong style="color:#1b2d4a;">betaalnota</strong>
      voor de uitgevoerde werkzaamheden.
    </p>
    <p style="margin:0 0 32px;font-size:14.5px;color:#4a5568;line-height:1.9;font-family:${F};">
      Het totaalbedrag van <strong style="color:#1b2d4a;">${bedrag}</strong> verzoeken wij u
      vóór <strong style="color:#c0392b;">${vervaldatum}</strong> te voldoen.
    </p>

    ${betaalUrl ? primaryBtn(betaalUrl, 'Nu online betalen', GREEN, '💳') : ''}

    ${infoBox([
      { label: 'Betaalnota', value: factuurNr, borderRight: true },
      { label: 'Te betalen', value: bedrag, borderRight: true, valueColor: GREEN },
      { label: 'Uiterlijk', value: vervaldatum, valueColor: '#c0392b' },
    ])}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #dde9f5;border-radius:8px;overflow:hidden;margin-bottom:28px;background:#f5f8fc;">
    <tr><td style="padding:18px 22px;">
      <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#7b92b2;text-transform:uppercase;
         letter-spacing:0.14em;font-family:${F};">Bankoverschrijving</p>
      <p style="margin:0 0 4px;font-size:16px;font-weight:800;color:#1b2d4a;
         letter-spacing:0.05em;font-family:${F};">NL69 KNAB 0780 9871 79</p>
      <p style="margin:0;font-size:12px;color:#64748b;font-family:${F};">
        T.n.v. Ozvolt Elektrotechniek &nbsp;&middot;&nbsp; Kenmerk: <strong>${factuurNr}</strong>
      </p>
    </td></tr>
    </table>

    <p style="margin:0;font-size:13.5px;color:#4a5568;line-height:1.8;font-family:${F};">
      Met vriendelijke groet,<br>
      <strong style="color:#1b2d4a;font-size:15px;">Ahmet Öz</strong><br>
      <span style="color:#9daab8;font-size:12px;">Ozvolt Elektrotechniek &nbsp;·&nbsp; 06 449 98 789</span>
    </p>`

  return mailWrapper({ accentColor: BRAND, headerBg: BRAND, tagline: 'Betaalnota', body })
}

// ── Betaald bevestiging (naar klant) — betaalnota PDF + werkafspraken ─────────

export function betaaldBevestigingMailHtml(params: {
  klantNaam: string
  factuurNr: string
  bedrag: string
  afspraakNr?: string
  afspraken?: Array<{ omschrijving: string; toelichting?: string; verantwoordelijke?: string }>
  afspraakDatum?: string
}) {
  const { klantNaam, factuurNr, bedrag, afspraakNr, afspraken, afspraakDatum } = params
  const voornaam = klantNaam.split(' ')[0]

  const afsprakenLijst = afspraken && afspraken.length > 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
              style="border:1px solid #e4e9f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        ${afspraken.map((a, i) => `
          <tr style="border-bottom:1px solid #e4e9f0;">
            <td style="padding:12px 16px;background:${i % 2 === 1 ? '#f8fafd' : '#ffffff'};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:top;padding-right:12px;">
                  <div style="width:24px;height:24px;border-radius:50%;background:#1b2d4a;color:#fff;
                       font-size:11px;font-weight:700;text-align:center;line-height:24px;font-family:${F};">${i + 1}</div>
                </td>
                <td style="vertical-align:top;">
                  <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#1b2d4a;font-family:${F};">${a.omschrijving}</p>
                  ${a.toelichting ? `<p style="margin:0 0 4px;font-size:12px;color:#64748b;font-family:${F};line-height:1.6;">${a.toelichting}</p>` : ''}
                  ${a.verantwoordelijke === 'klant' ? `<span style="display:inline-block;background:#fef9c3;color:#92400e;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:${F};">Regelt u zelf</span>` : ''}
                  ${a.verantwoordelijke === 'ozvolt' ? `<span style="display:inline-block;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:${F};">Regelt Ozvolt</span>` : ''}
                </td>
              </tr>
              </table>
            </td>
          </tr>`).join('')}
       </table>`
    : ''

  const body = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;
       letter-spacing:0.16em;font-family:${F};">✓ Betaling ontvangen</p>
    <p style="margin:0 0 28px;font-size:30px;font-weight:900;color:#1b2d4a;letter-spacing:-0.8px;
       font-family:${F};line-height:1.1;">Bedankt, ${voornaam}!</p>

    <p style="margin:0 0 10px;font-size:15px;color:#1b2d4a;line-height:1.5;font-family:${F};">
      Uw betaling is in goede orde ontvangen.
    </p>
    <p style="margin:0 0 32px;font-size:14.5px;color:#4a5568;line-height:1.9;font-family:${F};">
      De <strong style="color:#1b2d4a;">betaalnota</strong> vindt u als bijlage bij deze e-mail.
      ${afspraakNr ? `Hieronder ziet u een overzicht van de gemaakte werkafspraken.` : ''}
    </p>

    ${infoBox([
      { label: 'Betaalnota', value: factuurNr, borderRight: true },
      { label: 'Ontvangen bedrag', value: bedrag, valueColor: '#16a34a', borderRight: !!afspraakNr },
      ...(afspraakNr ? [{ label: 'Werkafspraken', value: afspraakNr }] : []),
    ])}

    ${afspraken && afspraken.length > 0 ? `
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#7b92b2;text-transform:uppercase;
       letter-spacing:0.14em;font-family:${F};">Overzicht werkafspraken${afspraakDatum ? ` — ${afspraakDatum}` : ''}</p>
    ${afsprakenLijst}
    ` : ''}

    ${divider()}

    <p style="margin:0 0 6px;font-size:14px;color:#1b2d4a;font-family:${F};">
      Heeft u nog vragen? Neem gerust contact op.
    </p>
    <p style="margin:0;font-size:13.5px;color:#4a5568;line-height:1.8;font-family:${F};">
      Met vriendelijke groet,<br>
      <strong style="color:#1b2d4a;font-size:15px;">Ahmet Öz</strong><br>
      <span style="color:#9daab8;font-size:12px;">Ozvolt Elektrotechniek &nbsp;·&nbsp; 06 449 98 789</span>
    </p>`

  return mailWrapper({ accentColor: GREEN, headerBg: '#15622e', tagline: 'Betaling bevestigd', body })
}

// ── Werkafspraken bevestiging (naar klant na ondertekening) ───────────────────

export function werkafspraakBevestigingMailHtml(params: {
  klantNaam: string
  afspraakNr: string
  afspraken: Array<{ omschrijving: string; toelichting?: string; verantwoordelijke?: string }>
  datum?: string
}) {
  const { klantNaam, afspraakNr, afspraken, datum } = params
  const voornaam = klantNaam.split(' ')[0]

  const afsprakenLijst = afspraken.length > 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
              style="border:1px solid #e4e9f0;border-radius:8px;overflow:hidden;margin-bottom:28px;">
        ${afspraken.map((a, i) => `
          <tr style="${i < afspraken.length - 1 ? 'border-bottom:1px solid #e4e9f0;' : ''}">
            <td style="padding:12px 16px;background:${i % 2 === 1 ? '#f8fafd' : '#ffffff'};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:top;padding-right:12px;">
                  <div style="width:24px;height:24px;border-radius:50%;background:#1b2d4a;color:#fff;
                       font-size:11px;font-weight:700;text-align:center;line-height:24px;font-family:${F};">${i + 1}</div>
                </td>
                <td style="vertical-align:top;">
                  <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#1b2d4a;font-family:${F};">${a.omschrijving}</p>
                  ${a.toelichting ? `<p style="margin:0 0 4px;font-size:12px;color:#64748b;font-family:${F};line-height:1.6;">${a.toelichting}</p>` : ''}
                  ${a.verantwoordelijke === 'klant' ? `<span style="display:inline-block;background:#fef9c3;color:#92400e;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:${F};">Regelt u zelf</span>` : ''}
                  ${a.verantwoordelijke === 'ozvolt' ? `<span style="display:inline-block;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:${F};">Regelt Ozvolt</span>` : ''}
                </td>
              </tr>
              </table>
            </td>
          </tr>`).join('')}
       </table>`
    : ''

  const body = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#7b92b2;text-transform:uppercase;
       letter-spacing:0.16em;font-family:${F};">✓ Werkafspraken bevestigd</p>
    <p style="margin:0 0 28px;font-size:30px;font-weight:900;color:#1b2d4a;letter-spacing:-0.8px;
       font-family:${F};line-height:1.1;">${afspraakNr}</p>

    <p style="margin:0 0 10px;font-size:16px;color:#1b2d4a;line-height:1.5;font-family:${F};">
      Beste <strong>${voornaam}</strong>,
    </p>
    <p style="margin:0 0 32px;font-size:14.5px;color:#4a5568;line-height:1.9;font-family:${F};">
      Bedankt voor uw bevestiging. Hieronder vindt u een overzicht van de gemaakte
      <strong style="color:#1b2d4a;">werkafspraken</strong>${datum ? ` van ${datum}` : ''}.
      Bewaar deze e-mail als referentie.
    </p>

    ${infoBox([
      { label: 'Werkafspraken', value: afspraakNr, borderRight: !!datum },
      ...(datum ? [{ label: 'Datum', value: datum }] : []),
    ])}

    <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#7b92b2;text-transform:uppercase;
       letter-spacing:0.14em;font-family:${F};">Afgesproken werkzaamheden</p>
    ${afsprakenLijst}

    ${divider()}

    <p style="margin:0 0 6px;font-size:14px;color:#1b2d4a;font-family:${F};">
      Heeft u vragen over de planning? Bel of mail ons gerust.
    </p>
    <p style="margin:0;font-size:13.5px;color:#4a5568;line-height:1.8;font-family:${F};">
      Met vriendelijke groet,<br>
      <strong style="color:#1b2d4a;font-size:15px;">Ahmet Öz</strong><br>
      <span style="color:#9daab8;font-size:12px;">Ozvolt Elektrotechniek &nbsp;·&nbsp; 06 449 98 789</span>
    </p>`

  return mailWrapper({ accentColor: BRAND, headerBg: BRAND, tagline: 'Werkafspraken', body })
}
