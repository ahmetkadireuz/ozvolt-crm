'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FiscaalProfiel } from '@/lib/fiscaal/profiel'

export default function ProfielForm({ profiel }: { profiel: FiscaalProfiel }) {
  const router = useRouter()
  const [p, setP] = useState(profiel)
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState<string | null>(null)

  function zet<K extends keyof FiscaalProfiel>(k: K, v: FiscaalProfiel[K]) {
    setP(prev => ({ ...prev, [k]: v }))
  }

  async function opslaan(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setMelding(null)
    try {
      const res = await fetch('/api/fiscaal/profiel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Opslaan mislukt')
      setMelding('Opgeslagen — berekening bijgewerkt.')
      router.refresh()
    } catch (err) {
      setMelding(err instanceof Error ? err.message : String(err))
    } finally {
      setBezig(false)
    }
  }

  const veld = (label: string, hulp: string, k: keyof FiscaalProfiel, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="form-label">{label}</label>
      <input
        className="form-ctrl"
        type="number"
        step="0.01"
        value={String(p[k] ?? '')}
        onChange={e => zet(k, Number(e.target.value) as never)}
        {...props}
      />
      <div style={{ fontSize: '.72rem', color: 'var(--text-mute)', marginTop: 3 }}>{hulp}</div>
    </div>
  )

  return (
    <form onSubmit={opslaan}>
      <p style={{ fontSize: '.82rem', color: 'var(--text-mute)', margin: '0 0 12px', lineHeight: 1.6 }}>
        Neem de <strong>cumulatieve</strong> bedragen (&quot;t/m deze periode&quot; of &quot;cumulatief&quot;) over van je
        laatste loonstrook. Het dashboard trekt ze door naar een heel jaar.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        {veld('Fiscaal loon cumulatief (€)', 'Loonstrook: "loon voor de loonheffing", cumulatief', 'loon_cumulatief')}
        {veld('Ingehouden loonheffing cumulatief (€)', 'Loonstrook: "loonheffing", cumulatief', 'loonheffing_cumulatief')}
        {veld('T/m maand (1–12)', 'Van welke maand is die loonstrook?', 'loon_tm_maand', { step: '1', min: 0, max: 12 })}
        {veld('Nog te ontvangen extra loon (€)', 'Vakantiegeld/13e maand/bonus die nog níet in de cumulatieven zit', 'extra_loon')}
        {veld('Uren loondienst per week', 'Contracturen bij je werkgever', 'uren_loondienst_per_week', { step: '0.5' })}
        {veld('Al apart gezet voor belasting (€)', 'Saldo op je belasting-spaarrekening', 'reserve_apart')}
        <div>
          <label className="form-label">Startdatum onderneming</label>
          <input className="form-ctrl" type="date" value={p.start_datum ?? ''} onChange={e => zet('start_datum', e.target.value)} />
          <div style={{ fontSize: '.72rem', color: 'var(--text-mute)', marginTop: 3 }}>Gebruikt voor de jaarprognose</div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '.84rem' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={p.urencriterium} onChange={e => zet('urencriterium', e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            Ik voldoe aan het urencriterium <strong>én</strong> werk meer uren voor mijn bedrijf dan in loondienst
            <span style={{ display: 'block', fontSize: '.74rem', color: 'var(--text-mute)' }}>
              Alleen aanvinken als je dat met een urenregistratie kunt bewijzen.
            </span>
          </span>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={p.starter} onChange={e => zet('starter', e.target.checked)} />
          <span>Recht op startersaftrek (geen onderneming in de afgelopen 5 jaar)</span>
        </label>
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary" disabled={bezig}>{bezig ? 'Opslaan…' : 'Opslaan en herberekenen'}</button>
        {melding && <span style={{ fontSize: '.8rem', color: 'var(--text-mute)' }}>{melding}</span>}
      </div>
    </form>
  )
}
