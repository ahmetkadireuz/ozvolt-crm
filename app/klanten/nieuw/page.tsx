export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { klantOpties, vindOfMaakKlant } from '@/lib/klanten'
import { NieuweKlantVelden } from '@/components/KlantZoeker'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Klant toevoegen' }

export default async function NieuweKlantPage() {
  const klanten = await klantOpties()

  async function createKlant(formData: FormData) {
    'use server'
    const veld = (n: string) => String(formData.get(n) ?? '').trim()
    if (!veld('naam')) return
    // Bestaat de klant al (zelfde naam, e-mail of telefoon)? Dan die openen in plaats van een tweede aanmaken.
    const k = await vindOfMaakKlant({
      naam: veld('naam'), email: veld('email'), telefoon: veld('telefoon'), locatie: veld('locatie'), type: veld('type'),
    })
    redirect(k.bestaand
      ? `/klanten/${k.id}?msg=${encodeURIComponent(`Deze klant bestaat al: ${k.naam} — er is geen nieuwe klant aangemaakt.`)}`
      : `/klanten/${k.id}`)
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
          <NieuweKlantVelden
            klanten={klanten}
            namen={{ naam: 'naam', telefoon: 'telefoon', email: 'email', locatie: 'locatie', type: 'type' }}
            verplicht
            gebruikHrefPrefix="/klanten/"
          />
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
