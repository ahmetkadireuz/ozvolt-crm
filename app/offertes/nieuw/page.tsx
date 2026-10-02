export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { klantOpties } from '@/lib/klanten'
import { projectOpties, projectUitFormulier } from '@/lib/projecten'
import { actieveOfferte, getekendeOfferte, maakNieuweVersie, maakOfferteVoorProject, offerteNr } from '@/lib/offertes'
import { projectTitel } from '@/lib/project-opties'
import ProjectKiezer from '@/components/ProjectKiezer'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Nieuwe offerte' }

const FOUTEN: Record<string, string> = {
  klant: 'Kies een klant of vul de naam van een nieuwe klant in.',
  project: 'Kies eerst een project, of maak in dezelfde stap een nieuw project aan.',
  versie: 'Er is geen nieuwe versie gemaakt: de huidige offerte is inmiddels getekend, vervallen of al vervangen.',
}

export default async function NieuweOffertePage({
  searchParams,
}: {
  searchParams: Promise<{ klant?: string; klus?: string; fout?: string }>
}) {
  const { klant: klantParam, klus: klusParam, fout } = await searchParams
  const klantId = parseInt(klantParam ?? '') || 0
  const klusId = parseInt(klusParam ?? '') || 0

  const projectRows = klusId
    ? await sql`
        SELECT k.id, k.type_werk, k.omschrijving, kt.id AS klant_id, kt.naam AS klant_naam
        FROM klussen k JOIN klanten kt ON kt.id = k.klant_id WHERE k.id = ${klusId}`
    : []
  const project: any = projectRows[0] ?? null
  const [actief, getekend] = project
    ? await Promise.all([actieveOfferte(project.id), getekendeOfferte(project.id)])
    : [null, null]
  const [projecten, klanten] = project ? [[], []] : await Promise.all([projectOpties(), klantOpties()])

  async function createOfferte(formData: FormData) {
    'use server'
    const r = await projectUitFormulier(formData)
    if ('fout' in r) {
      const terug = formData.get('klus_id') ? `klus=${formData.get('klus_id')}&` : ''
      redirect(`/offertes/nieuw?${terug}fout=${r.fout}`)
    }
    const { klusId } = r

    // Eén actieve offerte per project: een tweede offerte wordt een nieuwe versie (na bevestiging)
    const lopend = await actieveOfferte(klusId)
    if (lopend) {
      if (parseInt(String(formData.get('nieuwe_versie') ?? '')) !== lopend.id) redirect(`/offertes/nieuw?klus=${klusId}`)
      let nieuwId = 0
      try {
        nieuwId = await maakNieuweVersie(lopend.id)
      } catch {
        redirect(`/offertes/nieuw?klus=${klusId}&fout=versie`)
      }
      redirect(`/offertes/${nieuwId}?msg=${encodeURIComponent(`Nieuwe versie gemaakt; ${offerteNr(lopend.offertenummer)} is vervangen.`)}`)
    }

    // Na tekenen loopt meerwerk via het project; een aparte offerte alleen na expliciete keuze
    if (!formData.get('toch_apart') && await getekendeOfferte(klusId)) redirect(`/offertes/nieuw?klus=${klusId}`)

    const id = await maakOfferteVoorProject(klusId)
    redirect(`/offertes/${id}`)
  }

  const terugUrl = project ? `/klussen/${project.id}` : klantId ? `/klanten/${klantId}` : '/offertes'

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
      <div style={{ maxWidth: 560 }}>
        {fout && FOUTEN[fout] && <div className="alert alert-err">{FOUTEN[fout]}</div>}

        <form action={createOfferte} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {project ? (
            <>
              <input type="hidden" name="klus_id" value={project.id} />
              <div>
                <div className="section-label">Project</div>
                <div className="zoeker-keuze">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{project.klant_naam} — {projectTitel(project)}</div>
                    <div style={{ fontSize: '.74rem', color: 'var(--text-soft)' }}>Project #{project.id} · de klant van de offerte is de klant van het project</div>
                  </div>
                  <Link href={`/klussen/${project.id}`} className="btn btn-ghost btn-sm">Open</Link>
                </div>
              </div>

              {actief ? (
                <>
                  <input type="hidden" name="nieuwe_versie" value={actief.id} />
                  <div className="alert alert-warn" style={{ margin: 0 }}>
                    <strong>Nieuwe versie maken?</strong> De huidige offerte {offerteNr(actief.offertenummer)} vervalt.
                    <div style={{ fontWeight: 400, marginTop: 4 }}>
                      De nieuwe versie start als kopie (regels, uitgangspunten, opties en werkafspraken). De oude krijgt de status
                      &quot;Vervangen&quot; en kan door de klant niet meer getekend worden.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="submit" className="btn btn-primary">Ja, nieuwe versie maken</button>
                    <Link href={`/offertes/${actief.id}`} className="btn btn-ghost">Huidige offerte openen</Link>
                    <Link href={terugUrl} className="btn btn-ghost">Annuleren</Link>
                  </div>
                </>
              ) : getekend ? (
                <>
                  <input type="hidden" name="toch_apart" value="1" />
                  <div className="alert alert-warn" style={{ margin: 0 }}>
                    Dit project heeft al een getekende offerte ({offerteNr(getekend.offertenummer)}). Die blijft altijd staan;
                    meerwerk na tekenen leg je vast bij <strong>Meerwerk</strong> in het project.
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Link href={`/klussen/${project.id}`} className="btn btn-primary">Naar project (meerwerk)</Link>
                    <button type="submit" className="btn btn-ghost">Toch een aparte offerte maken</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" className="btn btn-primary">Offerte aanmaken</button>
                  <Link href={terugUrl} className="btn btn-ghost">Annuleren</Link>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="section-label" style={{ marginBottom: 0 }}>Bij welk project hoort de offerte?</div>
              <ProjectKiezer projecten={projecten as any} klanten={klanten as any} klantId={klantId || null} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary">Offerte aanmaken</button>
                <Link href={terugUrl} className="btn btn-ghost">Annuleren</Link>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
