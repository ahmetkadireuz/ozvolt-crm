export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import crypto from 'crypto'

export const metadata: Metadata = { title: 'Nieuwe werkafspraken' }

export default async function NieuweAfspraakPage() {
  const klanten = await sql`SELECT id, naam FROM klanten ORDER BY naam`

  async function createAfspraak(formData: FormData) {
    'use server'
    const klantId = parseInt(String(formData.get('klant_id') ?? '0'))
    if (!klantId) redirect('/afspraken/nieuw')

    const maxRow = await sql`SELECT COALESCE(MAX(afspraaknummer),0)+1 AS nr FROM werkafspraken`
    const nr = maxRow[0].nr
    const token = crypto.randomBytes(32).toString('hex')

    const result = await sql`
      INSERT INTO werkafspraken (afspraaknummer, klant_id, datum, afspraken, accept_token, bijgewerkt_op)
      VALUES (${nr}, ${klantId}, CURRENT_DATE, '[]'::jsonb, ${token}, NOW())
      RETURNING id`
    redirect(`/afspraken/${result[0].id}`)
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/afspraken" className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <h1 className="page-title">Nieuwe werkafspraken</h1>
        </div>
      </div>
      <div style={{ maxWidth: 480 }}>
        <form action={createAfspraak} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Klant</label>
            <select className="form-ctrl" name="klant_id">
              <option value="">— Kies een klant —</option>
              {(klanten as any[]).map((k) => (
                <option key={k.id} value={k.id}>{k.naam}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">Aanmaken</button>
            <Link href="/afspraken" className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
