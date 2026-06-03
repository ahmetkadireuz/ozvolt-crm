import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import GroepenverklaringClient from './GroepenverklaringClient'

export const metadata: Metadata = { title: 'Groepenverklaring' }

export default async function GroepenverklaringPage() {
  const klanten = await sql`SELECT id, naam, locatie FROM klanten ORDER BY naam`
  const klussen = await sql`SELECT k.id, k.type_werk, k.klant_id, kt.naam AS klant_naam, kt.locatie FROM klussen k JOIN klanten kt ON kt.id = k.klant_id ORDER BY k.aangemaakt_op DESC LIMIT 100`

  return <GroepenverklaringClient klanten={klanten as any[]} klussen={klussen as any[]} />
}
