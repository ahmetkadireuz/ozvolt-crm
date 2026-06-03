export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'

export const metadata: Metadata = { title: 'Nieuwe factuur' }

export default async function NieuweFactuurPage() {
  const klanten = await sql`SELECT id, naam FROM klanten ORDER BY naam`

  async function createFactuur(formData: FormData) {
    'use server'
    let klantId = parseInt(String(formData.get('klant_id') ?? '0'))
    const nieuweNaam = String(formData.get('nieuwe_naam') ?? '').trim()

    if (!klantId && nieuweNaam) {
      const r = await sql`
        INSERT INTO klanten (naam, email, telefoon, type)
        VALUES (${nieuweNaam},
                ${String(formData.get('nieuwe_email') ?? '') || null},
                ${String(formData.get('nieuwe_telefoon') ?? '') || null},
                ${String(formData.get('nieuwe_type') ?? 'Particulier')})
        RETURNING id`
      klantId = r[0].id
    }
    if (!klantId) return

    const maxRow = await sql`SELECT MAX(CAST(REGEXP_REPLACE(factuurnummer, '[^0-9]', '', 'g') AS INTEGER)) AS max_nr FROM facturen`
    const nextNr = (maxRow[0]?.max_nr ?? 1000) + 1
    const result = await sql`
      INSERT INTO facturen (factuurnummer, klant_id, status, factuurdatum, betalingstermijn, regels, btw_pct)
      VALUES (${`OZ-${nextNr}`}, ${klantId}, 'concept', CURRENT_DATE, 14, '[]'::jsonb, 21)
      RETURNING id`
    redirect(`/facturen/${result[0].id}`)
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/facturen" className="btn btn-ghost btn-sm">
            <span className="material-symbols-outlined nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <h1 className="page-title">Nieuwe factuur</h1>
        </div>
      </div>
      <div style={{ maxWidth: 480 }}>
        <form action={createFactuur} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label className="form-label">Bestaande klant kiezen</label>
            <select className="form-ctrl" name="klant_id">
              <option value="">— Kies een klant —</option>
              {klanten.map((k: any) => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
            <Link href="/klanten/nieuw" className="btn btn-ghost btn-sm" style={{ marginTop: 6, fontSize: '.75rem' }}>
              + Klant beheren
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ fontSize: '.72rem', color: '#8ba8c4', fontWeight: 700, whiteSpace: 'nowrap' }}>OF NIEUWE KLANT</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="form-label">Naam</label>
              <input className="form-ctrl" name="nieuwe_naam" placeholder="Voor- en achternaam of bedrijf" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label">Telefoon</label>
                <input className="form-ctrl" name="nieuwe_telefoon" type="tel" placeholder="06 12345678" />
              </div>
              <div>
                <label className="form-label">E-mail</label>
                <input className="form-ctrl" name="nieuwe_email" type="email" placeholder="naam@email.nl" />
              </div>
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-ctrl" name="nieuwe_type">
                <option value="Particulier">Particulier</option>
                <option value="Zakelijk">Zakelijk</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">Factuur aanmaken</button>
            <Link href="/facturen" className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
