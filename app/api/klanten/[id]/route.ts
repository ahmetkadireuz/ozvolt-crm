import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  const klantId = parseInt(id)
  const body = await req.json()

  const tekst = (v: unknown, max = 255) => {
    const s = String(v ?? '').trim()
    return s ? s.slice(0, max) : null
  }

  // Basisvelden bestaan altijd — deze update mag niet afhangen van migraties.
  await sql`
    UPDATE klanten SET
      naam     = ${String(body.naam ?? '').slice(0, 255)},
      email    = ${tekst(body.email)},
      telefoon = ${tekst(body.telefoon, 50)},
      locatie  = ${tekst(body.locatie)},
      type     = ${['Particulier', 'Zakelijk'].includes(body.type) ? body.type : 'Particulier'}
    WHERE id = ${klantId}
  `

  // Kolommen uit latere migraties. Ontbreken ze, dan is de basis al opgeslagen
  // en zeggen we expliciet welke migratie nog moet lopen.
  const ontbreekt: string[] = []

  try {
    await sql`UPDATE klanten SET status_notitie = ${tekst(body.status_notitie, 2000)} WHERE id = ${klantId}`
  } catch {
    ontbreekt.push('status_notitie')
  }

  try {
    await sql`
      UPDATE klanten SET
        factuur_naam     = ${tekst(body.factuur_naam)},
        factuur_adres    = ${tekst(body.factuur_adres)},
        factuur_postcode = ${tekst(body.factuur_postcode, 16)},
        factuur_plaats   = ${tekst(body.factuur_plaats, 120)}
      WHERE id = ${klantId}
    `
  } catch {
    ontbreekt.push('db/klant-factuurgegevens.sql')
  }

  if (ontbreekt.length) {
    return NextResponse.json({
      ok: false,
      error: `Deels opgeslagen. Nog niet uitgevoerd in de database: ${ontbreekt.join(', ')}`,
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const { id } = await params
  await sql`DELETE FROM klanten WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
