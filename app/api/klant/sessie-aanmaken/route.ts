import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { maakKlantSessie, veiligKlantPad } from '@/lib/klant-sessie'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { klantId, naar } = await req.json()
  if (!klantId) return NextResponse.json({ error: 'klantId vereist' }, { status: 400 })

  const token = await maakKlantSessie(Number(klantId))
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://portaal.ozvoltelektro.nl'
  const pad = veiligKlantPad(naar)
  const link = `${base}/api/klant/login?token=${token}${pad ? `&naar=${encodeURIComponent(pad)}` : ''}`

  return NextResponse.json({ link })
}
