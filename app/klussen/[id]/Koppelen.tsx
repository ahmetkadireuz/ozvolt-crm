'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PROJECT_STATUS_LABELS, projectTitel } from '@/lib/project-opties'

/* Gedeeld door OfferteKoppelen en FactuurKoppelen:
   - op het project: een losse offerte/factuur van deze klant aan het project koppelen;
   - op de offerte/factuur zelf: een los document aan een project van de klant koppelen,
     of in dezelfde stap een nieuw project voor die klant aanmaken. */

type Soort = 'offerte' | 'factuur'
const VELD: Record<Soort, string> = { offerte: 'koppel_offerte_id', factuur: 'koppel_factuur_id' }

async function koppelAanProject(klusId: number | string, soort: Soort, documentId: number | string) {
  const res = await fetch(`/api/klussen/${klusId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [VELD[soort]]: documentId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error ?? 'Koppelen mislukt')
  }
}

/** Op de projectpagina: kies een los document van deze klant. */
export function DocumentAanProject({ soort, klusId, opties }: {
  soort: Soort
  klusId: number
  opties: { id: number; label: string }[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)

  async function koppel() {
    if (!selected) return
    setSaving(true)
    try { await koppelAanProject(klusId, soort, selected) } catch (err: any) { alert(err.message) }
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="card">
      <div className="section-label">Bestaande {soort} koppelen</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select className="form-ctrl" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Kies {soort} —</option>
          {opties.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <button type="button" className="btn btn-primary btn-sm" onClick={koppel} disabled={!selected || saving}>
          {saving ? 'Bezig…' : 'Koppelen'}
        </button>
      </div>
    </div>
  )
}

/** Op de offerte-/factuurpagina: "Niet gekoppeld aan een project" + koppelen. */
export function ProjectAanDocument({ soort, documentId, klantId, klantNaam, projecten }: {
  soort: Soort
  documentId: number
  klantId: number
  klantNaam: string
  projecten: { id: number; type_werk: string | null; omschrijving: string | null; status: string }[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState(projecten.length === 0 ? 'nieuw' : '')
  const [omschrijving, setOmschrijving] = useState('')
  const [saving, setSaving] = useState(false)

  async function koppel() {
    if (!selected) return
    setSaving(true)
    try {
      let klusId: number | string = selected
      if (selected === 'nieuw') {
        const res = await fetch('/api/klussen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ klant_id: klantId, omschrijving }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.id) throw new Error(data?.error ?? 'Project aanmaken mislukt')
        klusId = data.id
      }
      await koppelAanProject(klusId, soort, documentId)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--tint-amber)' }}>
      <div className="section-label" style={{ color: 'var(--tint-amber)' }}>Niet gekoppeld aan een project</div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-2)', margin: '0 0 10px' }}>
        Elke {soort} hoort bij een project. Koppel deze {soort} aan een project van {klantNaam}.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select className="form-ctrl" style={{ flex: '1 1 220px' }} value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Kies project —</option>
          {projecten.map(p => (
            <option key={p.id} value={p.id}>
              {projectTitel(p)} · #{p.id} · {PROJECT_STATUS_LABELS[p.status] ?? p.status}
            </option>
          ))}
          <option value="nieuw">+ Nieuw project voor {klantNaam}</option>
        </select>
        {selected === 'nieuw' && (
          <input className="form-ctrl" style={{ flex: '1 1 220px' }} value={omschrijving} onChange={e => setOmschrijving(e.target.value)}
            placeholder="Korte omschrijving van het project" />
        )}
        <button type="button" className="btn btn-primary btn-sm" onClick={koppel} disabled={!selected || saving}>
          {saving ? 'Bezig…' : 'Koppelen'}
        </button>
      </div>
    </div>
  )
}
