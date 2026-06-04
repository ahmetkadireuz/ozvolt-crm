import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { sendMail } from '@/lib/mail'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params

  const rows = await sql`
    SELECT w.*, k.naam AS klant_naam, k.email AS klant_email
    FROM werkafspraken w JOIN klanten k ON k.id = w.klant_id
    WHERE w.id = ${parseInt(id)}
  `
  const w = rows[0]
  if (!w) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  if (!w.klant_email) return NextResponse.json({ error: 'Klant heeft geen e-mailadres' }, { status: 400 })

  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const acceptUrl = `${siteUrl}/werkafspraak/${w.accept_token}`
  const afspraakNr = `OZWA-${String(w.afspraaknummer).padStart(4, '0')}`
  const voornaam = w.klant_naam.split(' ')[0]

  await sql`UPDATE werkafspraken SET sent_at = NOW(), status = 'gestuurd', bijgewerkt_op = NOW() WHERE id = ${parseInt(id)}`

  const html = `<!DOCTYPE html>
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
  <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#5b7fa6;text-transform:uppercase;letter-spacing:1.5px;">Werkafspraken</p>
  <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;color:#0d1b3e;">Uw werkafspraken staan klaar</h1>
  <p style="margin:0 0 28px;font-size:15px;color:#4a5568;line-height:1.7;">Beste ${voornaam},<br><br>
  Hierbij vindt u de werkafspraken (${afspraakNr}) die wij samen hebben gemaakt. Klik op de knop hieronder om de afspraken te bekijken en digitaal te bevestigen.</p>
  <a href="${acceptUrl}" style="display:inline-block;background:#0d1b3e;color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">Afspraken bekijken &amp; bevestigen</a>
  <p style="margin:28px 0 0;font-size:13px;color:#718096;">Of kopieer deze link: <a href="${acceptUrl}" style="color:#0d1b3e;">${acceptUrl}</a></p>
  <hr style="margin:32px 0;border:none;border-top:1px solid #e2e8f0;">
  <p style="margin:0;font-size:14px;color:#4a5568;">Met vriendelijke groet,<br><strong>Ozvolt Elektrotechniek</strong></p>
</td></tr>
<tr><td style="background:#0d1b3e;padding:18px 40px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#5b7fa6;">© ${new Date().getFullYear()} Ozvolt Elektrotechniek</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  try {
    await sendMail({
      to: w.klant_email,
      subject: `Werkafspraken ${afspraakNr} — Ozvolt Elektrotechniek`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
