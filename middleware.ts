import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/api/webhooks']
const SESSION_COOKIE = 'ozvolt_crm_session'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret-change-in-production')
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete(SESSION_COOKIE)
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons).*)'],
}
