import { NextRequest, NextResponse } from 'next/server'
import { valideerEnGebruikKlantToken, maakKlantSessie, veiligKlantPad, KLANT_COOKIE, SESSIE_DAGEN } from '@/lib/klant-sessie'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/klant/geen-toegang', req.url))
  }

  const klantId = await valideerEnGebruikKlantToken(token)
  if (!klantId) {
    return NextResponse.redirect(new URL('/klant/geen-toegang', req.url))
  }

  // Eigen sessietoken van 30 dagen — het link-token verloopt al na 24 uur
  const sessieToken = await maakKlantSessie(klantId, SESSIE_DAGEN * 24)

  const naar = veiligKlantPad(req.nextUrl.searchParams.get('naar')) ?? '/klant/dashboard'
  const res = NextResponse.redirect(new URL(naar, req.url))
  res.cookies.set(KLANT_COOKIE, sessieToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSIE_DAGEN * 86400,
    path: '/',
  })
  return res
}
