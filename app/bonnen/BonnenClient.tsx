'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatEuro } from '@/lib/utils'
import type { AnalyseRij, DocSoort } from '@/lib/bonnen/data'

export type BonItem = {
  id: string
  soort: DocSoort
  datum: string
  leverancier: string
  totaal: number
  heeftBijlage: boolean
  regels: { id: string; omschrijving: string; grootboek_id: string | null }[]
  analyse: AnalyseRij | null
}

type Grootboek = { id: string; naam: string; type: string }

const NIVEAU: Record<string, { kleur: string; bg: string; label: string }> = {
  actie: { kleur: '#dc2626', bg: 'var(--soft-red)', label: 'Actie' },
  let_op: { kleur: '#ea580c', bg: 'var(--soft-orange)', label: 'Let op' },
  info: { kleur: '#1d4fa3', bg: 'var(--accent-soft)', label: 'Info' },
}

function heeftVoorstel(item: BonItem) {
  const a = item.analyse?.analyse
  if (!a || item.analyse?.status !== 'geanalyseerd') return false
  return a.regels.some(r => r.voorgesteld_grootboek_id && r.voorgesteld_grootboek_id !== r.huidig_grootboek_id)
    || a.aandachtspunten.some(p => p.niveau !== 'info')
}

export default function BonnenClient({ items, grootboeken, adminId }: { items: BonItem[]; grootboeken: Grootboek[]; adminId: string }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'controleren' | 'nieuw' | 'alles'>('controleren')
  const [bezigIds, setBezigIds] = useState<Set<string>>(new Set())
  const [voortgang, setVoortgang] = useState<string | null>(null)
  const [fouten, setFouten] = useState<Record<string, string>>({})

  const naam = useMemo(() => new Map(grootboeken.map(g => [g.id, g.naam])), [grootboeken])
  const nieuw = items.filter(i => !i.analyse)
  const teControleren = items.filter(heeftVoorstel)
  const zichtbaar = filter === 'alles' ? items : filter === 'nieuw' ? nieuw : teControleren

  async function actie(item: BonItem, body: Record<string, unknown>) {
    setBezigIds(s => new Set(s).add(item.id))
    setFouten(f => ({ ...f, [item.id]: '' }))
    try {
      const res = await fetch(`/api/bonnen/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soort: item.soort, ...body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Fout ${res.status}`)
      return true
    } catch (err) {
      setFouten(f => ({ ...f, [item.id]: err instanceof Error ? err.message : String(err) }))
      return false
    } finally {
      setBezigIds(s => { const n = new Set(s); n.delete(item.id); return n })
    }
  }

  async function analyseerAlle() {
    const lijst = nieuw.slice(0, 20)
    for (let i = 0; i < lijst.length; i++) {
      setVoortgang(`AI controleert ${i + 1} van ${lijst.length}…`)
      await actie(lijst[i], { actie: 'analyseer' })
    }
    setVoortgang(null)
    setFilter('controleren')
    router.refresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div className="filter-tabs" style={{ display: 'flex', gap: 6, flex: '1 1 320px', minWidth: 0 }}>
          {([['controleren', `Te controleren (${teControleren.length})`], ['nieuw', `Nog niet gecontroleerd (${nieuw.length})`], ['alles', `Alles (${items.length})`]] as const).map(([k, l]) => (
            <button key={k} type="button" className={`filter-tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <button type="button" className="btn btn-primary" style={{ flex: '0 1 auto', justifyContent: 'center' }} disabled={!!voortgang || nieuw.length === 0} onClick={analyseerAlle}>
          {voortgang ?? (nieuw.length > 20 ? 'Controleer 20 nieuwe met AI' : `Controleer ${nieuw.length} nieuwe met AI`)}
        </button>
      </div>

      {zichtbaar.length === 0 && (
        <div className="card" style={{ color: 'var(--text-mute)', fontSize: '.86rem' }}>
          {filter === 'controleren' ? 'Niets te controleren — alle gecontroleerde bonnen zien er goed uit.' : 'Geen documenten in de laatste 3 maanden.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {zichtbaar.map(item => (
          <BonKaart
            key={`${item.id}-${item.analyse?.bijgewerkt_op ?? 'nieuw'}`}
            item={item}
            grootboeken={grootboeken}
            naam={naam}
            adminId={adminId}
            bezig={bezigIds.has(item.id)}
            fout={fouten[item.id]}
            onAnalyseer={async () => { if (await actie(item, { actie: 'analyseer' })) router.refresh() }}
            onNegeer={async () => { if (await actie(item, { actie: 'negeren' })) router.refresh() }}
            onToepassen={async (wijzigingen) => { if (await actie(item, { actie: 'toepassen', wijzigingen })) router.refresh() }}
          />
        ))}
      </div>
    </div>
  )
}

function BonKaart({ item, grootboeken, naam, adminId, bezig, fout, onAnalyseer, onNegeer, onToepassen }: {
  item: BonItem
  grootboeken: Grootboek[]
  naam: Map<string, string>
  adminId: string
  bezig: boolean
  fout?: string
  onAnalyseer: () => void
  onNegeer: () => void
  onToepassen: (w: { detail_id: string; ledger_account_id: string }[]) => void
}) {
  const a = item.analyse?.analyse ?? null
  const status = item.analyse?.status
  const [keuze, setKeuze] = useState<Record<string, string>>(() => {
    const k: Record<string, string> = {}
    for (const r of a?.regels ?? []) k[r.detail_id] = r.voorgesteld_grootboek_id ?? r.huidig_grootboek_id ?? ''
    return k
  })
  const [open, setOpen] = useState(heeftVoorstel(item))

  const wijzigingen = (a?.regels ?? [])
    .filter(r => keuze[r.detail_id] && keuze[r.detail_id] !== r.huidig_grootboek_id)
    .map(r => ({ detail_id: r.detail_id, ledger_account_id: keuze[r.detail_id] }))

  function bevestig() {
    const tekst = wijzigingen
      .map(w => {
        const r = a?.regels.find(x => x.detail_id === w.detail_id)
        return `• ${r?.omschrijving || 'regel'}: ${naam.get(r?.huidig_grootboek_id ?? '') ?? 'geen categorie'} → ${naam.get(w.ledger_account_id)}`
      })
      .join('\n')
    if (confirm(`Deze wijziging(en) doorvoeren in Moneybird?\n\n${tekst}`)) onToepassen(wijzigingen)
  }

  const badge = status === 'toegepast' ? { t: 'Toegepast', c: '#15803d', b: 'var(--tint-green-bg)' }
    : status === 'genegeerd' ? { t: 'Genegeerd', c: 'var(--text-2)', b: 'var(--surface-mute)' }
    : status === 'fout' ? { t: 'Fout', c: '#991b1b', b: 'var(--tint-red-bg)' }
    : a ? (heeftVoorstel(item) ? { t: 'Controleren', c: '#9a3412', b: 'var(--tint-orange-bg)' } : { t: 'In orde', c: '#15803d', b: 'var(--tint-green-bg)' })
    : { t: 'Nieuw', c: '#1d4ed8', b: 'var(--tint-blue-bg)' }

  return (
    <div className="card" style={{ padding: 0 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '.9rem' }}>{item.leverancier}</div>
          <div style={{ fontSize: '.76rem', color: 'var(--text-mute)', marginTop: 2 }}>
            {item.datum ? new Date(item.datum).toLocaleDateString('nl-NL') : '—'} · {item.soort === 'receipts' ? 'bon' : 'inkoopfactuur'}
            {!item.heeftBijlage && <span style={{ color: '#dc2626', fontWeight: 700 }}> · geen bijlage</span>}
            {a?.samenvatting && <> · {a.samenvatting}</>}
          </div>
        </div>
        <span className="mono" style={{ fontWeight: 700, fontSize: '.84rem' }}>{formatEuro(item.totaal)}</span>
        <span style={{ fontSize: '.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: badge.c, background: badge.b, whiteSpace: 'nowrap' }}>{badge.t}</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--line-soft)', padding: '12px 16px 16px' }}>
          {!a && status !== 'fout' && (
            <p style={{ fontSize: '.82rem', color: 'var(--text-mute)', margin: '0 0 10px' }}>Nog niet gecontroleerd door de AI.</p>
          )}
          {status === 'fout' && (
            <p style={{ fontSize: '.82rem', color: '#dc2626', margin: '0 0 10px' }}>Vorige controle mislukt: {item.analyse?.fout}</p>
          )}

          {a && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '.74rem', marginBottom: 10 }}>
                <span className="via-badge">Btw aftrekbaar: {a.btw_aftrekbaar}</span>
                {a.is_investering && <span className="via-badge" style={{ color: 'var(--tint-green)' }}>Investering (KIA)</span>}
                {a.factuurnummer && <span className="via-badge">Nr. {a.factuurnummer}</span>}
              </div>
              {a.btw_toelichting && <p style={{ fontSize: '.8rem', color: 'var(--text-2)', margin: '0 0 10px' }}>{a.btw_toelichting}</p>}

              {a.aandachtspunten.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {a.aandachtspunten.map((p, i) => {
                    const n = NIVEAU[p.niveau] ?? NIVEAU.info
                    return (
                      <div key={i} style={{ borderLeft: `3px solid ${n.kleur}`, background: n.bg, borderRadius: 6, padding: '6px 10px', fontSize: '.8rem', color: 'var(--text-2)' }}>
                        <strong style={{ color: n.kleur }}>{n.label}:</strong> {p.tekst}
                      </div>
                    )
                  })}
                </div>
              )}

              {a.regels.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="section-label" style={{ marginBottom: 6 }}>Categorie per regel</div>
                  {a.regels.map(r => {
                    const gewijzigd = keuze[r.detail_id] && keuze[r.detail_id] !== r.huidig_grootboek_id
                    return (
                      <div key={r.detail_id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, alignItems: 'start', padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                        <div style={{ fontSize: '.8rem' }}>
                          <div style={{ fontWeight: 600 }}>{r.omschrijving || '(geen omschrijving)'} <span className="mono" style={{ color: 'var(--text-mute)' }}>{formatEuro(r.bedrag_excl)}</span></div>
                          <div style={{ color: 'var(--text-mute)', fontSize: '.74rem' }}>Nu: {naam.get(r.huidig_grootboek_id ?? '') ?? 'geen categorie'}</div>
                          {r.reden && <div style={{ color: 'var(--text-2)', fontSize: '.74rem', marginTop: 2 }}>{r.reden}</div>}
                        </div>
                        <select className="form-ctrl" value={keuze[r.detail_id] ?? ''} disabled={status === 'toegepast'}
                          onChange={e => setKeuze(k => ({ ...k, [r.detail_id]: e.target.value }))}
                          style={{ borderColor: gewijzigd ? '#f59e0b' : undefined, fontSize: '.8rem' }}>
                          <option value="">— kies categorie —</option>
                          {grootboeken.map(g => (
                            <option key={g.id} value={g.id}>{g.naam}{g.type === 'non_current_assets' ? ' (investering)' : ''}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {fout && <p style={{ fontSize: '.8rem', color: '#dc2626', margin: '0 0 10px' }}>{fout}</p>}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {a && status !== 'toegepast' && (
              <button type="button" className="btn btn-primary btn-sm" disabled={bezig || wijzigingen.length === 0} onClick={bevestig}>
                {wijzigingen.length === 0 ? 'Geen wijzigingen' : `${wijzigingen.length} wijziging${wijzigingen.length === 1 ? '' : 'en'} toepassen in Moneybird`}
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" disabled={bezig} onClick={onAnalyseer}>
              {bezig ? 'Bezig…' : a ? 'Opnieuw controleren' : 'Controleer met AI'}
            </button>
            {status !== 'genegeerd' && status !== 'toegepast' && (
              <button type="button" className="btn btn-ghost btn-sm" disabled={bezig} onClick={onNegeer}>Negeren</button>
            )}
            <a className="btn btn-ghost btn-sm" href={`https://moneybird.com/${adminId}/documents/${item.id}`} target="_blank" rel="noopener noreferrer">
              Open in Moneybird
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
