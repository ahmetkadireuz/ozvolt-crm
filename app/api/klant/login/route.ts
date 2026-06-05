import { NextRequest, NextResponse } from 'next/server'
import { valideerEnGebruikKlantToken, KLANT_COOKIE } from '@/lib/klant-sessie'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/klant/geen-toegang', req.url))
  }

  const klantId = await valideerEnGebruikKlantToken(token)
  if (!klantId) {
    return NextResponse.redirect(new URL('/klant/geen-toegang', req.url))
  }

  const res = NextResponse.redirect(new URL('/klant/dashboard', req.url))
  res.cookies.set(KLANT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 86400,
    path: '/',
  })
  return res
}
