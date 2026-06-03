export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import KostenClient from './KostenClient'

export const metadata: Metadata = { title: 'Kosten' }

export default async function KostenPage() {
  const [kosten, klanten, klussen] = await Promise.all([
    sql`
      SELECT ko.*, k.naam AS klant_naam, kl.type_werk AS klus_naam
      FROM kosten ko
      LEFT JOIN klanten k ON k.id = ko.klant_id
      LEFT JOIN klussen kl ON kl.id = ko.klus_id
      ORDER BY ko.datum DESC
      LIMIT 200
    `,
    sql`SELECT id, naam FROM klanten ORDER BY naam`,
    sql`SELECT k.id, k.type_werk, kt.naam AS klant_naam FROM klussen k JOIN klanten kt ON kt.id = k.klant_id ORDER BY k.aangemaakt_op DESC LIMIT 100`,
  ])

  return <KostenClient kosten={kosten as any[]} klanten={klanten as any[]} klussen={klussen as any[]} />
}
