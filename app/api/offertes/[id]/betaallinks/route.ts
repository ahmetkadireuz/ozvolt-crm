import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { mbHaalOfMaakContact, mbMaakBetaalLink } from '@/lib/moneybird'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)
  const body = await req.json()
  const split = !!body.betaling_50_50

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_tel, k.type AS klant_type
    FROM offertes o JOIN klanten k ON k.id = o.klant_id
    WHERE o.id = ${offerteId}
  `
  const offerte = rows[0]
  if (!offerte) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const regels = Array.isArray(offerte.regels) ? offerte.regels : JSON.parse(offerte.regels ?? '[]')
  const totalen = berekenTotalen(regels, Number(offerte.korting_pct ?? 0), Number(offerte.btw_pct ?? 21))
  const offerteNr = `OZVT-${String(offerte.offertenummer).padStart(4, '0')}`
  const btwPct = Number(offerte.btw_pct ?? 21)
  const datum = new Date().toISOString().slice(0, 10)

  try {
    const contact = await mbHaalOfMaakContact({
      id: offerte.klant_id,
      naam: offerte.klant_naam,
      email: offerte.klant_email,
      telefoon: offerte.klant_tel,
      type: offerte.klant_type,
    })

    if (split) {
      const halveBedrag = totalen.inclBtw / 2

      const [link1, link2] = await Promise.all([
        mbMaakBetaalLink({
          contactId: contact.id,
          omschrijving: `${offerteNr} — eerste termijn (50%) — ${offerte.klant_naam}`,
          bedrag: halveBedrag,
          btwPct,
          referentie: `${offerteNr}-T1`,
          datum,
        }),
        mbMaakBetaalLink({
          contactId: contact.id,
          omschrijving: `${offerteNr} — tweede termijn (50%) — ${offerte.klant_naam}`,
          bedrag: halveBedrag,
          btwPct,
          referentie: `${offerteNr}-T2`,
          datum,
        }),
      ])

      await sql`
        UPDATE offertes SET
          betaling_50_50 = true,
          betaal_url = ${link1.betaalUrl},
          betaal_url_2 = ${link2.betaalUrl},
          bijgewerkt_op = NOW()
        WHERE id = ${offerteId}
      `
      return NextResponse.json({ ok: true, betaal_url: link1.betaalUrl, betaal_url_2: link2.betaalUrl })
    } else {
      const { betaalUrl } = await mbMaakBetaalLink({
        contactId: contact.id,
        omschrijving: `${offerteNr} — ${offerte.klant_naam}`,
        bedrag: totalen.inclBtw,
        btwPct,
        referentie: offerteNr,
        datum,
      })

      await sql`
        UPDATE offertes SET betaal_url = ${betaalUrl}, bijgewerkt_op = NOW() WHERE id = ${offerteId}
      `
      return NextResponse.json({ ok: true, betaal_url: betaalUrl })
    }
  } catch (err: any) {
    console.error('[moneybird betaallinks offerte]', err)
    return NextResponse.json({ error: err?.message ?? 'Moneybird fout' }, { status: 500 })
  }
}
