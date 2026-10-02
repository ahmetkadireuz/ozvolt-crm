import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { testTikkieKoppeling, tikkieOmgeving } from '@/lib/tikkie'

// Testknop op Instellingen → Boekhouding. Toont nooit de waarden van de sleutels.
export async function POST() {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const r = await testTikkieKoppeling()
  return NextResponse.json({ ...r, omgeving: tikkieOmgeving() })
}
