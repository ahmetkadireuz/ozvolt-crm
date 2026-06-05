export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { requireSession } from '@/lib/session'
import { sql } from '@/lib/db'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: { default: 'Ozvolt CRM', template: '%s — Ozvolt CRM' },
  description: 'Ozvolt Elektrotechniek CRM-portaal',
}

const NO_SIDEBAR_PATHS = ['/login', '/api', '/offerte/', '/werkafspraak/', '/klant']
const BARE_PATHS = ['/offerte/', '/werkafspraak/', '/klant'] // volledig kaal — eigen layout

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
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
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
