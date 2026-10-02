export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import Icon from '@/components/Icon'
import { maakOfferteConcept } from '@/lib/offerte-ai'
import AanmaakKnop from './AanmaakKnop'

export const maxDuration = 60

export const metadata: Metadata = { title: 'Nieuwe offerte' }

export default async function NieuweOffertePage({
  searchParams,
}: {
  searchParams: Promise<{ klant?: string; klus?: string; fout?: string }>
}) {
  const { klant: klantParam, klus: klusParam, fout } = await searchParams
  const klanten = await sql`SELECT id, naam FROM klanten ORDER BY naam`

  // Als er een klus meegegeven is, haal de klant_id op
  let vooringevuldKlantId = klantParam ? parseInt(klantParam) : 0
  let vooringevuldKlusId = klusParam ? parseInt(klusParam) : 0
  let klus: any = null
  if (vooringevuldKlusId) {
    const rows = await sql`SELECT id, klant_id, type_werk, omschrijving, product FROM klussen WHERE id = ${vooringevuldKlusId}`
    klus = rows[0] ?? null
    if (klus && !vooringevuldKlantId) vooringevuldKlantId = klus.klant_id
  }

  async function createOfferte(formData: FormData) {
    'use server'
    let klantId = parseInt(String(formData.get('klant_id') ?? '0'))
    let klusId: number | null = parseInt(String(formData.get('klus_id') ?? '0')) || null
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

    // Offertebot: eerste opzet van de regels laten maken op basis van het project
    let regels: any[] = []
    let notities: string | null = null
    let botFout = ''
    if (formData.get('bot') === 'on') {
      try {
        const [klantRows, klusRows] = await Promise.all([
          sql`SELECT naam, type, locatie FROM klanten WHERE id = ${klantId}`,
          klusId ? sql`SELECT type_werk, omschrijving, product, notities FROM klussen WHERE id = ${klusId}` : Promise.resolve([]),
        ])
        const concept = await maakOfferteConcept({
          klant: klantRows[0] as any,
          klus: (klusRows[0] as any) ?? null,
          wensen: String(formData.get('wensen') ?? '').trim(),
        })
        regels = concept.regels
        if (concept.aannames) notities = `Offertebot (aannames, nakijken): ${concept.aannames}`
      } catch (err: any) {
        botFout = String(err?.message ?? err).replace(/%/g, ' procent')
      }
    }

    const maxRow = await sql`SELECT MAX(offertenummer)::int AS max_nr FROM offertes`
    const nextNr = (maxRow[0]?.max_nr ?? 1000) + 1
    const result = await sql`
      INSERT INTO offertes (offertenummer, klant_id, klus_id, status, datum, geldig_tot, regels, korting_pct, btw_pct, notities)
      VALUES (${nextNr}, ${klantId}, ${klusId}, 'concept', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', ${JSON.stringify(regels)}::jsonb, 0, 21, ${notities})
      RETURNING id`
    const msg = botFout
      ? `Offertebot kon geen opzet maken (${botFout}). Vul de regels zelf in.`
      : regels.length
      ? 'Offertebot heeft een eerste opzet gemaakt. Controleer aantallen en prijzen.'
      : ''
    redirect(`/offertes/${result[0].id}${msg ? `?msg=${encodeURIComponent(msg)}` : ''}`)
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
            <Icon name="arrow-left" size={16} />
          </Link>
          <h1 className="page-title">Nieuwe offerte</h1>
        </div>
      </div>
      <div style={{ maxWidth: 480 }}>
        {fout === 'klant' && <div className="alert alert-err">Kies een klant of vul een nieuwe klant in.</div>}
        <form action={createOfferte} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="hidden" name="klus_id" value={vooringevuldKlusId || ''} />

          {klus && (
            <div style={{ background: 'var(--surface-mute)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div className="form-label">Project</div>
                <div style={{ fontWeight: 700 }}>{klus.type_werk || `Project #${klus.id}`}{klus.product ? ` · ${klus.product}` : ''}</div>
                {klus.omschrijving && <div style={{ fontSize: '.82rem', color: 'var(--text-mute)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{klus.omschrijving}</div>}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" name="bot" defaultChecked />
                Offertebot: laat Claude een eerste opzet van de regels maken
              </label>
              <div>
                <label className="form-label">Extra instructies voor de bot (optioneel)</label>
                <textarea className="form-ctrl" name="wensen" rows={3} placeholder="Bijv. 3-fase kast met 8 groepen, 2 aardlekautomaten, oude kast afvoeren" />
              </div>
            </div>
          )}

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
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: '.72rem', color: 'var(--text-soft)', fontWeight: 700, whiteSpace: 'nowrap' }}>OF NIEUWE KLANT</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <div style={{ background: 'var(--surface-mute)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            <AanmaakKnop bot={!!klus} />
            <Link href={terugUrl} className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
