export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import './globals.css'
import { requireSession } from '@/lib/session'
import { sql } from '@/lib/db'
import Sidebar from '@/components/Sidebar'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: { default: 'Ozvolt CRM', template: '%s — Ozvolt CRM' },
  description: 'Ozvolt Elektrotechniek CRM-portaal',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {showSidebar && <Sidebar nieuwCount={nieuwCount} notifCount={notifCount} />}
        <main className={showSidebar ? 'main-content' : ''}>
          {children}
        </main>
      </body>
    </html>
  )
}
