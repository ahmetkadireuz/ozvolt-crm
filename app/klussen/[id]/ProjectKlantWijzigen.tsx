'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import KlantZoeker from '@/components/KlantZoeker'
import type { KlantOptie } from '@/lib/klant-match'

/* Andere klant op het project zetten. Offertes die nog niet getekend zijn en facturen die niet
   betaald zijn en niet in Moneybird staan gaan mee; de rest blijft bij de oude klant. */
export default function ProjectKlantWijzigen({ klusId, klantId, klanten }: { klusId: number; klantId: number; klanten: KlantOptie[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [melding, setMelding] = useState<string | null>(null)

  async function opslaan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const gekozen = parseInt(String(fd.get('klant_id') ?? '')) || 0
    const naam = String(fd.get('nieuwe_naam') ?? '').trim()
    if (!gekozen && !naam) { setMelding('Kies een klant of vul een nieuwe klant in.'); return }
    if (gekozen === klantId) { setOpen(false); return }
    if (!confirm('Klant van dit project wijzigen?\n\nOffertes die nog niet getekend zijn en facturen die niet betaald zijn en niet in Moneybird staan gaan mee naar de nieuwe klant. Getekende offertes en facturen in Moneybird blijven ongewijzigd.')) return

    setSaving(true)
    setMelding(null)
    const res = await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gekozen ? { klant_id: gekozen } : {
        nieuwe_klant: {
          naam, email: fd.get('nieuwe_email'), telefoon: fd.get('nieuwe_telefoon'), locatie: fd.get('nieuwe_locatie'),
        },
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setMelding(data?.error ?? 'Wijzigen mislukt'); return }
    const blijft = Number(data.offertesOngewijzigd ?? 0) + Number(data.facturenOngewijzigd ?? 0)
    if (blijft > 0) alert(`Klant gewijzigd. ${blijft} getekende offerte(s) of vastliggende factu(u)r(en) blijven op de oude klant staan.`)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={() => setOpen(true)}>
        Andere klant…
      </button>
    )
  }

  return (
    <form onSubmit={opslaan} style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <KlantZoeker
        klanten={klanten.filter(k => k.id !== klantId)}
        label="Nieuwe klant voor dit project"
        nieuw={{ naam: 'nieuwe_naam', telefoon: 'nieuwe_telefoon', email: 'nieuwe_email', locatie: 'nieuwe_locatie' }}
      />
      {melding && <div className="alert alert-err" style={{ margin: 0 }}>{melding}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Bezig…' : 'Klant wijzigen'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setMelding(null) }}>Annuleren</button>
      </div>
    </form>
  )
}
