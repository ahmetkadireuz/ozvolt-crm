import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { maakBetaalLink } from '@/lib/mollie'

// Maakt Mollie betaallinks aan voor een offerte (volledig of 50/50)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)
  const body = await req.json()
  const split = !!body.betaling_50_50

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam FROM offertes o JOIN klanten k ON k.id = o.klant_id WHERE o.id = ${offerteId}
  `
  const offerte = rows[0]
  if (!offerte) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const regels = Array.isArray(offerte.regels) ? offerte.regels : JSON.parse(offerte.regels ?? '[]')
  const totalen = berekenTotalen(regels, Number(offerte.korting_pct ?? 0), Number(offerte.btw_pct ?? 21))
  const offerteNr = `OZVT-${String(offerte.offertenummer).padStart(4, '0')}`
  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const redirectUrl = `${siteUrl}/offerte/${offerte.accept_token}`

  try {
    if (split) {
      const halveBedrag = totalen.inclBtw / 2
      const [link1, link2] = await Promise.all([
        maakBetaalLink({
          bedrag: halveBedrag,
          omschrijving: `${offerteNr} — eerste termijn (50%) — ${offerte.klant_naam}`,
          redirectUrl,
          metadata: { offerte_id: String(offerteId), termijn: '1' },
        }),
        maakBetaalLink({
          bedrag: halveBedrag,
          omschrijving: `${offerteNr} — tweede termijn (50%) — ${offerte.klant_naam}`,
          redirectUrl,
          metadata: { offerte_id: String(offerteId), termijn: '2' },
        }),
      ])
      await sql`
        UPDATE offertes SET betaling_50_50 = true, betaal_url = ${link1}, betaal_url_2 = ${link2}, bijgewerkt_op = NOW()
        WHERE id = ${offerteId}
      `
      return NextResponse.json({ ok: true, betaal_url: link1, betaal_url_2: link2 })
    } else {
      const link = await maakBetaalLink({
        bedrag: totalen.inclBtw,
        omschrijving: `${offerteNr} — ${offerte.klant_naam}`,
        redirectUrl,
        metadata: { offerte_id: String(offerteId) },
      })
      await sql`
        UPDATE offertes SET betaal_url = ${link}, bijgewerkt_op = NOW() WHERE id = ${offerteId}
      `
      return NextResponse.json({ ok: true, betaal_url: link })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Mollie fout' }, { status: 500 })
  }
}
