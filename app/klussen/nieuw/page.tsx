export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { klantOpties, vindOfMaakKlant } from '@/lib/klanten'
import { maakProject } from '@/lib/projecten'
import { TYPE_WERK_OPTIES } from '@/lib/project-opties'
import KlantZoeker from '@/components/KlantZoeker'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Nieuw project' }

export default async function NieuweKlusPage({
  searchParams,
}: {
  searchParams: Promise<{ klant?: string; fout?: string }>
}) {
  const { klant: klantParam, fout } = await searchParams
  const klanten = await klantOpties()

  async function createKlus(formData: FormData) {
    'use server'
    const veld = (n: string) => String(formData.get(n) ?? '').trim()
    let klantId = parseInt(veld('klant_id')) || 0

    // Bestaande klant (zelfde naam, e-mail of telefoon) wordt hergebruikt, nooit dubbel aangemaakt
    if (!klantId && veld('nieuwe_klant_naam')) {
      const k = await vindOfMaakKlant({
        naam: veld('nieuwe_klant_naam'), telefoon: veld('telefoon'), email: veld('email'), locatie: veld('locatie'),
      })
      klantId = k.id
    }
    if (!klantId) redirect('/klussen/nieuw?fout=klant')

    const id = await maakProject({
      klant_id: klantId, type_werk: veld('type_werk'), omschrijving: veld('omschrijving'), bron: veld('bron') || 'handmatig',
    })
    redirect(`/klussen/${id}`)
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
        {fout === 'klant' && <div className="alert alert-err">Kies een klant of vul de naam van een nieuwe klant in.</div>}
        <form action={createKlus}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-label">Klant</div>
            <KlantZoeker
              klanten={klanten}
              label="Klant zoeken"
              defaultId={parseInt(klantParam ?? '') || null}
              nieuw={{ naam: 'nieuwe_klant_naam', telefoon: 'telefoon', email: 'email', locatie: 'locatie' }}
            />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-label">Project details</div>
            <div className="form-group">
              <label className="form-label">Type werk</label>
              <select className="form-ctrl" name="type_werk">
                <option value="">Kies type werk</option>
                {TYPE_WERK_OPTIES.map(t => <option key={t}>{t}</option>)}
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
