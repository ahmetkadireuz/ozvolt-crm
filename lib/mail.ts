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

export function offerteMailHtml(params: {
  klantNaam: string
  offerteNr: string
  acceptUrl: string
  bedrijfsnaam?: string
}) {
  const { klantNaam, offerteNr, acceptUrl, bedrijfsnaam = 'Ozvolt Elektrotechniek' } = params
  const voornaam = klantNaam.split(' ')[0]

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <!-- LOGO BALK -->
  <tr><td style="padding-bottom:24px;text-align:center;">
    <img src="https://portaal.ozvoltelektro.nl/logo-wit-site.png" alt="Ozvolt Elektrotechniek" height="48" style="height:48px;display:inline-block;" onerror="this.style.display='none'">
  </td></tr>

  <!-- KAART -->
  <tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- GEKLEURDE BOVENKANT -->
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="background:linear-gradient(135deg,#1d2f4c 0%,#2d4a7a 100%);padding:36px 40px 32px;text-align:left;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:2px;">Persoonlijke offerte</p>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;line-height:1.2;">Uw offerte staat klaar</h1>
      <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);">${offerteNr}</p>
    </td></tr>
    </table>

    <!-- INHOUD -->
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:36px 40px;">
      <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.7;">Beste <strong>${voornaam}</strong>,</p>
      <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.8;">
        Wij hebben een offerte voor u klaarstaan. Klik op onderstaande knop om de offerte te bekijken en — als u akkoord gaat — digitaal te ondertekenen.
      </p>

      <!-- KNOP -->
      <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:#1d2f4c;border-radius:10px;">
        <a href="${acceptUrl}" style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">Offerte bekijken &amp; ondertekenen →</a>
      </td></tr>
      </table>

      <!-- INFO BLOKJE -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Offerte</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#1d2f4c;">${offerteNr}</p>
      </td></tr>
      </table>

      <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">Knop werkt niet? Kopieer deze link:</p>
      <p style="margin:0 0 28px;font-size:12px;"><a href="${acceptUrl}" style="color:#4c7191;word-break:break-all;">${acceptUrl}</a></p>

      <hr style="margin:0 0 24px;border:none;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">Met vriendelijke groet,<br>
      <strong style="color:#1d2f4c;">Ahmed Öz</strong><br>
      <span style="color:#6b7280;">Ozvolt Elektrotechniek</span></p>
    </td></tr>
    </table>

  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:20px 0;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Ozvolt Elektrotechniek · KVK 99837366</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">financien@ozvoltelektro.nl</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export function factuurMailHtml(params: {
  klantNaam: string
  factuurNr: string
  bedrag: string
  vervaldatum: string
  betaalUrl?: string
  bedrijfsnaam?: string
}) {
  const { klantNaam, factuurNr, bedrag, vervaldatum, betaalUrl, bedrijfsnaam = 'Ozvolt Elektrotechniek' } = params
  const voornaam = klantNaam.split(' ')[0]

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <tr><td style="padding-bottom:24px;text-align:center;">
    <img src="https://portaal.ozvoltelektro.nl/logo-wit-site.png" alt="Ozvolt Elektrotechniek" height="48" style="height:48px;display:inline-block;" onerror="this.style.display='none'">
  </td></tr>

  <tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="background:linear-gradient(135deg,#14532d 0%,#166534 100%);padding:36px 40px 32px;text-align:left;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:2px;">Factuur</p>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;line-height:1.2;">Uw factuur staat klaar</h1>
      <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);">${factuurNr} · ${bedrag}</p>
    </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:36px 40px;">
      <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.7;">Beste <strong>${voornaam}</strong>,</p>
      <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.8;">
        Hierbij ontvangt u factuur <strong>${factuurNr}</strong> voor een totaalbedrag van <strong>${bedrag}</strong>.<br>
        Gelieve dit bedrag vóór <strong>${vervaldatum}</strong> te voldoen.
      </p>

      ${betaalUrl ? `
      <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:#16a34a;border-radius:10px;">
        <a href="${betaalUrl}" style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Online betalen →</a>
      </td></tr>
      </table>` : ''}

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
      <tr>
        <td style="padding:16px 20px;border-right:1px solid #e2e8f0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Factuurnummer</p>
          <p style="margin:0;font-size:15px;font-weight:700;color:#1d2f4c;">${factuurNr}</p>
        </td>
        <td style="padding:16px 20px;border-right:1px solid #e2e8f0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Bedrag</p>
          <p style="margin:0;font-size:15px;font-weight:700;color:#1d2f4c;">${bedrag}</p>
        </td>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Vervaldatum</p>
          <p style="margin:0;font-size:15px;font-weight:700;color:#dc2626;">${vervaldatum}</p>
        </td>
      </tr>
      </table>

      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Betaling overmaken? Gebruik de volgende gegevens:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0 0 2px;font-size:12px;color:#6b7280;">IBAN</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#1d2f4c;">NL04 ABNA 0154 5811 43</p>
        <p style="margin:4px 0 2px;font-size:12px;color:#6b7280;">T.n.v.</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#1d2f4c;">Ozvolt Elektrotechniek</p>
      </td></tr>
      </table>

      <hr style="margin:0 0 24px;border:none;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">Met vriendelijke groet,<br>
      <strong style="color:#1d2f4c;">Ahmed Öz</strong><br>
      <span style="color:#6b7280;">Ozvolt Elektrotechniek</span></p>
    </td></tr>
    </table>

  </td></tr>

  <tr><td style="padding:20px 0;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Ozvolt Elektrotechniek · KVK 99837366</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">financien@ozvoltelektro.nl · IBAN: NL04 ABNA 0154 5811 43</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
