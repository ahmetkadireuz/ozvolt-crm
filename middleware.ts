import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Routes volledig publiek toegankelijk (geen sessie vereist)
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/webhooks',
  '/offerte',
  '/werkafspraak',
  '/api/offertes/accepteren',
  '/api/afspraken/accepteren',
  '/klant/login',
  '/api/klant/login',
  '/klant/geen-toegang',
  '/api/moneybird/webhook', // Moneybird betaal-status webhook (geen sessie)
]

// Routes die een klant-sessie vereisen (ozvolt_klant cookie)
const KLANT_PATHS = [
  '/klant/',           // alle klantportaal pagina's
  '/api/klant/profiel',
  '/api/klant/groenverklaring',
  '/api/klant/rapport/tekenen',
  '/api/klant/meerwerk/accepteren',
]

// Controleert of het pad een klant-betaallink is: /api/facturen/[id]/betaal-link
function isKlantBetaalLink(pathname: string) {
  return /^\/api\/facturen\/\d+\/betaal-link$/.test(pathname)
}

// PDF-routes: toegankelijk met admin-sessie óf klant-sessie (eigendom wordt in de route gecontroleerd)
function isPdfRoute(pathname: string) {
  return /^\/api\/(offertes|facturen)\/\d+\/pdf$/.test(pathname)
}

// Exacte match of een sub-pad — '/offerte' mag niet '/offertes' openzetten
function matchPad(pathname: string, p: string) {
  return pathname === p || pathname.startsWith(p.endsWith('/') ? p : p + '/')
}

const SESSION_COOKIE = 'ozvolt_crm_session'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isStaticFile = /\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)$/i.test(pathname)
  const isPublic = isStaticFile || PUBLIC_PATHS.some(p => matchPad(pathname, p))

  const res = NextResponse.next()
  res.headers.set('x-pathname', pathname)

  if (isPublic) return res

  // Klantportaal routes — alleen ozvolt_klant cookie vereist
  const isKlantRoute =
    pathname === '/klant' ||
    KLANT_PATHS.some(p => matchPad(pathname, p)) ||
    isKlantBetaalLink(pathname) ||
    (isPdfRoute(pathname) && !req.cookies.get(SESSION_COOKIE) && !!req.cookies.get('ozvolt_klant'))

  if (isKlantRoute) {
    const klantToken = req.cookies.get('ozvolt_klant')?.value
    if (!klantToken) {
      // API call → 401, paginabezoek → redirect
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/klant/geen-toegang', req.url))
    }
    return res
  }

  // CRM routes — JWT sessie vereist
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    // Zelfde sleutel als lib/session.ts; in productie zonder SESSION_SECRET nooit een bekende fallback accepteren
    const s = process.env.SESSION_SECRET
    if (!s && process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET ontbreekt')
    const secret = new TextEncoder().encode(s || 'dev-secret-change-in-production-min-32-chars!!')
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
