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

const NO_SIDEBAR_PATHS = ['/login', '/api']

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? headersList.get('x-invoke-path') ?? ''

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
