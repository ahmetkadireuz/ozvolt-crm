import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import nodemailer from 'nodemailer'

export async function GET() {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const config = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    fromName: process.env.SMTP_FROM_NAME,
    hasPass: !!process.env.SMTP_PASS,
    siteUrl: process.env.SITE_URL,
  }

  // Probeer verbinding
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    })

    await transporter.verify()
    return NextResponse.json({ ok: true, message: 'SMTP verbinding geslaagd ✅', config })
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message ?? String(err),
      code: err?.code,
      config,
    })
  }
}
