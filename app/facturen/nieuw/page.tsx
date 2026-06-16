export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Nieuwe factuur' }

export default async function NieuweFactuurPage({
  searchParams,
}: {
  searchParams: Promise<{ klant?: string; klus?: string }>
}) {
  const { klant: klantParam, klus: klusParam } = await searchParams
  const klanten = await sql`SELECT id, naam FROM klanten ORDER BY naam`

  let vooringevuldKlantId = klantParam ? parseInt(klantParam) : 0
  let vooringevuldKlusId = klusParam ? parseInt(klusParam) : 0
  if (vooringevuldKlusId && !vooringevuldKlantId) {
    const rows = await sql`SELECT klant_id FROM klussen WHERE id = ${vooringevuldKlusId}`
    if (rows[0]) vooringevuldKlantId = rows[0].klant_id
  }

  async function createFactuur(formData: FormData) {
    'use server'
    let klantId = parseInt(String(formData.get('klant_id') ?? '0'))
    let klusId: number | null = parseInt(String(formData.get('klus_id') ?? '0')) || null
    const nieuweNaam = String(formData.get('nieuwe_naam') ?? '').trim()
    const betaling5050 = formData.get('betaling_50_50') === 'on'

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
    if (!klantId) redirect('/facturen/nieuw?fout=klant')

    // Auto-koppel aan meest recente actieve klus als geen klus is meegegeven
    if (!klusId) {
      const klusRows = await sql`
        SELECT id FROM klussen
        WHERE klant_id = ${klantId} AND status <> 'afgerond'
        ORDER BY aangemaakt_op DESC
        LIMIT 1
      `
      if (klusRows[0]) klusId = klusRows[0].id
    }

    // Defensief: kolom kan missen in oudere productie-db
    try {
      await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaling_50_50 BOOLEAN DEFAULT FALSE`
      await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaal_url_2 TEXT`
    } catch {}

    const maxRow = await sql`SELECT MAX(CAST(REGEXP_REPLACE(factuurnummer, '[^0-9]', '', 'g') AS INTEGER)) AS max_nr FROM facturen`
    const nextNr = (maxRow[0]?.max_nr ?? 1000) + 1
    const result = await sql`
      INSERT INTO facturen (factuurnummer, klant_id, klus_id, status, factuurdatum, betalingstermijn, regels, btw_pct, betaling_50_50)
      VALUES (${`OZVT-${String(nextNr).padStart(4,'0')}`}, ${klantId}, ${klusId}, 'concept', CURRENT_DATE, 14, '[]'::jsonb, 21, ${betaling5050})
      RETURNING id`
    redirect(`/facturen/${result[0].id}`)
  }

  const terugUrl = vooringevuldKlusId
    ? `/klussen/${vooringevuldKlusId}`
    : vooringevuldKlantId
    ? `/klanten/${vooringevuldKlantId}`
    : '/facturen'

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href={terugUrl} className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={16} />
          </Link>
          <h1 className="page-title">Nieuwe factuur</h1>
        </div>
      </div>
      <div style={{ maxWidth: 480 }}>
        <form action={createFactuur} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, cursor: 'pointer' }}>
            <input type="checkbox" name="betaling_50_50" style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer' }} />
            <div>
              <div style={{ fontWeight: 700, color: '#0d1b3e', fontSize: 13 }}>50/50 betaalplan</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Klant ziet 2 iDEAL-knoppen in het portaal (50% bij start, 50% na oplevering).
              </div>
            </div>
          </label>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">Factuur aanmaken</button>
            <Link href={terugUrl} className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
