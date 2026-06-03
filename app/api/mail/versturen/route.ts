import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { sendMail } from '@/lib/mail'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { naar, onderwerp, inhoud } = await req.json()
  if (!naar || !onderwerp || !inhoud) return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })

  await sendMail({
    to: naar,
    subject: onderwerp,
    html: inhoud.replace(/\n/g, '<br>'),
  })

  return NextResponse.json({ ok: true })
}
