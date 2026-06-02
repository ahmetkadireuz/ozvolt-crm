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
  const acceptUrl = `${siteUrl}/api/offertes/${offerteId}/accepteren?token=${token}`

  await sql`UPDATE offertes SET accept_token = ${token}, sent_at = NOW(), status = 'gestuurd', bijgewerkt_op = NOW() WHERE id = ${offerteId}`

  try {
    await sendMail({
      to: offerte.klant_email,
      subject: `Uw offerte AM-${offerte.offertenummer} — Ozvolt Elektrotechniek`,
      html: offerteMailHtml({
        klantNaam: offerte.klant_naam,
        offerteNr: `AM-${offerte.offertenummer}`,
        acceptUrl,
      }),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
