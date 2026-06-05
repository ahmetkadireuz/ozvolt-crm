import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { getKlantSessie } from '@/lib/klant-sessie'
import { maakBetaalLink } from '@/lib/mollie'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const klantId = await getKlantSessie()
  if (!klantId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await params
  const factuurId = parseInt(id)

  // Verificeer dat deze factuur van deze klant is
  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam
    FROM facturen f JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${factuurId} AND f.klant_id = ${klantId}
  `
  const factuur = rows[0]
  if (!factuur) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  if (factuur.mollie_status === 'paid' || factuur.status === 'betaald') {
    return NextResponse.json({ error: 'Factuur is al betaald' }, { status: 400 })
  }

  const regels = Array.isArray(factuur.regels) ? factuur.regels : []
  const totalen = berekenTotalen(regels, 0, factuur.btw_pct)
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://portaal.ozvoltelektro.nl'

  try {
    const url = await maakBetaalLink({
      bedrag: totalen.inclBtw,
      omschrijving: `Factuur ${factuur.factuurnummer} — ${factuur.klant_naam}`,
      redirectUrl: `${base}/klant/factuur/${factuurId}?betaald=1`,
      webhookUrl: `${base}/api/mollie/klant-webhook`,
      metadata: { factuurId: String(factuurId) },
    })

    await sql`
      UPDATE facturen SET mollie_status = 'open', bijgewerkt_op = NOW()
      WHERE id = ${factuurId}
    `

    return NextResponse.json({ url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Mollie fout'
    console.error('[klant betaal-link]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
