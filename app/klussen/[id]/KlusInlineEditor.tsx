'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAutosave } from '@/lib/use-autosave'

interface Props {
  klusId: number
  initial: {
    type_werk: string | null
    product: string | null
    omschrijving: string | null
  }
}

/** Aanvraagdetails inline editable met auto-save (debounced). */
export default function KlusInlineEditor({ klusId, initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    type_werk: initial.type_werk ?? '',
    product: initial.product ?? '',
    omschrijving: initial.omschrijving ?? '',
  })

  const { saving, saved } = useAutosave(form, async val => {
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(val),
    })
    router.refresh()
  })

  return (
    <div className="card">
      <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Aanvraagdetails</span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
          {saving ? 'Opslaan…' : saved ? '✓ Opgeslagen' : ''}
        </span>
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
        <label className="form-label">Omschrijving</label>
        <textarea
          className="form-ctrl"
          rows={4}
          value={form.omschrijving}
          onChange={e => setForm(p => ({ ...p, omschrijving: e.target.value }))}
          placeholder="Korte omschrijving van de werkzaamheden…"
          style={{ resize: 'vertical' }}
        />
      </div>
    </div>
  )
}
