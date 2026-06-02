import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { sendMail, factuurMailHtml } from '@/lib/mail'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const factuurId = parseInt(id)

  const rows = await sql`
    SELECT f.*, kt.naam AS klant_naam, kt.email AS klant_email
    FROM facturen f JOIN klanten kt ON kt.id = f.klant_id
    WHERE f.id = ${factuurId}
  `
  const factuur = rows[0]
  if (!factuur) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  if (!factuur.klant_email) return NextResponse.json({ error: 'Geen e-mailadres' }, { status: 400 })

  const totalen = berekenTotalen(factuur.regels ?? [], 0, factuur.btw_pct)
  const vervalDatum = new Date(factuur.factuurdatum)
  vervalDatum.setDate(vervalDatum.getDate() + (factuur.betalingstermijn ?? 14))

  await sql`UPDATE facturen SET status = 'verstuurd', bijgewerkt_op = NOW() WHERE id = ${factuurId}`

  try {
    await sendMail({
      to: factuur.klant_email,
      subject: `Factuur ${factuur.factuurnummer} — Ozvolt Elektrotechniek`,
      html: factuurMailHtml({
        klantNaam: factuur.klant_naam,
        factuurNr: factuur.factuurnummer,
        bedrag: formatEuro(totalen.inclBtw),
        vervaldatum: vervalDatum.toLocaleDateString('nl-NL'),
      }),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
