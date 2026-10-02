'use client'

import { useMemo, useState } from 'react'
import KlantZoeker from '@/components/KlantZoeker'
import { normNaam, type KlantOptie } from '@/lib/klant-match'
import { PROJECT_STATUS_LABELS, TYPE_WERK_OPTIES, projectTitel } from '@/lib/project-opties'

/* Eerst een project kiezen, of in dezelfde stap een nieuw project aanmaken (klant + korte omschrijving).
   Offertes en facturen hangen altijd aan een project; de klant komt van het project. */

export type ProjectKeuze = {
  id: number
  klant_id: number
  klant_naam: string
  klant_email: string | null
  klant_locatie: string | null
  type_werk: string | null
  omschrijving: string | null
  status: string
}

export default function ProjectKiezer({ projecten, klanten, klantId }: {
  projecten: ProjectKeuze[]
  klanten: KlantOptie[]
  /** Vooraf gekozen klant (bijv. vanaf het klantprofiel) */
  klantId?: number | null
}) {
  const vanKlant = klantId ? projecten.filter(p => p.klant_id === klantId) : []
  const [modus, setModus] = useState<'bestaand' | 'nieuw'>(
    klantId && vanKlant.length === 0 ? 'nieuw' : projecten.length === 0 ? 'nieuw' : 'bestaand')
  const [gekozen, setGekozen] = useState<ProjectKeuze | null>(null)
  const [q, setQ] = useState(() => klanten.find(k => k.id === klantId)?.naam ?? '')

  const treffers = useMemo(() => {
    const z = normNaam(q)
    const lijst = z
      ? projecten.filter(p =>
          normNaam(p.klant_naam).includes(z) ||
          normNaam(p.type_werk).includes(z) ||
          normNaam(p.omschrijving).includes(z) ||
          normNaam(p.klant_locatie).includes(z) ||
          `#${p.id}` === z || String(p.id) === z)
      : projecten
    return lijst.slice(0, 30)
  }, [projecten, q])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input type="hidden" name="project_modus" value={modus} />
      <div className="filter-tabs" style={{ alignSelf: 'flex-start' }}>
        <button type="button" className={`filter-tab ${modus === 'bestaand' ? 'active' : ''}`} onClick={() => setModus('bestaand')}>
          Bestaand project
        </button>
        <button type="button" className={`filter-tab ${modus === 'nieuw' ? 'active' : ''}`} onClick={() => setModus('nieuw')}>
          Nieuw project
        </button>
      </div>

      {modus === 'bestaand' ? (
        <div>
          <input type="hidden" name="klus_id" value={gekozen?.id ?? ''} />
          <label className="form-label">Project</label>
          {gekozen ? (
            <div className="zoeker-keuze">
              <div>
                <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{gekozen.klant_naam} — {projectTitel(gekozen)}</div>
                <div style={{ fontSize: '.74rem', color: 'var(--text-soft)' }}>
                  Project #{gekozen.id} · {PROJECT_STATUS_LABELS[gekozen.status] ?? gekozen.status}
                  {gekozen.klant_locatie ? ` · ${gekozen.klant_locatie}` : ''}
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setGekozen(null)}>Wijzigen</button>
            </div>
          ) : (
            <>
              <input className="form-ctrl" value={q} onChange={e => setQ(e.target.value)}
                placeholder="Zoek op klant, project of plaats…" autoComplete="off" />
              <div className="card" style={{ padding: 4, marginTop: 6, maxHeight: 300, overflowY: 'auto' }}>
                {treffers.length === 0 && <div className="zoeker-leeg">Geen project gevonden — maak een nieuw project aan.</div>}
                {treffers.map(p => (
                  <button key={p.id} type="button" className="zoeker-optie" onClick={() => setGekozen(p)}>
                    {p.klant_naam} — {projectTitel(p)}
                    <span className="zoeker-optie-sub">
                      #{p.id} · {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                      {p.klant_email ? ` · ${p.klant_email}` : ''}{p.klant_locatie ? ` · ${p.klant_locatie}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <KlantZoeker
            klanten={klanten}
            name="klant_id"
            defaultId={klantId}
            nieuw={{ naam: 'nieuwe_naam', telefoon: 'nieuwe_telefoon', email: 'nieuwe_email', locatie: 'nieuwe_locatie', type: 'nieuwe_type' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div>
              <label className="form-label">Type werk</label>
              <select className="form-ctrl" name="type_werk" defaultValue="">
                <option value="">Kies type werk</option>
                {TYPE_WERK_OPTIES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Korte omschrijving</label>
              <input className="form-ctrl" name="omschrijving" placeholder="bijv. Groepenkast + 2 extra groepen" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
