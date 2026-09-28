export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import InkoopClient from './InkoopClient'

export const metadata: Metadata = { title: 'Inkoop' }

// Kolommen één keer per serverinstantie bijwerken, niet bij elk bezoek
let _kolommenOk = false

export default async function InkoopPage() {
  if (!_kolommenOk) {
    await Promise.all([
      sql`ALTER TABLE inkoop_lijsten ADD COLUMN IF NOT EXISTS btw_pct INTEGER NOT NULL DEFAULT 21`.catch(() => {}),
      sql`ALTER TABLE inkoop_items ADD COLUMN IF NOT EXISTS artikelnummer VARCHAR(100)`.catch(() => {}),
    ])
    _kolommenOk = true
  }

  // Alles in één ronde; lijsten/items mogen ontbreken (tabellen nog niet aangemaakt)
  const leeg = () => [] as any[]
  const [lijsten, items, klanten, klussen] = await Promise.all([
    sql`
      SELECT il.*, k.naam AS klant_naam, kl.type_werk AS klus_naam
      FROM inkoop_lijsten il
      LEFT JOIN klanten k ON k.id = il.klant_id
      LEFT JOIN klussen kl ON kl.id = il.klus_id
      ORDER BY il.aangemaakt_op DESC
    `.catch(leeg),
    sql`SELECT * FROM inkoop_items ORDER BY aangemaakt_op ASC`.catch(leeg),
    sql`SELECT id, naam FROM klanten ORDER BY naam`,
    sql`SELECT k.id, k.type_werk, kt.naam AS klant_naam, k.klant_id FROM klussen k JOIN klanten kt ON kt.id = k.klant_id ORDER BY k.aangemaakt_op DESC LIMIT 100`,
  ])

  return <InkoopClient lijsten={lijsten as any[]} items={items as any[]} klanten={klanten as any[]} klussen={klussen as any[]} />
}
