import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import MailClient from './MailClient'

export const metadata: Metadata = { title: 'Mail AI' }

export default async function MailPage() {
  const [klanten, klussen] = await Promise.all([
    sql`SELECT id, naam, email FROM klanten WHERE email IS NOT NULL ORDER BY naam`,
    sql`SELECT k.id, k.type_werk, k.omschrijving, kt.naam AS klant_naam, k.klant_id FROM klussen k JOIN klanten kt ON kt.id = k.klant_id ORDER BY k.aangemaakt_op DESC LIMIT 100`,
  ])
  const aiActief = !!process.env.OPENAI_API_KEY
  return <MailClient klanten={klanten as any[]} klussen={klussen as any[]} aiActief={aiActief} />
}
