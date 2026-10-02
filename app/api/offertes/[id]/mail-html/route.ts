import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { berekenTotalen, formatEuro } from '@/lib/utils'
import { offerteMailHtmlV2 } from '@/lib/mail'
import crypto from 'crypto'

// Levert de offerte-mail als HTML om te kopiëren naar Outlook / Apple Mail.
// Wijzigt geen status of sent_at — alleen de accept_token wordt zo nodig aangemaakt.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)

  const rows = await sql`
    SELECT o.*, kt.naam AS klant_naam, kt.email AS klant_email, ks.type_werk AS klus_titel
    FROM offertes o
    JOIN klanten kt ON kt.id = o.klant_id
    LEFT JOIN klussen ks ON ks.id = o.klus_id
    WHERE o.id = ${offerteId}
  `
  const offerte = rows[0]
  if (!offerte) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  let token: string = offerte.accept_token
  if (!token) {
    const nieuw = crypto.randomBytes(32).toString('hex')
    const upd = await sql`
      UPDATE offertes SET accept_token = COALESCE(accept_token, ${nieuw})
      WHERE id = ${offerteId} RETURNING accept_token
    `
    token = upd[0].accept_token
  }

  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const acceptUrl = `${siteUrl}/offerte/${token}`
  const offerteNr = `OZVT-${String(offerte.offertenummer).padStart(4, '0')}`
  const regels = Array.isArray(offerte.regels) ? offerte.regels : []
  const totalen = berekenTotalen(regels, Number(offerte.korting_pct ?? 0), Number(offerte.btw_pct ?? 21))
  const geldigTot = offerte.geldig_tot
    ? new Date(offerte.geldig_tot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' })
    : null

  const html = offerteMailHtmlV2({
    klantNaam: offerte.klant_naam ?? '',
    offerteNr,
    titel: offerte.klus_titel || null,
    totaal: formatEuro(totalen.inclBtw),
    geldigTot,
    acceptUrl,
  })

  return NextResponse.json({
    html,
    onderwerp: `Uw offerte ${offerteNr} — Ozvolt Elektrotechniek`,
    aan: offerte.klant_email || null,
  })
}
