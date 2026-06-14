export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { sql } from '@/lib/db'
import KlantenTable from './KlantenTable'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Klanten' }

export default async function KlantenPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams

  const klanten = q
    ? await sql`
        SELECT k.*,
               (SELECT COUNT(*)::int FROM klussen WHERE klant_id = k.id) AS klus_count,
               (SELECT COUNT(*)::int FROM klussen WHERE klant_id = k.id AND status = 'nieuw') AS nieuw_count
        FROM klanten k
        WHERE k.naam ILIKE ${'%'+q+'%'} OR k.email ILIKE ${'%'+q+'%'} OR k.telefoon ILIKE ${'%'+q+'%'} OR k.locatie ILIKE ${'%'+q+'%'}
        ORDER BY k.aangemaakt_op DESC
      `
    : await sql`
        SELECT k.*,
               (SELECT COUNT(*)::int FROM klussen WHERE klant_id = k.id) AS klus_count,
               (SELECT COUNT(*)::int FROM klussen WHERE klant_id = k.id AND status = 'nieuw') AS nieuw_count
        FROM klanten k
        ORDER BY k.aangemaakt_op DESC
      `

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">Klanten</h1>
        <Link href="/klanten/nieuw" className="btn btn-primary">
          <Icon name="users" size={18} />
          Klant toevoegen
        </Link>
      </div>

      <div className="toolbar">
        <form style={{ display: 'flex', gap: 6 }}>
          <input className="form-ctrl" type="search" name="q" defaultValue={q} placeholder="Zoek op naam, e-mail of locatie…" style={{ width: 280 }} />
          <button type="submit" className="btn btn-ghost btn-sm">Zoeken</button>
        </form>
        <span style={{ marginLeft: 'auto', color: '#8ba8c4', fontSize: '.8rem' }}>{klanten.length} klanten</span>
      </div>

      <KlantenTable klanten={klanten as any[]} />
    </div>
  )
}
