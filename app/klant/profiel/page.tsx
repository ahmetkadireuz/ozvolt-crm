export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql } from '@/lib/db'
import ProfielForm from './ProfielForm'

export default async function KlantProfielPagina() {
  const klantId = await getKlantSessie()
  if (!klantId) redirect('/klant/geen-toegang')

  const rows = await sql`SELECT naam, email, telefoon, locatie FROM klanten WHERE id = ${klantId}`
  if (!rows[0]) redirect('/klant/geen-toegang')

  return (
    <div>
      <a href="/klant/dashboard" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>← Terug naar overzicht</a>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginTop: 16, border: '1px solid #e2e8f0' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800, color: '#0d1b3e' }}>Mijn gegevens</h1>
        <ProfielForm klantId={klantId} klant={rows[0] as { naam: string; email: string; telefoon: string; locatie: string }} />
      </div>
    </div>
  )
}
