import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/api/webhooks', '/offerte', '/werkafspraak', '/api/offertes/accepteren', '/api/afspraken/accepteren']
const SESSION_COOKIE = 'ozvolt_crm_session'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // Altijd het pad doorgeven aan de layout via header
  const res = NextResponse.next()
  res.headers.set('x-pathname', pathname)

  if (isPublic) return res

  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret-change-in-production')
    await jwtVerify(token, secret)
    return res
  } catch {
    const redirect = NextResponse.redirect(new URL('/login', req.url))
    redirect.cookies.delete(SESSION_COOKIE)
    return redirect
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.webp|.*\\.gif).*)'],
}
