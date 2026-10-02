export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { maakFactuur } from '@/lib/facturen'
import { klantOpties } from '@/lib/klanten'
import { projectOpties, projectUitFormulier } from '@/lib/projecten'
import { projectTitel } from '@/lib/project-opties'
import ProjectKiezer from '@/components/ProjectKiezer'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Nieuwe factuur' }

const FOUTEN: Record<string, string> = {
  klant: 'Kies een klant of vul de naam van een nieuwe klant in.',
  project: 'Kies eerst een project, of maak in dezelfde stap een nieuw project aan.',
}

export default async function NieuweFactuurPage({
  searchParams,
}: {
  searchParams: Promise<{ klant?: string; klus?: string; fout?: string }>
}) {
  const { klant: klantParam, klus: klusParam, fout } = await searchParams
  const klantId = parseInt(klantParam ?? '') || 0
  const klusId = parseInt(klusParam ?? '') || 0

  const projectRows = klusId
    ? await sql`
        SELECT k.id, k.type_werk, k.omschrijving, kt.naam AS klant_naam
        FROM klussen k JOIN klanten kt ON kt.id = k.klant_id WHERE k.id = ${klusId}`
    : []
  const project: any = projectRows[0] ?? null
  const [projecten, klanten] = project ? [[], []] : await Promise.all([projectOpties(), klantOpties()])

  async function createFactuur(formData: FormData) {
    'use server'
    const r = await projectUitFormulier(formData)
    if ('fout' in r) redirect(`/facturen/nieuw?fout=${r.fout}`)
    const klus = await sql`SELECT id, klant_id FROM klussen WHERE id = ${r.klusId}`
    // De klant van de factuur is altijd de klant van het project
    const result = await maakFactuur({ klant_id: klus[0].klant_id, klus_id: klus[0].id, regels: [], btw_pct: 21 })
    redirect(`/facturen/${result.id}`)
  }

  const terugUrl = project ? `/klussen/${project.id}` : klantId ? `/klanten/${klantId}` : '/facturen'

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
      <div style={{ maxWidth: 560 }}>
        {fout && FOUTEN[fout] && <div className="alert alert-err">{FOUTEN[fout]}</div>}

        <form action={createFactuur} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {project ? (
            <div>
              <input type="hidden" name="klus_id" value={project.id} />
              <div className="section-label">Project</div>
              <div className="zoeker-keuze">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{project.klant_naam} — {projectTitel(project)}</div>
                  <div style={{ fontSize: '.74rem', color: 'var(--text-soft)' }}>Project #{project.id} · de klant van de factuur is de klant van het project</div>
                </div>
                <Link href={`/klussen/${project.id}`} className="btn btn-ghost btn-sm">Open</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="section-label" style={{ marginBottom: 0 }}>Bij welk project hoort de factuur?</div>
              <ProjectKiezer projecten={projecten as any} klanten={klanten as any} klantId={klantId || null} />
            </>
          )}

          <p style={{ fontSize: 12, color: 'var(--text-mute)', margin: 0 }}>
            50/50 betalen? Vul eerst de regels in en zet daarna op de factuur het 50/50-betaalplan aan.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">Factuur aanmaken</button>
            <Link href={terugUrl} className="btn btn-ghost">Annuleren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
