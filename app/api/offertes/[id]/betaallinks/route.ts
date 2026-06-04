import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { mbHaalOfMaakContact, mbMaakBetaalLink } from '@/lib/moneybird'

// Maakt Moneybird betaallinks aan voor een offerte (volledig of 50/50)
// Geld gaat direct naar ABN AMRO via Ponto-koppeling — geen tussenpersoon
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const offerteId = parseInt(id)
  const body = await req.json()
  const split = !!body.betaling_50_50

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email, k.telefoon AS klant_telefoon, k.type AS klant_type
    FROM offertes o JOIN klanten k ON k.id = o.klant_id
    WHERE o.id = ${offerteId}
  `
  const offerte = rows[0]
  if (!offerte) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const regels = Array.isArray(offerte.regels) ? offerte.regels : JSON.parse(offerte.regels ?? '[]')
  const totalen = berekenTotalen(regels, Number(offerte.korting_pct ?? 0), Number(offerte.btw_pct ?? 21))
  const offerteNr = `OZVT-${String(offerte.offertenummer).padStart(4, '0')}`
  const datum = offerte.datum?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)

  try {
    // Haal of maak Moneybird contact
    const contact = await mbHaalOfMaakContact({
      id: offerte.klant_id,
      naam: offerte.klant_naam,
      email: offerte.klant_email,
      telefoon: offerte.klant_telefoon,
      type: offerte.klant_type,
    })

    if (split) {
      const halveBedrag = totalen.inclBtw / 2

      const [result1, result2] = await Promise.all([
        mbMaakBetaalLink({
          contactId: contact.id,
          omschrijving: `${offerteNr} — eerste termijn (50%) — ${offerte.klant_naam}`,
          bedrag: halveBedrag,
          btwPct: Number(offerte.btw_pct ?? 21),
          referentie: `${offerteNr}-T1`,
          datum,
        }),
        mbMaakBetaalLink({
          contactId: contact.id,
          omschrijving: `${offerteNr} — tweede termijn (50%) — ${offerte.klant_naam}`,
          bedrag: halveBedrag,
          btwPct: Number(offerte.btw_pct ?? 21),
          referentie: `${offerteNr}-T2`,
          datum,
        }),
      ])

      await sql`
        UPDATE offertes SET
          betaling_50_50 = true,
          betaal_url = ${result1.betaalUrl},
          betaal_url_2 = ${result2.betaalUrl},
          bijgewerkt_op = NOW()
        WHERE id = ${offerteId}
      `
      return NextResponse.json({ ok: true, betaal_url: result1.betaalUrl, betaal_url_2: result2.betaalUrl })
    } else {
      const result = await mbMaakBetaalLink({
        contactId: contact.id,
        omschrijving: `${offerteNr} — ${offerte.klant_naam}`,
        bedrag: totalen.inclBtw,
        btwPct: Number(offerte.btw_pct ?? 21),
        referentie: offerteNr,
        datum,
      })

      await sql`
        UPDATE offertes SET betaal_url = ${result.betaalUrl}, bijgewerkt_op = NOW() WHERE id = ${offerteId}
      `
      return NextResponse.json({ ok: true, betaal_url: result.betaalUrl })
    }
  } catch (err: any) {
    console.error('[betaallinks]', err)
    return NextResponse.json({ error: err.message ?? 'Moneybird fout' }, { status: 500 })
  }
}
