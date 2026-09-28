export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { formatEuro } from '@/lib/db'
import Icon from '@/components/Icon'
import { haalJaarCijfers, moneybirdDocUrl, type JaarCijfers } from '@/lib/fiscaal/moneybird-data'
import { haalProfiel } from '@/lib/fiscaal/profiel'
import { maakAdvies, type Signaal } from '@/lib/fiscaal/analyse'
import ProfielForm from './ProfielForm'

export const metadata: Metadata = { title: 'Fiscaal' }

const KLEUR: Record<Signaal['niveau'], { rand: string; bg: string; label: string }> = {
  actie:        { rand: '#dc2626', bg: 'var(--soft-red)', label: 'Actie' },
  waarschuwing: { rand: '#ea580c', bg: 'var(--soft-orange)', label: 'Let op' },
  kans:         { rand: '#16a34a', bg: 'var(--soft-green)', label: 'Kans' },
  info:         { rand: '#1d4fa3', bg: 'var(--accent-soft)', label: 'Info' },
}

function Balk({ pct, kleur }: { pct: number; kleur: string }) {
  return (
    <div style={{ height: 10, background: 'var(--line-soft)', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: kleur, borderRadius: 99 }} />
    </div>
  )
}

function Rij({ label, bedrag, sterk, min }: { label: string; bedrag: number | null; sterk?: boolean; min?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-soft)', fontSize: '.84rem', fontWeight: sterk ? 800 : 400 }}>
      <span style={{ color: sterk ? 'var(--text)' : 'var(--text-2)' }}>{label}</span>
      <span className="mono" style={{ fontSize: '.82rem' }}>{bedrag == null ? '—' : `${min ? '− ' : ''}${formatEuro(bedrag)}`}</span>
    </div>
  )
}

