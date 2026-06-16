import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { getKlantSessie } from '@/lib/klant-sessie'
import { mbHaalOfMaakContact, mbMaakBetaalLink } from '@/lib/moneybird'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const klantId = await getKlantSessie()
  if (!klantId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const factuurId = parseInt(id)

  const url = new URL(req.url)
  const termijn = (url.searchParams.get('termijn') === '2' ? 2 : 1) as 1 | 2

  // Defensief: oudere productie-db kan kolommen missen
  try {
    await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_url TEXT`
    await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_url_2 TEXT`
    await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaling_50_50 BOOLEAN DEFAULT FALSE`
  } catch {}

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

  const is50_50 = !!factuur.betaling_50_50

  // Cached URL? Geen dubbele Moneybird-call.
  if (termijn === 1 && factuur.betaal_url) {
    return NextResponse.json({ url: factuur.betaal_url })
  }
  if (termijn === 2 && factuur.betaal_url_2) {
    return NextResponse.json({ url: factuur.betaal_url_2 })
  }
  if (termijn === 2 && !is50_50) {
    return NextResponse.json({ error: 'Geen 50/50 betaalplan actief' }, { status: 400 })
  }

  const regels = Array.isArray(factuur.regels) ? factuur.regels : []
  const totalen = berekenTotalen(regels, 0, factuur.btw_pct)
  const volledigBedrag = totalen.inclBtw
  const bedrag = is50_50 ? volledigBedrag / 2 : volledigBedrag

  try {
    const contact = await mbHaalOfMaakContact({
      id: factuur.klant_id,
      naam: factuur.klant_naam,
      email: factuur.klant_email,
      telefoon: factuur.klant_tel,
      type: factuur.klant_type,
    })

    const omschrijving = is50_50
      ? `Factuur ${factuur.factuurnummer} — ${factuur.klant_naam} (${termijn === 1 ? '1e' : '2e'} termijn 50%)`
      : `Factuur ${factuur.factuurnummer} — ${factuur.klant_naam}`
    const referentie = is50_50 ? `${factuur.factuurnummer}-T${termijn}` : factuur.factuurnummer

    const { betaalUrl } = await mbMaakBetaalLink({
      contactId: contact.id,
      omschrijving,
      bedrag,
      btwPct: Number(factuur.btw_pct ?? 21),
      referentie,
      datum: new Date().toISOString().slice(0, 10),
    })

    if (termijn === 2) {
      await sql`UPDATE facturen SET betaal_url_2 = ${betaalUrl}, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    } else {
      await sql`UPDATE facturen SET betaal_url = ${betaalUrl}, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    }

    return NextResponse.json({ url: betaalUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Moneybird fout'
    console.error('[klant betaal-link]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
