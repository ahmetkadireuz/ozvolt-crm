export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/session'
import { sql } from '@/lib/db'
import Sidebar from '@/components/Sidebar'

export default async function PortaalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  if (!session) redirect('/login')

  let nieuwCount = 0
  let notifCount = 0

  try {
    const [r1, r2] = await Promise.all([
      sql`SELECT COUNT(*)::int AS n FROM klussen WHERE status = 'nieuw'`,
      sql`SELECT COUNT(*)::int AS n FROM admin_notifications WHERE gelezen = FALSE`,
    ])
    nieuwCount = r1[0]?.n ?? 0
    notifCount = r2[0]?.n ?? 0
  } catch {}

  return (
    <>
      <Sidebar nieuwCount={nieuwCount} notifCount={notifCount} />
      <main className="main-content">{children}</main>
    </>
  )
}
