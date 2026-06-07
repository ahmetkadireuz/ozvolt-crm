import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ebMaakFactuur, ebHaalOfMaakRelatie } from '@/lib/eboekhouden'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  if (!process.env.EBOEKHOUDEN_API_TOKEN) {
    return NextResponse.json({ error: 'e-Boekhouden niet geconfigureerd' }, { status: 503 })
  }

  const { factuurId } = await req.json()
  if (!factuurId) return NextResponse.json({ error: 'factuurId verplicht' }, { status: 400 })

  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_tel, k.type AS klant_type
    FROM facturen f
    JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${Number(factuurId)}
  `
  const factuur = rows[0]
  if (!factuur) return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 })

  if (factuur.moneybird_id) {
    return NextResponse.json({ error: 'Factuur staat al in e-Boekhouden' }, { status: 409 })
  }

  try {
    // Stap 1: Haal of maak relatie aan
    const { relatieId } = await ebHaalOfMaakRelatie({
      naam: factuur.klant_naam,
      email: factuur.klant_email,
      telefoon: factuur.klant_tel,
      type: factuur.klant_type,
    })

    // Stap 2: Maak factuur aan in e-Boekhouden
    const regels = Array.isArray(factuur.regels) ? factuur.regels : []
    const ebFactuur = await ebMaakFactuur({
      relatieId,
      factuurNummer: factuur.factuurnummer,
      factuurdatum: factuur.factuurdatum,
      betalingstermijn: factuur.betalingstermijn ?? 14,
      regels: regels.map((r: any) => ({
        omschrijving: r.omschrijving,
        aantal: Number(r.aantal),
        prijs: Number(r.prijs),
        btw: Number(r.btw ?? factuur.btw_pct ?? 21),
      })),
      notities: factuur.notities,
    })

    // Stap 3: Sla ID op in database (hergebruik moneybird_id kolom)
    await sql`
      UPDATE facturen
      SET moneybird_id = ${String(ebFactuur.id)}, moneybird_url = ${ebFactuur.url}
      WHERE id = ${Number(factuurId)}
    `

    return NextResponse.json({ ok: true, eb_id: ebFactuur.id, eb_url: ebFactuur.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[eboekhouden sync-factuur]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
