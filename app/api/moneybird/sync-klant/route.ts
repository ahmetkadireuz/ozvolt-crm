import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { mbHaalOfMaakContact } from '@/lib/moneybird'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  if (!process.env.MONEYBIRD_API_TOKEN) {
    return NextResponse.json({ error: 'Moneybird niet geconfigureerd' }, { status: 503 })
  }

  const { klantId } = await req.json()

  const rows = await sql`SELECT * FROM klanten WHERE id = ${Number(klantId)}`
  const klant = rows[0]
  if (!klant) return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })

  try {
    const contact = await mbHaalOfMaakContact({
      id: klant.id,
      naam: klant.naam,
      email: klant.email,
      telefoon: klant.telefoon,
      type: klant.type,
    })

    return NextResponse.json({ ok: true, contact_id: contact.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
