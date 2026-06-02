import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'

export const metadata: Metadata = { title: 'Nieuwe offerte' }

export default async function NieuweOffertePage({ searchParams }: { searchParams: Promise<{ klus?: string; klant?: string }> }) {
  const { klus, klant } = await searchParams
  const klanten = await sql`SELECT id, naam FROM klanten ORDER BY naam`
  const klussen = await sql`SELECT k.id, k.type_werk, kt.naam AS klant_naam FROM klussen k JOIN klanten kt ON kt.id = k.klant_id WHERE k.status NOT IN ('afgerond') ORDER BY k.aangemaakt_op DESC LIMIT 50`

  async function createOfferte(formData: FormData) {
    'use server'
    const klantId = parseInt(String(formData.get('klant_id') ?? '0'))
    const klusId = parseInt(String(formData.get('klus_id') ?? '0')) || null
    if (!klantId) return

    const maxRow = await sql`SELECT MAX(offertenummer)::int AS max_nr FROM offertes`
    const nextNr = (maxRow[0]?.max_nr ?? 1000) + 1

    const result = await sql`
      INSERT INTO offertes (offertenummer, klant_id, klus_id, status, datum, geldig_tot, regels, korting_pct, btw_pct)
      VALUES (${nextNr}, ${klantId}, ${klusId}, 'concept', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', '[]'::jsonb, 0, 21)
      RETURNING id
    `
    redirect(`/offertes/${result[0].id}`)
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/offertes" className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <h1 className="page-title">Nieuwe offerte</h1>
        </div>
      </div>
      <div style={{ maxWidth: 480 }}>
        <form action={createOfferte} className="card">
          <div className="form-group">
            <label className="form-label">Klant</label>
            <select className="form-ctrl" name="klant_id" required defaultValue={klant ?? ''}>
              <option value="">Kies een klant</option>
              {klanten.map((k: any) => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Gekoppelde klus (optioneel)</label>
            <select className="form-ctrl" name="klus_id" defaultValue={klus ?? ''}>
              <option value="">— Geen klus —</option>
              {klussen.map((k: any) => <option key={k.id} value={k.id}>{k.klant_naam} — {k.type_werk || `Klus #${k.id}`}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary">Offerte aanmaken</button>
            <Link href="/offertes" className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
