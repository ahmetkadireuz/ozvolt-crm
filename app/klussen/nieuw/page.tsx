export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Nieuw project' }

export default async function NieuweKlusPage() {
  const klanten = await sql`SELECT id, naam, telefoon, locatie FROM klanten ORDER BY naam ASC`

  async function createKlus(formData: FormData) {
    'use server'
    const klantId = parseInt(String(formData.get('klant_id') ?? '0'))
    const nieuweKlant = String(formData.get('nieuwe_klant_naam') ?? '').trim()
    const typeWerk = String(formData.get('type_werk') ?? '').trim()
    const omschrijving = String(formData.get('omschrijving') ?? '').trim()
    const telefoon = String(formData.get('telefoon') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const locatie = String(formData.get('locatie') ?? '').trim()
    const bron = String(formData.get('bron') ?? 'handmatig').trim()

    let finalKlantId = klantId

    if (!klantId && nieuweKlant) {
      const result = await sql`
        INSERT INTO klanten (naam, telefoon, email, locatie)
        VALUES (${nieuweKlant}, ${telefoon || null}, ${email || null}, ${locatie || null})
        RETURNING id
      `
      finalKlantId = result[0].id
    }

    if (!finalKlantId) return

    const result = await sql`
      INSERT INTO klussen (klant_id, type_werk, omschrijving, bron, status)
      VALUES (${finalKlantId}, ${typeWerk || null}, ${omschrijving || null}, ${bron}, 'nieuw')
      RETURNING id
    `
    redirect(`/klussen/${result[0].id}`)
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/klussen" className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={16} />
          </Link>
          <h1 className="page-title">Nieuw project</h1>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        <form action={createKlus}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-label">Klant</div>

            <div className="form-group">
              <label className="form-label">Bestaande klant kiezen</label>
              <select className="form-ctrl" name="klant_id">
                <option value="">— Nieuwe klant —</option>
                {klanten.map((k: any) => (
                  <option key={k.id} value={k.id}>{k.naam} {k.locatie ? `(${k.locatie})` : ''}</option>
                ))}
              </select>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginTop: 4 }}>
              <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#8ba8c4', marginBottom: 12, textTransform: 'uppercase' }}>Of nieuwe klant</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Naam</label>
                  <input className="form-ctrl" name="nieuwe_klant_naam" placeholder="Volledige naam" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Telefoon</label>
                  <input className="form-ctrl" name="telefoon" type="tel" placeholder="06 123 456 78" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">E-mail</label>
                  <input className="form-ctrl" name="email" type="email" placeholder="naam@voorbeeld.nl" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Locatie</label>
                  <input className="form-ctrl" name="locatie" placeholder="Culemborg" />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-label">Project details</div>
            <div className="form-group">
              <label className="form-label">Type werk</label>
              <select className="form-ctrl" name="type_werk">
                <option value="">Kies type werk</option>
                <option>Groepenkast vervangen</option>
                <option>Laadpaal installeren</option>
                <option>Elektra renoveren</option>
                <option>Nieuwbouw elektra</option>
                <option>Verduurzaming</option>
                <option>Storing oplossen</option>
                <option>Overig</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Omschrijving</label>
              <textarea className="form-ctrl" name="omschrijving" rows={4} placeholder="Omschrijf de aanvraag…" />
            </div>
            <div className="form-group">
              <label className="form-label">Bron</label>
              <select className="form-ctrl" name="bron">
                <option value="handmatig">Handmatig ingevoerd</option>
                <option value="website">Website formulier</option>
                <option value="telefoon">Telefoon</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="homedeal">HomeDeal</option>
                <option value="doorverwijzing">Doorverwijzing</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">
              <Icon name="check" size={18} />
              Project aanmaken
            </button>
            <Link href="/klussen" className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
