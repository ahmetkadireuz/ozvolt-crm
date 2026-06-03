import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import InkoopClient from './InkoopClient'

export const metadata: Metadata = { title: 'Inkoop' }

export default async function InkoopPage() {
  let lijsten: any[] = []
  let items: any[] = []

  try {
    [lijsten, items] = await Promise.all([
      sql`
        SELECT il.*, k.naam AS klant_naam, kl.type_werk AS klus_naam
        FROM inkoop_lijsten il
        LEFT JOIN klanten k ON k.id = il.klant_id
        LEFT JOIN klussen kl ON kl.id = il.klus_id
        ORDER BY il.aangemaakt_op DESC
      `,
      sql`SELECT * FROM inkoop_items ORDER BY aangemaakt_op ASC`,
    ])
  } catch {
    // Tabellen nog niet aangemaakt
  }

  const [klanten, klussen] = await Promise.all([
    sql`SELECT id, naam FROM klanten ORDER BY naam`,
    sql`SELECT k.id, k.type_werk, kt.naam AS klant_naam, k.klant_id FROM klussen k JOIN klanten kt ON kt.id = k.klant_id ORDER BY k.aangemaakt_op DESC LIMIT 100`,
  ])

  return <InkoopClient lijsten={lijsten} items={items} klanten={klanten as any[]} klussen={klussen as any[]} />
}
