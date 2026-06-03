export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import AgendaClient from './AgendaClient'

export const metadata: Metadata = { title: 'Agenda' }

export default async function AgendaPage() {
  const [items, klanten, klussen] = await Promise.all([
    sql`
      SELECT a.*, k.naam AS klant_naam, kl.type_werk AS klus_naam
      FROM agenda_items a
      LEFT JOIN klanten k ON k.id = a.klant_id
      LEFT JOIN klussen kl ON kl.id = a.klus_id
      ORDER BY a.datum_start ASC
    `,
    sql`SELECT id, naam FROM klanten ORDER BY naam`,
    sql`SELECT id, type_werk, klant_id FROM klussen ORDER BY aangemaakt_op DESC LIMIT 200`,
  ])

  return <AgendaClient items={items as any[]} klanten={klanten as any[]} klussen={klussen as any[]} />
}
