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
    const result = await sql`
      INSERT INTO klanten (naam, email, telefoon, locatie, type)
      VALUES (${naam}, ${String(formData.get('email') ?? '') || null}, ${String(formData.get('telefoon') ?? '') || null}, ${String(formData.get('locatie') ?? '') || null}, ${String(formData.get('type') ?? 'Particulier')})
      RETURNING id
    `
    redirect(`/klanten/${result[0].id}`)
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
