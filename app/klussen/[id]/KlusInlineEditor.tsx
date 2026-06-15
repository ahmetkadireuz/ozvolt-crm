'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'

interface Props {
  klusId: number
  initial: {
    type_werk: string | null
    product: string | null
    omschrijving: string | null
  }
}

/** Aanvraagdetails — expliciete Opslaan-knop. Verschijnt zodra je iets wijzigt. */
export default function KlusInlineEditor({ klusId, initial }: Props) {
  const router = useRouter()
  const start = {
    type_werk: initial.type_werk ?? '',
    product: initial.product ?? '',
    omschrijving: initial.omschrijving ?? '',
  }
  const [form, setForm] = useState(start)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dirty =
    form.type_werk !== start.type_werk ||
    form.product !== start.product ||
    form.omschrijving !== start.omschrijving

  // Klant ziet de wijzigingen pas na opslaan — daarom waarschuwen bij navigeren met onopgeslagen wijzigingen.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  async function opslaan() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/klussen/${klusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Opslaan mislukt')
      }
      setSavedAt(Date.now())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setSaving(false)
    }
  }

  const justSaved = savedAt && Date.now() - savedAt < 3000

  return (
    <div className="card">
      <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Aanvraagdetails</span>
        {dirty && !saving && (
          <span style={{ fontSize: 11, color: '#b45309', fontWeight: 700 }}>● Niet opgeslagen</span>
        )}
        {justSaved && !dirty && (
          <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>✓ Opgeslagen — zichtbaar in klantportaal</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Type werk</label>
          <input
            className="form-ctrl"
            value={form.type_werk}
            onChange={e => setForm(p => ({ ...p, type_werk: e.target.value }))}
            placeholder="Bijv. Laadpaal installeren"
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Product</label>
          <input
            className="form-ctrl"
            value={form.product}
            onChange={e => setForm(p => ({ ...p, product: e.target.value }))}
            placeholder="Bijv. Zaptec Go 2"
          />
        </div>
      </div>
      <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
        <label className="form-label">Omschrijving <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 11 }}>— zichtbaar voor klant in portaal</span></label>
        <textarea
          className="form-ctrl"
          rows={4}
          value={form.omschrijving}
          onChange={e => setForm(p => ({ ...p, omschrijving: e.target.value }))}
          placeholder="Korte omschrijving van de werkzaamheden…"
          style={{ resize: 'vertical' }}
        />
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {dirty && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setForm(start)}
            disabled={saving}
          >
            Annuleer
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={opslaan}
          disabled={!dirty || saving}
          style={{ opacity: dirty ? 1 : 0.5 }}
        >
          <Icon name="check" size={16} />
          {saving ? 'Opslaan…' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}
