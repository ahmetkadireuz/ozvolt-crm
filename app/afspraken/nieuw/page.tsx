export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'

export const metadata: Metadata = { title: 'Nieuwe werkafspraken' }

export default async function NieuweAfspraakPage({
  searchParams,
}: {
  searchParams: Promise<{ klant?: string; klus?: string }>
}) {
  const { klant: klantParam, klus: klusParam } = await searchParams
  const klanten = await sql`SELECT id, naam FROM klanten ORDER BY naam`

  let vooringevuldKlantId = klantParam ? parseInt(klantParam) : 0
  const vooringevuldKlusId = klusParam ? parseInt(klusParam) : 0

  if (vooringevuldKlusId && !vooringevuldKlantId) {
    const rows = await sql`SELECT klant_id FROM klussen WHERE id = ${vooringevuldKlusId}`
    if (rows[0]) vooringevuldKlantId = rows[0].klant_id
  }

  async function createAfspraak(formData: FormData) {
    'use server'
    const klantId = parseInt(String(formData.get('klant_id') ?? '0'))
    const klusId = parseInt(String(formData.get('klus_id') ?? '0')) || null
    if (!klantId) redirect('/afspraken/nieuw')

    const maxRow = await sql`SELECT COALESCE(MAX(afspraaknummer),0)+1 AS nr FROM werkafspraken`
    const nr = maxRow[0].nr
    const tokenBytes = new Uint8Array(32)
    globalThis.crypto.getRandomValues(tokenBytes)
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

    const result = await sql`
      INSERT INTO werkafspraken (afspraaknummer, klant_id, klus_id, datum, afspraken, accept_token, bijgewerkt_op)
      VALUES (${nr}, ${klantId}, ${klusId}, CURRENT_DATE, '[]'::jsonb, ${token}, NOW())
      RETURNING id`
    redirect(`/afspraken/${result[0].id}`)
  }

  const terugUrl = vooringevuldKlusId
    ? `/klussen/${vooringevuldKlusId}`
    : vooringevuldKlantId
    ? `/klanten/${vooringevuldKlantId}`
    : '/afspraken'

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href={terugUrl} className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <h1 className="page-title">Nieuwe werkafspraken</h1>
        </div>
      </div>
      <div style={{ maxWidth: 480 }}>
        <form action={createAfspraak} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="hidden" name="klus_id" value={vooringevuldKlusId || ''} />

          <div>
            <label className="form-label">Klant</label>
            <select className="form-ctrl" name="klant_id">
              <option value="">— Kies een klant —</option>
              {(klanten as any[]).map((k) => (
                <option key={k.id} value={k.id} selected={k.id === vooringevuldKlantId}>
                  {k.naam}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">Aanmaken</button>
            <Link href={terugUrl} className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
