import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { maakKlantSessie } from '@/lib/klant-sessie'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { klantId } = await req.json()
  if (!klantId) return NextResponse.json({ error: 'klantId vereist' }, { status: 400 })

  const token = await maakKlantSessie(Number(klantId))
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://portaal.ozvoltelektro.nl'
  const link = `${base}/api/klant/login?token=${token}`

  return NextResponse.json({ link })
}
