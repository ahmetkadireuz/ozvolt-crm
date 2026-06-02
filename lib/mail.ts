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
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0d1b3e;padding:28px 40px;text-align:center;">
  <div style="color:#fff;font-size:22px;font-weight:900;">OZVOLT</div>
  <div style="color:#8ba8c4;font-size:12px;">Elektrotechniek</div>
</td></tr>
<tr><td style="padding:40px;">
  <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#5b7fa6;text-transform:uppercase;letter-spacing:1.5px;">Persoonlijke offerte</p>
  <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;color:#0d1b3e;">Uw offerte staat klaar</h1>
  <p style="margin:0 0 28px;font-size:15px;color:#4a5568;line-height:1.7;">Beste ${voornaam},<br><br>
  Uw offerte <strong>${offerteNr}</strong> is klaar. Klik op de knop hieronder om de offerte te bekijken en digitaal te ondertekenen.</p>
  <a href="${acceptUrl}" style="display:inline-block;background:#0d1b3e;color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">Offerte bekijken &amp; ondertekenen</a>
  <p style="margin:28px 0 0;font-size:13px;color:#718096;">
    Of kopieer deze link: <a href="${acceptUrl}" style="color:#0d1b3e;">${acceptUrl}</a>
  </p>
  <hr style="margin:32px 0;border:none;border-top:1px solid #e2e8f0;">
  <p style="margin:0;font-size:14px;color:#4a5568;">Met vriendelijke groet,<br><strong>${bedrijfsnaam}</strong></p>
</td></tr>
<tr><td style="background:#0d1b3e;padding:18px 40px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#5b7fa6;">© ${new Date().getFullYear()} ${bedrijfsnaam}</p>
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
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0d1b3e;padding:28px 40px;text-align:center;">
  <div style="color:#fff;font-size:22px;font-weight:900;">OZVOLT</div>
  <div style="color:#8ba8c4;font-size:12px;">Elektrotechniek</div>
</td></tr>
<tr><td style="padding:40px;">
  <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#5b7fa6;text-transform:uppercase;letter-spacing:1.5px;">Factuur</p>
  <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;color:#0d1b3e;">Uw factuur ${factuurNr}</h1>
  <p style="margin:0 0 28px;font-size:15px;color:#4a5568;line-height:1.7;">Beste ${voornaam},<br><br>
  Hierbij ontvangt u factuur <strong>${factuurNr}</strong> voor een totaalbedrag van <strong>${bedrag}</strong>.<br>
  Gelieve dit bedrag vóór <strong>${vervaldatum}</strong> te voldoen.</p>
  ${betaalUrl ? `<a href="${betaalUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">Online betalen</a>` : ''}
  <hr style="margin:32px 0;border:none;border-top:1px solid #e2e8f0;">
  <p style="margin:0;font-size:14px;color:#4a5568;">Met vriendelijke groet,<br><strong>${bedrijfsnaam}</strong></p>
</td></tr>
<tr><td style="background:#0d1b3e;padding:18px 40px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#5b7fa6;">© ${new Date().getFullYear()} ${bedrijfsnaam}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
