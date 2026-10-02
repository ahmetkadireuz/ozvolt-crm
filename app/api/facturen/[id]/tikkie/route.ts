import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { tikkieAan, zorgVoorTikkie, verwerkTikkieBetaling, ensureTikkieKolommen } from '@/lib/tikkie'

// Tikkie voor één (deel)factuur: aanmaken/vernieuwen of de betaling controleren (alleen admin)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  if (!tikkieAan()) return NextResponse.json({ error: 'Tikkie is niet ingesteld (TIKKIE_API_KEY / TIKKIE_APP_TOKEN)' }, { status: 400 })
  const { id } = await params
  const factuurId = parseInt(id)
  if (isNaN(factuurId)) return NextResponse.json({ error: 'Ongeldig id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const actie: string = body?.actie ?? 'aanmaken'

  try {
    if (actie === 'controleren') {
      await ensureTikkieKolommen()
      const rows = await sql`SELECT tikkie_token FROM facturen WHERE id = ${factuurId}`
      if (!rows[0]) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
      if (!rows[0].tikkie_token) return NextResponse.json({ error: 'Deze factuur heeft nog geen Tikkie' }, { status: 400 })
      const r = await verwerkTikkieBetaling(rows[0].tikkie_token)
      return NextResponse.json({ ok: true, betaald: r.betaald, betaaldCenten: r.betaaldCenten })
    }

    const r = await zorgVoorTikkie(factuurId, { forceer: !!body?.nieuw })
    return NextResponse.json({ ok: true, url: r.url, nieuw: r.nieuw })
  } catch (err: any) {
    console.error('[tikkie factuur]', err?.message ?? err)
    const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? 400 : 502
    return NextResponse.json({ error: err?.message ?? 'Tikkie fout' }, { status })
  }
}
