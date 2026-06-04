import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { sendMail, offerteMailHtml } from '@/lib/mail'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)

  const rows = await sql`
    SELECT o.*, kt.naam AS klant_naam, kt.email AS klant_email
    FROM offertes o JOIN klanten kt ON kt.id = o.klant_id
    WHERE o.id = ${offerteId}
  `
  const offerte = rows[0]
  if (!offerte) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  if (!offerte.klant_email) return NextResponse.json({ error: 'Klant heeft geen e-mailadres' }, { status: 400 })

  const token = offerte.accept_token || crypto.randomBytes(32).toString('hex')
  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const acceptUrl = `${siteUrl}/offerte/${token}`

  await sql`UPDATE offertes SET accept_token = ${token}, sent_at = NOW(), status = 'gestuurd', bijgewerkt_op = NOW() WHERE id = ${offerteId}`

  try {
    const regels = Array.isArray(offerte.regels) ? offerte.regels : []
    const { berekenTotalen, formatEuro } = await import('@/lib/db')
    const totalen = berekenTotalen(regels, Number(offerte.korting_pct ?? 0), Number(offerte.btw_pct ?? 21))
    const offerteNr = `OZVT-${String(offerte.offertenummer).padStart(4,'0')}`

    await sendMail({
      to: offerte.klant_email,
      subject: `Uw offerte ${offerteNr} — Ozvolt Elektrotechniek`,
      html: offerteMailHtml({
        klantNaam: offerte.klant_naam,
        offerteNr,
        acceptUrl,
        betaalUrl: offerte.betaal_url || undefined,
        totaal: formatEuro(totalen.inclBtw),
      }),
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[mail/offerte versturen]', err)
    const msg = err?.message ?? String(err)
    return NextResponse.json({ error: msg, detail: 'Controleer SMTP_HOST, SMTP_USER, SMTP_PASS env vars in Vercel' }, { status: 500 })
  }
}
