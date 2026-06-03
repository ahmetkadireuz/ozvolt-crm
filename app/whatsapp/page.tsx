import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import WhatsAppClient from './WhatsAppClient'

export const metadata: Metadata = { title: 'WhatsApp' }

export default async function WhatsAppPage() {
  const [berichten, klanten] = await Promise.all([
    sql`
      SELECT w.*, k.naam AS klant_naam, k.telefoon AS klant_tel, kl.type_werk AS klus_naam
      FROM whatsapp_messages w
      LEFT JOIN klanten k ON k.id = w.klant_id
      LEFT JOIN klussen kl ON kl.id = w.klus_id
      ORDER BY w.aangemaakt_op DESC
      LIMIT 100
    `,
    sql`SELECT id, naam, telefoon FROM klanten WHERE telefoon IS NOT NULL ORDER BY naam`,
  ])

  const apiActief = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)

  return <WhatsAppClient berichten={berichten as any[]} klanten={klanten as any[]} apiActief={apiActief} />
}
