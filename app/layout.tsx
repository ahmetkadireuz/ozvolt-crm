export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import './globals.css'
import { requireSession } from '@/lib/session'
import { sql } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import MobileFab from '@/components/MobileFab'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: { default: 'Ozvolt CRM', template: '%s — Ozvolt CRM' },
  description: 'Ozvolt Elektrotechniek CRM-portaal',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
  manifest: '/manifest.webmanifest',
  themeColor: '#0d1b3e',
  appleWebApp: {
    capable: true,
    title: 'Ozvolt',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

const NO_SIDEBAR_PATHS = ['/login', '/api', '/offerte/', '/werkafspraak/', '/klant', '/rapporten/']
const BARE_PATHS = ['/offerte/', '/werkafspraak/', '/klant', '/rapporten/'] // volledig kaal — eigen layout

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? headersList.get('x-invoke-path') ?? ''

  const isBare = BARE_PATHS.some(p => pathname.startsWith(p))
  if (isBare) return <>{children}</>

  const showSidebar = !NO_SIDEBAR_PATHS.some(p => pathname.startsWith(p))

  let nieuwCount = 0
  let notifCount = 0

  if (showSidebar) {
    try {
      const session = await requireSession()
      if (session) {
        const [r1, r2] = await Promise.all([
          sql`SELECT COUNT(*)::int AS n FROM klussen WHERE status = 'nieuw'`,
          sql`SELECT COUNT(*)::int AS n FROM admin_notifications WHERE gelezen = FALSE`,
        ])
        nieuwCount = r1[0]?.n ?? 0
        notifCount = r2[0]?.n ?? 0
      }
    } catch {}
  }

  return (
    <html lang="nl" className={inter.variable}>
      <body>
        {showSidebar && <Sidebar nieuwCount={nieuwCount} notifCount={notifCount} />}
        <main className={showSidebar ? 'main-content' : ''}>
          {children}
        </main>
        {showSidebar && <MobileFab />}
      </body>
    </html>
  )
}
