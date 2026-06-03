import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import NotificatiesClient from './NotificatiesClient'

export const metadata: Metadata = { title: 'Notificaties' }

export default async function NotificatiesPage() {
  const notifs = await sql`
    SELECT * FROM admin_notifications ORDER BY aangemaakt_op DESC LIMIT 100
  `
  return <NotificatiesClient notifs={notifs as any[]} />
}
