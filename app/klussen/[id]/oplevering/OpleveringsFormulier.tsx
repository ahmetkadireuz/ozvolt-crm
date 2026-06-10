'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from '@/components/SignatureCanvas'
import {
  checklistSecties,
  RAPPORT_TYPES,
  RAPPORT_TYPE_LABELS,
  type RapportType,
  type ChecklistSectie,
} from '@/lib/oplevering-checklists'

type Rij = { punt: string; waarde: '' | 'ja' | 'nee' | 'nvt'; opmerking: string }
type Sectie = { titel: string; rijen: Rij[] }

interface Props {
  klusId: number
  klantId: number
  klantNaam: string
  typeWerk: string | null
  werkzaamhedenSecties: ChecklistSectie[]
  bestaandRapport: {
    id: number
    type: string | null
    titel: string
    inhoud: { secties?: Sectie[]; aanvullend?: string } | null
    handtekening_monteur: string | null
    handtekening_klant: string | null
  } | null
}

function naarSecties(bron: ChecklistSectie[]): Sectie[] {
  return bron.map(s => ({ titel: s.titel, rijen: s.punten.map(p => ({ punt: p, waarde: '' as const, opmerking: '' })) }))
}

export default function OpleveringsFormulier({ klusId, klantId, klantNaam, typeWerk, werkzaamhedenSecties, bestaandRapport }: Props) {
  const router = useRouter()
  const bestaandType = bestaandRapport?.type && RAPPORT_TYPES.includes(bestaandRapport.type as RapportType)
    ? (bestaandRapport.type as RapportType) : null

  const [type, setType] = useState<RapportType | null>(bestaandType)
  const [secties, setSecties] = useState<Sectie[]>(
    bestaandRapport?.inhoud?.secties?.length ? bestaandRapport.inhoud.secties : []
  )
  const [aanvullend, setAanvullend] = useState(bestaandRapport?.inhoud?.aanvullend ?? '')
  const [sigMonteur, setSigMonteur] = useState(bestaandRapport?.handtekening_monteur ?? '')
  const [sigKlant, setSigKlant] = useState(bestaandRapport?.handtekening_klant ?? '')
  const [rapportId, setRapportId] = useState<number | null>(bestaandRapport?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function kiesType(t: RapportType) {
    setType(t)
    if (!secties.length) {
      setSecties(naarSecties(t === 'werkzaamheden' ? werkzaamhedenSecties : checklistSecties(t)))
    }
  }

  function zetWaarde(si: number, ri: number, waarde: Rij['waarde']) {
    setSecties(prev => prev.map((s, i) => i !== si ? s : {
      ...s, rijen: s.rijen.map((r, j) => j !== ri ? r : { ...r, waarde: r.waarde === waarde ? '' : waarde }),
    }))
  }
  function zetOpmerking(si: number, ri: number, opmerking: string) {
    setSecties(prev => prev.map((s, i) => i !== si ? s : {
      ...s, rijen: s.rijen.map((r, j) => j !== ri ? r : { ...r, opmerking }),
    }))
  }
  function zetPunt(si: number, ri: number, punt: string) {
    setSecties(prev => prev.map((s, i) => i !== si ? s : {
      ...s, rijen: s.rijen.map((r, j) => j !== ri ? r : { ...r, punt }),
    }))
  }
  function verwijderRij(si: number, ri: number) {
    setSecties(prev => prev.map((s, i) => i !== si ? s : { ...s, rijen: s.rijen.filter((_, j) => j !== ri) }))
  }
  function voegRijToe(si: number) {
    setSecties(prev => prev.map((s, i) => i !== si ? s : { ...s, rijen: [...s.rijen, { punt: '', waarde: '', opmerking: '' }] }))
  }
  function voegSectieToe() {
    setSecties(prev => [...prev, { titel: `${prev.length + 1}. Nieuwe sectie`, rijen: [{ punt: '', waarde: '', opmerking: '' }] }])
  }
  function verwijderSectie(si: number) {
    setSecties(prev => prev.filter((_, i) => i !== si))
  }
  function zetSectieTitel(si: number, titel: string) {
    setSecties(prev => prev.map((s, i) => i !== si ? s : { ...s, titel }))
  }

  async function opslaan() {
    if (!type) return
    setSaving(true)
    setMsg('')
    const inhoud = {
      type,
      datum: new Date().toISOString().slice(0, 10),
      secties: secties.map(s => ({ ...s, rijen: s.rijen.filter(r => r.punt.trim()) })).filter(s => s.titel.trim()),
      aanvullend,
    }
    const titel = `Opleveringsrapport ${type === 'werkzaamheden' ? (typeWerk || 'Werkzaamheden') : RAPPORT_TYPE_LABELS[type]} — ${klantNaam}`

    try {
      if (rapportId) {
        const res = await fetch(`/api/opleveringsrapporten/${rapportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titel, inhoud, handtekening_monteur: sigMonteur || null, handtekening_klant: sigKlant || null }),
        })
        if (!res.ok) throw new Error()
        setMsg('Rapport bijgewerkt.')
      } else {
        const res = await fetch('/api/opleveringsrapporten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            klus_id: klusId, klant_id: klantId, titel, type, inhoud,
            handtekening_monteur: sigMonteur || null, handtekening_klant: sigKlant || null,
          }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setRapportId(data.id)
        setMsg('Rapport opgeslagen.')
      }
      router.refresh()
    } catch {
      setMsg('Opslaan mislukt — probeer opnieuw.')
    }
    setSaving(false)
  }

  // ── Stap 1: type kiezen ──
  if (!type) {
    return (
      <div className="card" style={{ maxWidth: 560, textAlign: 'center', padding: '32px 24px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, color: '#0d1b3e' }}>Kies het type oplevering</h2>
        <p style={{ color: '#8ba8c4', fontSize: 13, margin: '0 0 20px' }}>De checklist wordt hierop afgestemd.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {RAPPORT_TYPES.map(t => (
            <button key={t} type="button" className="btn btn-ghost" onClick={() => kiesType(t)}
              style={{ flexDirection: 'column', padding: '18px 26px', gap: 6, border: '2px solid #0d1b3e', borderRadius: 12 }}>
              <span style={{ fontSize: 26 }}>{t === 'groepenkast' ? '⚡' : t === 'laadpaal' ? '🔌' : '📋'}</span>
              <span style={{ fontWeight: 700 }}>{t === 'werkzaamheden' ? 'Op basis van werkzaamheden' : RAPPORT_TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Stap 2: checklist invullen ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 700, color: '#0d1b3e' }}>
          {type === 'werkzaamheden' ? (typeWerk || 'Werkzaamheden') : RAPPORT_TYPE_LABELS[type]}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {rapportId && (
            <a href={`/rapporten/${rapportId}/print`} target="_blank" className="btn btn-ghost btn-sm">
              <span className="nav-ico" style={{ fontSize: 15 }}>print</span> Afdrukken / PDF
            </a>
          )}
          <button className="btn btn-primary btn-sm" onClick={opslaan} disabled={saving}>
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </div>

      {msg && <div className={`alert ${msg.includes('mislukt') ? 'alert-err' : 'alert-ok'}`}>{msg}</div>}

      {secties.map((sectie, si) => (
        <div key={si} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#0d1b3e', padding: '8px 14px', gap: 8 }}>
            <input
              value={sectie.titel}
              onChange={e => zetSectieTitel(si, e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', outline: 'none' }}
            />
            <button type="button" onClick={() => verwijderSectie(si)} title="Sectie verwijderen"
              style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
          <div style={{ padding: '4px 0' }}>
            {sectie.rijen.map((rij, ri) => (
              <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                <input
                  value={rij.punt}
                  onChange={e => zetPunt(si, ri, e.target.value)}
                  placeholder="Controlepunt…"
                  style={{ flex: '1 1 220px', border: 'none', fontSize: 13, color: '#1e293b', outline: 'none', background: 'transparent', minWidth: 0 }}
                />
                <div style={{ display: 'inline-flex', border: '1.5px solid #cbd5e1', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                  {(['ja', 'nee', 'nvt'] as const).map(w => (
                    <button key={w} type="button" onClick={() => zetWaarde(si, ri, w)}
                      style={{
                        padding: '4px 10px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                        borderRight: w !== 'nvt' ? '1px solid #cbd5e1' : 'none',
                        background: rij.waarde === w ? (w === 'ja' ? '#dcfce7' : w === 'nee' ? '#fee2e2' : '#f1f5f9') : '#fff',
                        color: rij.waarde === w ? (w === 'ja' ? '#15803d' : w === 'nee' ? '#dc2626' : '#64748b') : '#94a3b8',
                      }}>
                      {w === 'ja' ? 'Ja' : w === 'nee' ? 'Nee' : 'N.v.t.'}
                    </button>
                  ))}
                </div>
                <input
                  value={rij.opmerking}
                  onChange={e => zetOpmerking(si, ri, e.target.value)}
                  placeholder="Opmerking…"
                  maxLength={200}
                  style={{ flex: '1 1 140px', border: 'none', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#475569', outline: 'none', background: 'transparent', minWidth: 0 }}
                />
                <button type="button" onClick={() => verwijderRij(si, ri)} title="Punt verwijderen"
                  style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
              </div>
            ))}
            <button type="button" onClick={() => voegRijToe(si)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, color: '#0d1b3e', background: '#f8fafc', border: 'none', borderTop: '1px dashed #cbd5e1', cursor: 'pointer' }}>
              ＋ Punt toevoegen
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={voegSectieToe} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
        ＋ Sectie toevoegen
      </button>

      <div className="card">
        <div className="section-label">Aanvullende opmerkingen</div>
        <textarea
          value={aanvullend}
          onChange={e => setAanvullend(e.target.value)}
          rows={3}
          placeholder="Eventuele aanvullende opmerkingen…"
          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="section-label">Handtekening monteur</div>
          <SignatureCanvas initial={bestaandRapport?.handtekening_monteur} onChange={setSigMonteur} />
          <p style={{ fontSize: 11, color: '#8ba8c4', margin: '8px 0 0' }}>Ozvolt Elektrotechniek — {new Date().toLocaleDateString('nl-NL')}</p>
        </div>
        <div className="card">
          <div className="section-label">Handtekening klant</div>
          {bestaandRapport?.handtekening_klant ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bestaandRapport.handtekening_klant} alt="Handtekening klant" style={{ maxHeight: 100, border: '1px solid #e2e8f0', borderRadius: 8 }} />
              <p style={{ fontSize: 11, color: '#15803d', margin: '8px 0 0', fontWeight: 700 }}>✓ Getekend door klant</p>
            </>
          ) : (
            <>
              <SignatureCanvas onChange={setSigKlant} />
              <p style={{ fontSize: 11, color: '#8ba8c4', margin: '8px 0 0' }}>
                {klantNaam} kan ook digitaal tekenen via het klantportaal — sla het rapport op en stuur een portaal-link.
              </p>
            </>
          )}
        </div>
      </div>

      <button className="btn btn-primary" onClick={opslaan} disabled={saving} style={{ justifyContent: 'center' }}>
        {saving ? 'Opslaan…' : rapportId ? 'Wijzigingen opslaan' : 'Rapport opslaan'}
      </button>
    </div>
  )
}
