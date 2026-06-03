import { NextRequest, NextResponse } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { mbHaalOfMaakContact, mbMaakFactuur, mbVerstuurFactuur } from '@/lib/moneybird'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  if (!process.env.MONEYBIRD_API_TOKEN || !process.env.MONEYBIRD_ADMIN_ID) {
    return NextResponse.json({ error: 'Moneybird niet geconfigureerd' }, { status: 503 })
  }

  const { factuurId } = await req.json()
  if (!factuurId) return NextResponse.json({ error: 'factuurId verplicht' }, { status: 400 })

  // Haal factuur op
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
    return NextResponse.json({ error: 'Factuur staat al in Moneybird', moneybird_id: factuur.moneybird_id }, { status: 409 })
  }

  try {
    // Stap 1: Haal of maak contact aan
    const contact = await mbHaalOfMaakContact({
      id: factuur.klant_id,
      naam: factuur.klant_naam,
      email: factuur.klant_email,
      telefoon: factuur.klant_tel,
      type: factuur.klant_type,
    })

    // Stap 2: Maak factuur aan in Moneybird
    const regels = Array.isArray(factuur.regels) ? factuur.regels : []
    const mbFactuur = await mbMaakFactuur({
      contactId: contact.id,
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

    // Stap 3: Sla Moneybird ID op in database
    await sql`
      UPDATE facturen
      SET moneybird_id = ${mbFactuur.id}, moneybird_url = ${mbFactuur.url ?? null}
      WHERE id = ${Number(factuurId)}
    `

    return NextResponse.json({
      ok: true,
      moneybird_id: mbFactuur.id,
      moneybird_url: mbFactuur.url,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[moneybird sync-factuur]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
