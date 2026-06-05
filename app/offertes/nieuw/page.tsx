export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'

export const metadata: Metadata = { title: 'Nieuwe offerte' }

export default async function NieuweOffertePage({
  searchParams,
}: {
  searchParams: Promise<{ klant?: string; klus?: string }>
}) {
  const { klant: klantParam, klus: klusParam } = await searchParams
  const klanten = await sql`SELECT id, naam FROM klanten ORDER BY naam`

  // Als er een klus meegegeven is, haal de klant_id op
  let vooringevuldKlantId = klantParam ? parseInt(klantParam) : 0
  let vooringevuldKlusId = klusParam ? parseInt(klusParam) : 0
  if (vooringevuldKlusId && !vooringevuldKlantId) {
    const rows = await sql`SELECT klant_id FROM klussen WHERE id = ${vooringevuldKlusId}`
    if (rows[0]) vooringevuldKlantId = rows[0].klant_id
  }

  async function createOfferte(formData: FormData) {
    'use server'
    let klantId = parseInt(String(formData.get('klant_id') ?? '0'))
    const klusId = parseInt(String(formData.get('klus_id') ?? '0')) || null
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
    if (!klantId) redirect('/offertes/nieuw?fout=klant')

    const maxRow = await sql`SELECT MAX(offertenummer)::int AS max_nr FROM offertes`
    const nextNr = (maxRow[0]?.max_nr ?? 1000) + 1
    const result = await sql`
      INSERT INTO offertes (offertenummer, klant_id, klus_id, status, datum, geldig_tot, regels, korting_pct, btw_pct)
      VALUES (${nextNr}, ${klantId}, ${klusId}, 'concept', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', '[]'::jsonb, 0, 21)
      RETURNING id`
    redirect(`/offertes/${result[0].id}`)
  }

  const terugUrl = vooringevuldKlusId
    ? `/klussen/${vooringevuldKlusId}`
    : vooringevuldKlantId
    ? `/klanten/${vooringevuldKlantId}`
    : '/offertes'

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href={terugUrl} className="btn btn-ghost btn-sm">
            <span className="material-symbols-outlined nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <h1 className="page-title">Nieuwe offerte</h1>
        </div>
      </div>
      <div style={{ maxWidth: 480 }}>
        <form action={createOfferte} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ fontSize: '.72rem', color: '#8ba8c4', fontWeight: 700, whiteSpace: 'nowrap' }}>OF NIEUWE KLANT</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="form-label">Naam nieuwe klant</label>
              <input className="form-ctrl" name="nieuwe_naam" placeholder="Voor- en achternaam of bedrijfsnaam" />
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
            <button type="submit" className="btn btn-primary">Offerte aanmaken</button>
            <Link href={terugUrl} className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
