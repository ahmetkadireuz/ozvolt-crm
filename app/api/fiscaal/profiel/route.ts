import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { bewaarProfiel, haalProfiel } from '@/lib/fiscaal/profiel'

function getal(v: unknown, min = 0, max = 10_000_000) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.min(max, Math.max(min, n))
}

export async function PUT(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json()
  const jaar = Math.round(getal(body.jaar, 2020, 2100))
  if (!jaar) return NextResponse.json({ error: 'Ongeldig jaar' }, { status: 400 })

  const huidig = await haalProfiel(jaar)
  const startDatum = typeof body.start_datum === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.start_datum)
    ? body.start_datum : huidig.start_datum

  const profiel = {
    ...huidig,
    loon_cumulatief: getal(body.loon_cumulatief),
    loonheffing_cumulatief: getal(body.loonheffing_cumulatief),
    loon_tm_maand: Math.round(getal(body.loon_tm_maand, 0, 12)),
    extra_loon: getal(body.extra_loon),
    start_datum: startDatum,
    uren_loondienst_per_week: getal(body.uren_loondienst_per_week, 0, 80),
    urencriterium: !!body.urencriterium,
    starter: !!body.starter,
    reserve_apart: getal(body.reserve_apart),
  }
  await bewaarProfiel(profiel)
  return NextResponse.json({ profiel })
}
