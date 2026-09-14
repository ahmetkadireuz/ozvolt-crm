export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Klant toevoegen' }

export default function NieuweKlantPage() {
  async function createKlant(formData: FormData) {
    'use server'
    const naam = String(formData.get('naam') ?? '').trim()
    if (!naam) return
    const veld = (key: string) => String(formData.get(key) ?? '').trim() || null

    const result = await sql`
      INSERT INTO klanten (naam, email, telefoon, locatie, type)
      VALUES (${naam}, ${veld('email')}, ${veld('telefoon')}, ${veld('locatie')}, ${String(formData.get('type') ?? 'Particulier')})
      RETURNING id
    `
    const klantId = result[0].id

    // Factuurgegevens zijn optioneel en komen uit een latere migratie. Lukt
    // het niet, dan is de klant wel aangemaakt.
    const factuurNaam = veld('factuur_naam')
    const factuurAdres = veld('factuur_adres')
    const factuurPostcode = veld('factuur_postcode')
    const factuurPlaats = veld('factuur_plaats')
    if (factuurNaam || factuurAdres || factuurPostcode || factuurPlaats) {
      try {
        await sql`
          UPDATE klanten SET
            factuur_naam     = ${factuurNaam},
            factuur_adres    = ${factuurAdres},
            factuur_postcode = ${factuurPostcode},
            factuur_plaats   = ${factuurPlaats}
          WHERE id = ${klantId}
        `
      } catch (err) {
        console.error('[klant aanmaken] factuurgegevens — draai db/klant-factuurgegevens.sql', err)
      }
    }

    redirect(`/klanten/${klantId}`)
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/klanten" className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={16} />
          </Link>
          <h1 className="page-title">Klant toevoegen</h1>
        </div>
      </div>
      <div style={{ maxWidth: 520 }}>
        <form action={createKlant} className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['naam','Naam *','text',true],['telefoon','Telefoon','tel',false],['email','E-mail','email',false],['locatie','Locatie/Stad','text',false]].map(([name, label, type, req]) => (
              <div key={String(name)} className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{String(label)}</label>
                <input className="form-ctrl" name={String(name)} type={String(type)} required={Boolean(req)} />
              </div>
            ))}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Type</label>
              <select className="form-ctrl" name="type">
                <option>Particulier</option>
                <option>Zakelijk</option>
              </select>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 20, paddingTop: 16 }}>
            <div className="section-label" style={{ marginBottom: 4 }}>Factuurgegevens (optioneel)</div>
            <p style={{ fontSize: 11.5, color: '#64748b', margin: '0 0 12px', lineHeight: 1.6 }}>
              Alleen nodig als de factuur op een andere naam of een ander adres moet staan,
              bijvoorbeeld een bedrijfsnaam.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['factuur_naam', 'Naam op factuur', 'Bedrijfsnaam'],
                ['factuur_adres', 'Straat en huisnummer', 'Straatnaam 1'],
                ['factuur_postcode', 'Postcode', '1234 AB'],
                ['factuur_plaats', 'Plaats', 'Plaatsnaam'],
              ].map(([name, label, placeholder]) => (
                <div key={name} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{label}</label>
                  <input className="form-ctrl" name={name} type="text" placeholder={placeholder} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" className="btn btn-primary">
              <Icon name="users" size={18} />
              Klant aanmaken
            </button>
            <Link href="/klanten" className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
