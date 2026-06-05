'use client'

import { useState } from 'react'

type Klant = { naam: string; email: string; telefoon: string; locatie: string }

export default function ProfielForm({ klantId, klant }: { klantId: number; klant: Klant }) {
  const [form, setForm] = useState<Klant>(klant)
  const [bezig, setBezig] = useState(false)
  const [succes, setSucces] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof Klant, val: string) {
    setForm(f => ({ ...f, [field]: val }))
    setSucces(false)
  }

  async function opslaan(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setError('')
    const res = await fetch('/api/klant/profiel', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setSucces(true)
    } else {
      setError('Opslaan mislukt. Probeer het opnieuw.')
    }
    setBezig(false)
  }

  return (
    <form onSubmit={opslaan}>
      <Veld label="Naam" value={form.naam} onChange={v => set('naam', v)} />
      <Veld label="E-mailadres" type="email" value={form.email ?? ''} onChange={v => set('email', v)} />
      <Veld label="Telefoonnummer" type="tel" value={form.telefoon ?? ''} onChange={v => set('telefoon', v)} />
      <Veld label="Adres / locatie" value={form.locatie ?? ''} onChange={v => set('locatie', v)} />

      {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
      {succes && <p style={{ color: '#16a34a', fontSize: 13, margin: '0 0 12px' }}>✓ Gegevens opgeslagen</p>}

      <button
        type="submit"
        disabled={bezig}
        style={{
          padding: '11px 24px', borderRadius: 8,
          background: bezig ? '#94a3b8' : '#0d1b3e',
          color: '#fff', fontWeight: 700, fontSize: 14,
          border: 'none', cursor: bezig ? 'wait' : 'pointer',
        }}
      >
        {bezig ? 'Opslaan...' : 'Gegevens opslaan'}
      </button>
    </form>
  )
}

function Veld({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8,
          border: '1px solid #cbd5e1', fontSize: 14,
          fontFamily: 'Inter, sans-serif', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
