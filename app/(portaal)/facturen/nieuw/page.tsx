import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'

export const metadata: Metadata = { title: 'Nieuwe factuur' }

export default async function NieuweFactuurPage() {
  const klanten = await sql`SELECT id, naam FROM klanten ORDER BY naam`

  async function createFactuur(formData: FormData) {
    'use server'
    const klantId = parseInt(String(formData.get('klant_id') ?? '0'))
    if (!klantId) return

    const maxRow = await sql`SELECT MAX(CAST(REGEXP_REPLACE(factuurnummer, '[^0-9]', '', 'g') AS INTEGER)) AS max_nr FROM facturen`
    const nextNr = (maxRow[0]?.max_nr ?? 1000) + 1
    const factuurNr = `OZ-${nextNr}`

    const result = await sql`
      INSERT INTO facturen (factuurnummer, klant_id, status, factuurdatum, betalingstermijn, regels, btw_pct)
      VALUES (${factuurNr}, ${klantId}, 'concept', CURRENT_DATE, 14, '[]'::jsonb, 21)
      RETURNING id
    `
    redirect(`/facturen/${result[0].id}`)
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/facturen" className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <h1 className="page-title">Nieuwe factuur</h1>
        </div>
      </div>
      <div style={{ maxWidth: 400 }}>
        <form action={createFactuur} className="card">
          <div className="form-group">
            <label className="form-label">Klant</label>
            <select className="form-ctrl" name="klant_id" required>
              <option value="">Kies een klant</option>
              {klanten.map((k: any) => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary">Factuur aanmaken</button>
            <Link href="/facturen" className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