export default async function FiscaalPage({ searchParams }: { searchParams: { jaar?: string } }) {
  const jaar = Number(searchParams.jaar) || new Date().getFullYear()
  const gekoppeld = !!process.env.MONEYBIRD_API_TOKEN && !!process.env.MONEYBIRD_ADMIN_ID
  const profiel = await haalProfiel(jaar)

  let cijfers: JaarCijfers | null = null
  let fout: string | null = null
  if (gekoppeld) {
    try {
      cijfers = await haalJaarCijfers(jaar)
    } catch (err) {
      fout = err instanceof Error ? err.message : String(err)
    }
  }

  const a = cijfers ? maakAdvies(cijfers, profiel) : null
  const t = a?.tarieven

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Fiscaal {jaar}</h1>
          <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--text-soft)' }}>
            Belastingreserve, KIA en aandachtspunten — live uit Moneybird.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`/fiscaal?jaar=${jaar - 1}`} className="btn btn-ghost btn-sm"><Icon name="chevron-left" size={14} />{jaar - 1}</a>
          <a href={`/fiscaal?jaar=${jaar + 1}`} className="btn btn-ghost btn-sm">{jaar + 1}<Icon name="chevron-right" size={14} /></a>
        </div>
      </div>

      {!gekoppeld && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #ea580c' }}>
          Moneybird is nog niet gekoppeld. Voeg <code>MONEYBIRD_API_TOKEN</code> en <code>MONEYBIRD_ADMIN_ID</code> toe in Vercel
          (zie <a href="/instellingen/boekhouding" style={{ color: 'var(--accent)' }}>Boekhouding</a>).
        </div>
      )}
      {fout && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #dc2626' }}>
          <strong>Moneybird-gegevens konden niet worden opgehaald.</strong>
          <div style={{ fontSize: '.84rem', color: 'var(--text-mute)', marginTop: 4 }}>{fout}</div>
        </div>
      )}

      {a && cijfers && t && (
        <>
          {/* ── Kerncijfers ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="stat-card" style={{ borderLeft: '3px solid #1d4fa3' }}>
              <div className="stat-label">Winst t/m vandaag</div>
              <div className="stat-value" style={{ fontSize: '1.35rem' }}>{formatEuro(a.winstYtd)}</div>
              <div className="stat-sub">Omzet {formatEuro(a.omzet)} − kosten {formatEuro(a.kosten + a.afschrijving)}</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid #7c3aed' }}>
              <div className="stat-label">Prognose jaarwinst</div>
              <div className="stat-value" style={{ fontSize: '1.35rem', color: '#7c3aed' }}>{formatEuro(a.prognoseWinst)}</div>
              <div className="stat-sub">{a.prognoseFactor > 1 ? 'Huidig tempo doorgetrokken t/m 31 dec' : 'Werkelijke cijfers'}</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid #dc2626' }}>
              <div className="stat-label">Belasting over winst tot nu</div>
              <div className="stat-value" style={{ fontSize: '1.35rem', color: '#dc2626' }}>{formatEuro(a.nu.extra)}</div>
              <div className="stat-sub">IB + Zvw · ≈ {Math.round(a.nu.effectiefPct * 100)}% van je winst</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid #16a34a' }}>
              <div className="stat-label">Per maand apart zetten</div>
              <div className="stat-value" style={{ fontSize: '1.35rem', color: 'var(--tint-green)' }}>{formatEuro(a.perMaand)}</div>
              <div className="stat-sub">
                Jaar: {formatEuro(a.prognose.extra)} · al apart {formatEuro(profiel.reserve_apart)}
                {a.resterendeMaanden > 0 && ` · ${a.resterendeMaanden} mnd`}
              </div>
            </div>
          </div>

          {/* ── Voortgang ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="card">
              <div className="section-label">KIA — investeringsaftrek</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.86rem' }}>
                <span><strong>{formatEuro(a.kiaTotaal)}</strong> geïnvesteerd</span>
                <span style={{ color: 'var(--text-mute)' }}>drempel {formatEuro(t.kia.ondergrens)}</span>
              </div>
              <Balk pct={(a.kiaTotaal / t.kia.ondergrens) * 100} kleur={a.kiaTotaal >= t.kia.ondergrens ? '#16a34a' : '#1d4fa3'} />
              <div style={{ fontSize: '.78rem', color: 'var(--text-mute)', marginTop: 8, lineHeight: 1.6 }}>
                {a.kiaTotaal >= t.kia.ondergrens
                  ? <>KIA: {formatEuro(a.kiaAftrek)} aftrek ≈ <strong>{formatEuro(a.kiaVoordeel)}</strong> minder belasting.</>
                  : <>Nog {formatEuro(a.kiaTekort)} tot de drempel. Alleen bedrijfsmiddelen ≥ {formatEuro(t.kia.minPerBedrijfsmiddel)} per stuk tellen mee.</>}
                {a.kiaPotentieel > a.kiaTotaal && <> Mogelijk nog {formatEuro(a.kiaPotentieel - a.kiaTotaal)} als kosten geboekt (zie signalen).</>}
              </div>
            </div>

            <div className="card">
              <div className="section-label">Urencriterium</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.86rem' }}>
                <span><strong>Niet geregistreerd</strong></span>
                <span style={{ color: 'var(--text-mute)' }}>nodig: &gt; {a.urenNodig.toLocaleString('nl-NL')} uur</span>
              </div>
              <Balk pct={0} kleur="#ea580c" />
              <div style={{ fontSize: '.78rem', color: 'var(--text-mute)', marginTop: 8, lineHeight: 1.6 }}>
                Naast {t.urencriterium.toLocaleString('nl-NL')} uur moet een starter méér uren in het bedrijf steken dan in
                loondienst (± {a.urenLoondienstJaar.toLocaleString('nl-NL')} uur). Zelfstandigen- en startersaftrek zijn
                daarom {profiel.urencriterium ? <strong>wél</strong> : <strong>niet</strong>} meegerekend.
              </div>
            </div>
          </div>

          {/* ── Signalen ── */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-label">Advies &amp; aandachtspunten ({a.signalen.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {a.signalen.map((s, i) => {
                const k = KLEUR[s.niveau]
                return (
                  <div key={i} style={{ borderLeft: `4px solid ${k.rand}`, background: k.bg, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '.7rem', fontWeight: 800, color: k.rand, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '.9rem', marginTop: 2 }}>{s.titel}</div>
                    <div style={{ fontSize: '.82rem', color: 'var(--text-2)', marginTop: 4, lineHeight: 1.6 }}>{s.tekst}</div>
                    {s.items && s.items.length > 0 && (
                      <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: '.78rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
                        {s.items.map((it, j) => (
                          <li key={j}>
                            {it.docId
                              ? <a href={moneybirdDocUrl(it.docId)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{it.label}</a>
                              : it.label}
                            {it.bedrag != null && <span className="mono"> · {formatEuro(it.bedrag)}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Berekening ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="card">
              <div className="section-label">Berekening prognose {jaar}</div>
              <Rij label="Winst (prognose)" bedrag={a.prognoseWinst} />
              <Rij label="KIA" bedrag={a.totaalPrognose.kia} min />
              <Rij label="Zelfstandigen- + startersaftrek" bedrag={a.totaalPrognose.zelfstandigenaftrek + a.totaalPrognose.startersaftrek} min />
              <Rij label={`MKB-winstvrijstelling (${(t.mkbWinstvrijstellingPct * 100).toFixed(1)}%)`} bedrag={a.totaalPrognose.mkbVrijstelling} min />
              <Rij label="Belastbare winst" bedrag={a.totaalPrognose.belastbareWinst} sterk />
              <Rij label={`Loon${a.loonIsAanname ? ' (aanname!)' : ''}`} bedrag={a.loon} />
              <Rij label="Belastbaar inkomen box 1" bedrag={a.totaalPrognose.verzamelinkomen} sterk />
              <Rij label="Belasting box 1" bedrag={a.totaalPrognose.box1Belasting} />
              {a.totaalPrognose.tariefsaanpassing > 0 && <Rij label="Tariefsaanpassing aftrekposten" bedrag={a.totaalPrognose.tariefsaanpassing} />}
              <Rij label="Algemene heffingskorting" bedrag={a.totaalPrognose.algemeneHeffingskorting} min />
              <Rij label="Arbeidskorting" bedrag={a.totaalPrognose.arbeidskorting} min />
              <Rij label="Inkomstenbelasting" bedrag={a.totaalPrognose.inkomstenbelasting} sterk />
              <Rij label={`Zvw-bijdrage (${(t.zvw.pct * 100).toFixed(2)}%)`} bedrag={a.totaalPrognose.zvw} />
              <Rij label="Totaal IB + Zvw" bedrag={a.totaalPrognose.totaal} sterk />
              <Rij label="Ingehouden loonheffing (verwacht)" bedrag={a.loonheffing} min />
              <Rij label={a.teBetalenBijAangifte != null && a.teBetalenBijAangifte < 0 ? 'Verwachte teruggave' : 'Verwacht bij te betalen'} bedrag={a.teBetalenBijAangifte != null ? Math.abs(a.teBetalenBijAangifte) : null} sterk />
            </div>

            <div className="card">
              <div className="section-label">Moneybird-check: waar staan je uitgaven?</div>
              <p style={{ fontSize: '.78rem', color: 'var(--text-mute)', margin: '0 0 8px' }}>
                {cijfers.aantalVerkoopfacturen} verkoopfacturen · {cijfers.aantalDocumenten} inkoopfacturen/bonnen in {jaar}.
              </p>
              {cijfers.kostenPerGrootboek.length === 0 && <p style={{ fontSize: '.84rem', color: 'var(--text-soft)' }}>Nog geen inkoop geboekt.</p>}
              {cijfers.kostenPerGrootboek.map(g => (
                <div key={g.naam} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line-soft)', fontSize: '.82rem' }}>
                  <span>
                    {g.naam}
                    <span style={{ color: 'var(--text-soft)', fontSize: '.72rem' }}> · {g.aantal}× · {typeLabel(g.type)}</span>
                  </span>
                  <span className="mono">{formatEuro(g.bedrag)}</span>
                </div>
              ))}
              {a.afschrijving > 0 && (
                <p style={{ fontSize: '.74rem', color: 'var(--text-mute)', marginTop: 8 }}>
                  Afschrijving investeringen geschat op {formatEuro(a.afschrijving)} (20% per jaar, naar rato).
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Profiel ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Profiel {jaar} — loondienst &amp; keuzes</div>
        <ProfielForm profiel={profiel} />
      </div>

      <p style={{ fontSize: '.74rem', color: 'var(--text-soft)', lineHeight: 1.6 }}>
        Schatting op basis van Moneybird en de tarieven {t?.jaar ?? jaar} (bron: Belastingdienst). Uitgangspunten: geen fiscaal
        partner, huurwoning, geen andere aftrekposten, factuurstelsel. Dit vervangt geen aangifte of boekhouder — controleer grote
        beslissingen altijd.
      </p>
    </div>
  )
}

function typeLabel(type: string | null) {
  switch (type) {
    case 'expenses': return 'kosten'
    case 'direct_costs': return 'inkoopkosten'
    case 'other_income_expenses': return 'overige kosten'
    case 'non_current_assets': return 'investering'
    case 'current_assets': return 'vlottende activa'
    case null: return 'geen categorie'
    default: return type
  }
}
