import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { mbHaalOfMaakContact, mbMaakBetaalLink } from '@/lib/moneybird'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const factuurId = parseInt(id)

  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_tel, k.type AS klant_type
    FROM facturen f JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${factuurId}
  `
  const factuur = rows[0]
  if (!factuur) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

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
      omschrijving: `Betaalnota ${factuur.factuurnummer} — ${factuur.klant_naam}`,
      bedrag: totalen.inclBtw,
      btwPct: Number(factuur.btw_pct ?? 21),
      referentie: factuur.factuurnummer,
      datum: new Date().toISOString().slice(0, 10),
    })

    await sql`UPDATE facturen SET betaal_url = ${betaalUrl}, bijgewerkt_op = NOW() WHERE id = ${factuurId}`
    return NextResponse.json({ ok: true, betaalUrl })
  } catch (err: any) {
    console.error('[moneybird factuur betaallink]', err)
    return NextResponse.json({ error: err?.message ?? 'Moneybird fout' }, { status: 500 })
  }
}
