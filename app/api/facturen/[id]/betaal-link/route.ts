import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { getKlantSessie } from '@/lib/klant-sessie'
import { mbHaalOfMaakContact, mbMaakBetaalLink } from '@/lib/moneybird'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const klantId = await getKlantSessie()
  if (!klantId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const factuurId = parseInt(id)

  // Verificeer dat deze factuur van deze klant is
  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_tel, k.type AS klant_type
    FROM facturen f JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${factuurId} AND f.klant_id = ${klantId}
  `
  const factuur = rows[0]
  if (!factuur) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  if (factuur.status === 'betaald') {
    return NextResponse.json({ error: 'Factuur is al betaald' }, { status: 400 })
  }

  const regels = Array.isArray(factuur.regels) ? factuur.regels : []
  const totalen = berekenTotalen(regels, 0, factuur.btw_pct)

  try {
    const contact = await mbHaalOfMaakContact({
      id: factuur.klant_id,
      naam: factuur.klant_naam,
      email: factuur.klant_email,
      telefoon: factuur.klant_tel,
      type: factuur.klant_type,
    })

    const { betaalUrl } = await mbMaakBetaalLink({
      contactId: contact.id,
      omschrijving: `Factuur ${factuur.factuurnummer} — ${factuur.klant_naam}`,
      bedrag: totalen.inclBtw,
      btwPct: Number(factuur.btw_pct ?? 21),
      referentie: factuur.factuurnummer,
      datum: new Date().toISOString().slice(0, 10),
    })

    await sql`
      UPDATE facturen SET betaal_url = ${betaalUrl}, bijgewerkt_op = NOW()
      WHERE id = ${factuurId}
    `

    return NextResponse.json({ url: betaalUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Moneybird fout'
    console.error('[klant betaal-link]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
