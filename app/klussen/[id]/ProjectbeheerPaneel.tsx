'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Uur = { id: number; datum: string; uren: number; uurloon: number; omschrijving: string | null }
type Taak = { id: number; omschrijving: string; gereed: boolean; aantal_totaal: number; aantal_klaar: number; fotos: string[] }
type MeerwerkRegel = { id: number; omschrijving: string; bedrag: number; status: string; accepted_at: string | null; accepted_name: string | null }
type Rapport = { id: number; titel: string; type: string | null; getekend_op: string | null; aangemaakt_op: string }

interface Props {
  klusId: number
  uren: Uur[]
  taken: Taak[]
  meerwerk: MeerwerkRegel[]
  rapporten: Rapport[]
  omzet: number
  kosten: number
}

const eur = (n: number) => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ProjectbeheerPaneel({ klusId, uren, taken, meerwerk, rapporten, omzet, kosten }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  // Formulier-state
  const [uurForm, setUurForm] = useState({ datum: new Date().toISOString().slice(0, 10), uren: '', uurloon: '65', omschrijving: '' })
  const [taakForm, setTaakForm] = useState({ omschrijving: '', aantal_totaal: '1' })
  const [meerwerkForm, setMeerwerkForm] = useState({ omschrijving: '', bedrag: '' })

  async function api(method: string, path: string, body?: any) {
    setBusy(true)
    await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    setBusy(false)
    router.refresh()
  }

  const loon = uren.reduce((s, u) => s + Number(u.uren) * Number(u.uurloon), 0)
  const meerwerkGeacc = meerwerk.filter(m => m.status === 'geaccepteerd').reduce((s, m) => s + Number(m.bedrag), 0)
  const totaalOmzet = omzet + meerwerkGeacc
  const resultaat = totaalOmzet - kosten - loon

  const vgTotaal = taken.length
  const vgSom = taken.reduce((s, t) => {
    const tot = Number(t.aantal_totaal) || 1
    return s + (t.gereed ? 1 : Math.min(Number(t.aantal_klaar) / tot, 1))
  }, 0)
  const vgPct = vgTotaal ? Math.round((vgSom / vgTotaal) * 100) : 0

  const inputStyle: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', minWidth: 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>

      {/* ── Financieel overzicht ── */}
      <div className="card">
        <div className="section-label">Financieel overzicht</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {[
            ['Omzet (offerte)', eur(omzet), '#15803d'],
            ['Meerwerk geacc.', eur(meerwerkGeacc), '#15803d'],
            ['Kosten', eur(kosten), '#dc2626'],
            ['Loon (uren)', eur(loon), '#dc2626'],
            ['Resultaat', eur(resultaat), resultaat >= 0 ? '#15803d' : '#dc2626'],
          ].map(([label, val, kleur]) => (
            <div key={label as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: '.68rem', color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: '.9rem', color: kleur as string }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Taken / voortgang ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Werkzaamheden &amp; voortgang</div>
          {vgTotaal > 0 && <span className="mono" style={{ fontSize: '.78rem', color: '#8ba8c4' }}>{vgPct}% gereed</span>}
        </div>
        {vgTotaal > 0 && (
          <div style={{ height: 7, background: '#eef2f7', borderRadius: 99, overflow: 'hidden', margin: '10px 0 4px' }}>
            <div style={{ height: '100%', width: `${Math.max(2, vgPct)}%`, background: '#16a34a', borderRadius: 99, transition: 'width .25s' }} />
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          {taken.length === 0 && <p style={{ color: '#8ba8c4', fontSize: '.84rem', margin: 0 }}>Nog geen taken — voeg de werkzaamheden toe om voortgang bij te houden.</p>}
          {taken.map(t => {
            const tot = Number(t.aantal_totaal) || 1
            const kl = Number(t.aantal_klaar) || 0
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                <input
                  type="checkbox"
                  checked={t.gereed}
                  disabled={busy}
                  onChange={e => api('PATCH', `/api/klussen/${klusId}/taken`, { taak_id: t.id, gereed: e.target.checked })}
                  style={{ width: 17, height: 17, accentColor: '#16a34a', cursor: 'pointer' }}
                />
                <span style={{ flex: '1 1 200px', fontSize: '.84rem', color: t.gereed ? '#94a3b8' : '#1e293b', textDecoration: t.gereed ? 'line-through' : 'none' }}>
                  {t.omschrijving}
                </span>
                {tot > 1 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input
                      type="number"
                      defaultValue={kl}
                      min={0}
                      max={tot}
                      disabled={busy}
                      onBlur={e => Number(e.target.value) !== kl && api('PATCH', `/api/klussen/${klusId}/taken`, { taak_id: t.id, aantal_klaar: Number(e.target.value) })}
                      style={{ ...inputStyle, width: 58, padding: '4px 6px', fontSize: 12 }}
                    />
                    <span className="mono" style={{ fontSize: '.74rem', color: '#8ba8c4' }}>/ {tot}</span>
                  </span>
                )}
                <button
                  onClick={() => confirm('Taak verwijderen?') && api('DELETE', `/api/klussen/${klusId}/taken?taak_id=${t.id}`)}
                  disabled={busy}
                  style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
                  title="Verwijderen"
                >✕</button>
              </div>
            )
          })}
        </div>
        <form
          onSubmit={e => {
            e.preventDefault()
            if (!taakForm.omschrijving.trim()) return
            api('POST', `/api/klussen/${klusId}/taken`, { omschrijving: taakForm.omschrijving, aantal_totaal: Number(taakForm.aantal_totaal) || 1 })
            setTaakForm({ omschrijving: '', aantal_totaal: '1' })
          }}
          style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}
        >
          <input value={taakForm.omschrijving} onChange={e => setTaakForm(f => ({ ...f, omschrijving: e.target.value }))} placeholder="Nieuwe taak, bijv. Wandcontactdozen plaatsen" style={{ ...inputStyle, flex: '1 1 240px' }} />
          <input type="number" value={taakForm.aantal_totaal} onChange={e => setTaakForm(f => ({ ...f, aantal_totaal: e.target.value }))} min={1} title="Aantal" style={{ ...inputStyle, width: 70 }} />
          <button className="btn btn-primary btn-sm" disabled={busy} type="submit">Toevoegen</button>
        </form>
      </div>

      {/* ── Uren ── */}
      <div className="card">
        <div className="section-label">Urenregistratie</div>
        {uren.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {uren.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.82rem' }}>
                <span className="mono" style={{ color: '#8ba8c4', flexShrink: 0 }}>{new Date(u.datum).toLocaleDateString('nl-NL')}</span>
                <span style={{ flex: 1, color: '#1e293b' }}>{u.omschrijving || '—'}</span>
                <span className="mono" style={{ flexShrink: 0 }}>{Number(u.uren).toLocaleString('nl-NL')} u × {eur(Number(u.uurloon))}</span>
                <span className="mono" style={{ fontWeight: 700, flexShrink: 0 }}>{eur(Number(u.uren) * Number(u.uurloon))}</span>
                <button onClick={() => confirm('Uurregel verwijderen?') && api('DELETE', `/api/klussen/${klusId}/uren?uur_id=${u.id}`)} disabled={busy}
                  style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14 }} title="Verwijderen">✕</button>
              </div>
            ))}
            <div style={{ textAlign: 'right', fontSize: '.82rem', fontWeight: 700, paddingTop: 8 }}>
              Totaal: {uren.reduce((s, u) => s + Number(u.uren), 0).toLocaleString('nl-NL')} uur · {eur(loon)}
            </div>
          </div>
        )}
        <form
          onSubmit={e => {
            e.preventDefault()
            if (!Number(uurForm.uren)) return
            api('POST', `/api/klussen/${klusId}/uren`, { ...uurForm, uren: Number(String(uurForm.uren).replace(',', '.')), uurloon: Number(String(uurForm.uurloon).replace(',', '.')) })
            setUurForm(f => ({ ...f, uren: '', omschrijving: '' }))
          }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <input type="date" value={uurForm.datum} onChange={e => setUurForm(f => ({ ...f, datum: e.target.value }))} style={inputStyle} />
          <input value={uurForm.uren} onChange={e => setUurForm(f => ({ ...f, uren: e.target.value }))} placeholder="Uren" inputMode="decimal" style={{ ...inputStyle, width: 70 }} />
          <input value={uurForm.uurloon} onChange={e => setUurForm(f => ({ ...f, uurloon: e.target.value }))} placeholder="Uurloon" inputMode="decimal" title="Uurloon €" style={{ ...inputStyle, width: 80 }} />
          <input value={uurForm.omschrijving} onChange={e => setUurForm(f => ({ ...f, omschrijving: e.target.value }))} placeholder="Omschrijving (optioneel)" style={{ ...inputStyle, flex: '1 1 160px' }} />
          <button className="btn btn-primary btn-sm" disabled={busy} type="submit">Toevoegen</button>
        </form>
      </div>

      {/* ── Meerwerk ── */}
      <div className="card">
        <div className="section-label">Meerwerk</div>
        {meerwerk.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {meerwerk.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.82rem', flexWrap: 'wrap' }}>
                <span style={{ flex: '1 1 180px', color: '#1e293b' }}>{m.omschrijving}</span>
                <span className="mono" style={{ fontWeight: 700, flexShrink: 0 }}>{eur(Number(m.bedrag))}</span>
                <span style={{
                  flexShrink: 0, fontSize: '.7rem', fontWeight: 800, padding: '3px 9px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '.03em',
                  background: m.status === 'geaccepteerd' ? 'rgba(45,138,78,.12)' : m.status === 'geweigerd' ? 'rgba(192,57,43,.1)' : '#f1f5f9',
                  color: m.status === 'geaccepteerd' ? '#15803d' : m.status === 'geweigerd' ? '#c0392b' : '#64748b',
                }}>
                  {m.status}{m.status === 'geaccepteerd' && m.accepted_name ? ` · ${m.accepted_name}` : ''}
                </span>
                {m.status === 'voorgesteld' && (
                  <button className="btn btn-ghost btn-sm" disabled={busy}
                    onClick={() => api('PATCH', `/api/klussen/${klusId}/meerwerk`, { meerwerk_id: m.id, status: 'geaccepteerd' })}>
                    Accepteren
                  </button>
                )}
                <button onClick={() => confirm('Meerwerkregel verwijderen?') && api('DELETE', `/api/klussen/${klusId}/meerwerk?meerwerk_id=${m.id}`)} disabled={busy}
                  style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14, flexShrink: 0 }} title="Verwijderen">✕</button>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: '.75rem', color: '#8ba8c4', margin: '0 0 10px' }}>
          Voorgesteld meerwerk is zichtbaar in het klantportaal; de klant kan het daar accepteren.
        </p>
        <form
          onSubmit={e => {
            e.preventDefault()
            if (!meerwerkForm.omschrijving.trim() || !Number(meerwerkForm.bedrag.replace(',', '.'))) return
            api('POST', `/api/klussen/${klusId}/meerwerk`, { omschrijving: meerwerkForm.omschrijving, bedrag: Number(meerwerkForm.bedrag.replace(',', '.')) })
            setMeerwerkForm({ omschrijving: '', bedrag: '' })
          }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <input value={meerwerkForm.omschrijving} onChange={e => setMeerwerkForm(f => ({ ...f, omschrijving: e.target.value }))} placeholder="Omschrijving meerwerk" style={{ ...inputStyle, flex: '1 1 220px' }} />
          <input value={meerwerkForm.bedrag} onChange={e => setMeerwerkForm(f => ({ ...f, bedrag: e.target.value }))} placeholder="Bedrag € (incl. btw)" inputMode="decimal" style={{ ...inputStyle, width: 130 }} />
          <button className="btn btn-primary btn-sm" disabled={busy} type="submit">Toevoegen</button>
        </form>
      </div>

      {/* ── Opleveringsrapporten ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Opleveringsrapporten</div>
          <a href={`/klussen/${klusId}/oplevering`} className="btn btn-primary btn-sm">
            <span className="nav-ico" style={{ fontSize: 15 }}>task_alt</span>
            Nieuw opleveringsrapport
          </a>
        </div>
        {rapporten.length === 0 ? (
          <p style={{ color: '#8ba8c4', fontSize: '.84rem', margin: '10px 0 0' }}>Nog geen opleveringsrapporten.</p>
        ) : (
          <div style={{ marginTop: 10 }}>
            {rapporten.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.82rem', flexWrap: 'wrap' }}>
                <span style={{ flex: '1 1 200px', fontWeight: 600, color: '#0d1b3e' }}>{r.titel}</span>
                <span className="mono" style={{ color: '#8ba8c4', flexShrink: 0 }}>{new Date(r.aangemaakt_op).toLocaleDateString('nl-NL')}</span>
                {r.getekend_op ? (
                  <span style={{ flexShrink: 0, fontSize: '.7rem', fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: 'rgba(45,138,78,.12)', color: '#15803d' }}>✓ Getekend</span>
                ) : (
                  <span style={{ flexShrink: 0, fontSize: '.7rem', fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: '#f1f5f9', color: '#64748b' }}>Niet getekend</span>
                )}
                <a href={`/klussen/${klusId}/oplevering?rapport=${r.id}`} className="btn btn-ghost btn-sm">Bewerken</a>
                <a href={`/rapporten/${r.id}/print`} target="_blank" className="btn btn-ghost btn-sm">Print</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
