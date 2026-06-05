export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql, formatEuro } from '@/lib/db'

export default async function KlantDashboard() {
  const klantId = await getKlantSessie()
  if (!klantId) redirect('/klant/geen-toegang')

  const [klantRows, klussen, offertes, facturen, rapporten, documenten] = await Promise.all([
    sql`SELECT naam, email, telefoon, locatie FROM klanten WHERE id = ${klantId}`,
    sql`SELECT id, type_werk, omschrijving, status, aangemaakt_op FROM klussen WHERE klant_id = ${klantId} ORDER BY aangemaakt_op DESC`,
    sql`SELECT id, klus_id, offertenummer, status, datum, regels, korting_pct, btw_pct, wa_items, bijlagen FROM offertes WHERE klant_id = ${klantId} ORDER BY datum DESC`,
    sql`SELECT id, factuurnummer, status, factuurdatum, regels, btw_pct, mollie_status FROM facturen WHERE klant_id = ${klantId} ORDER BY factuurdatum DESC`,
    sql`SELECT id, klus_id, titel, aangemaakt_op FROM opleveringsrapporten WHERE klant_id = ${klantId} ORDER BY aangemaakt_op DESC`,
    sql`SELECT id, naam, url, aangemaakt_op FROM groenverklaringen WHERE klant_id = ${klantId} ORDER BY aangemaakt_op DESC`,
  ])

  const klant = klantRows[0]
  if (!klant) redirect('/klant/geen-toegang')

  function totaalOfferte(o: Record<string, any>) {
    const sub = o.regels.reduce((s: number, r: { aantal: number; prijs: number }) => s + r.aantal * r.prijs, 0)
    const na = sub * (1 - o.korting_pct / 100)
    return na * (1 + o.btw_pct / 100)
  }

  function totaalFactuur(f: Record<string, any>) {
    const sub = f.regels.reduce((s: number, r: { aantal: number; prijs: number }) => s + r.aantal * r.prijs, 0)
    return sub * (1 + f.btw_pct / 100)
  }

  const statusKleur: Record<string, string> = {
    nieuw: '#f59e0b', gepland: '#3b82f6', bezig: '#8b5cf6',
    afgerond: '#16a34a', geannuleerd: '#ef4444',
    concept: '#94a3b8', verzonden: '#f59e0b', geaccepteerd: '#16a34a',
    betaald: '#16a34a', openstaand: '#ef4444', 'te laat': '#dc2626',
  }

  return (
    <div>
      <h1 style={{ color: '#0d1b3e', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
        Goedendag, {klant.naam.split(' ')[0]} 👋
      </h1>
      <p style={{ color: '#64748b', margin: '0 0 32px', fontSize: 14 }}>
        Hier vindt u uw projecten, offertes en facturen.
      </p>

      {/* Klussen */}
      <Section titel="Uw projecten">
        {klussen.length === 0 ? <Leeg tekst="Geen lopende projecten" /> : klussen.map((k: any) => {
          // Zoek offerte gekoppeld aan deze klus met werkzaamheden
          const gekoppeldeOfferte = offertes.find((o: any) =>
            o.klus_id === k.id && Array.isArray(o.wa_items) && o.wa_items.length > 0
          ) ?? offertes.find((o: any) => Array.isArray(o.wa_items) && o.wa_items.length > 0)
          const waItems: any[] = gekoppeldeOfferte?.wa_items ?? []
          return (
            <Kaart key={k.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0d1b3e' }}>{k.type_werk || 'Project'}</div>
                  {k.omschrijving && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{k.omschrijving}</div>}
                </div>
                <Badge tekst={k.status} kleur={statusKleur[k.status] ?? '#64748b'} />
              </div>
              {waItems.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Afgesproken werkzaamheden</div>
                  {waItems.map((w: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: '#3b82f6', marginTop: 1 }}>•</span>
                      <div>
                        <span style={{ fontWeight: 600, color: '#0d1b3e' }}>{w.omschrijving}</span>
                        {w.toelichting && <span style={{ color: '#64748b' }}> — {w.toelichting}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Kaart>
          )
        })}
      </Section>

      {/* Offertes */}
      <Section titel="Offertes">
        {offertes.length === 0 ? <Leeg tekst="Geen offertes" /> : offertes.map((o: any) => (
          <a key={o.id} href={`/klant/offerte/${o.id}`} style={{ textDecoration: 'none' }}>
            <Kaart hover>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0d1b3e' }}>Offerte #{o.offertenummer}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{new Date(o.datum).toLocaleDateString('nl-NL')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0d1b3e' }}>{formatEuro(totaalOfferte(o))}</div>
                  <Badge tekst={o.status} kleur={statusKleur[o.status] ?? '#64748b'} />
                </div>
              </div>
            </Kaart>
          </a>
        ))}
      </Section>

      {/* Financieel overzicht */}
      {facturen.length > 0 && (() => {
        const totaalOpen = facturen
          .filter((f: any) => f.mollie_status !== 'paid' && f.status !== 'betaald')
          .reduce((s: number, f: any) => s + f.regels.reduce((r: number, l: any) => r + l.aantal * l.prijs, 0) * (1 + f.btw_pct / 100), 0)
        const totaalBetaald = facturen
          .filter((f: any) => f.mollie_status === 'paid' || f.status === 'betaald')
          .reduce((s: number, f: any) => s + f.regels.reduce((r: number, l: any) => r + l.aantal * l.prijs, 0) * (1 + f.btw_pct / 100), 0)
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 32 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Openstaand</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: totaalOpen > 0 ? '#dc2626' : '#16a34a', marginTop: 4 }}>{formatEuro(totaalOpen)}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Betaald</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{formatEuro(totaalBetaald)}</div>
            </div>
          </div>
        )
      })()}

      {/* Facturen */}
      <Section titel="Facturen">
        {facturen.length === 0 ? <Leeg tekst="Geen facturen" /> : facturen.map((f: any) => (
          <a key={f.id} href={`/klant/factuur/${f.id}`} style={{ textDecoration: 'none' }}>
            <Kaart hover>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0d1b3e' }}>Factuur {f.factuurnummer}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{new Date(f.factuurdatum).toLocaleDateString('nl-NL')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0d1b3e' }}>{formatEuro(totaalFactuur(f))}</div>
                  <Badge tekst={f.mollie_status === 'paid' ? 'betaald' : f.status} kleur={f.mollie_status === 'paid' ? '#16a34a' : (statusKleur[f.status] ?? '#64748b')} />
                </div>
              </div>
            </Kaart>
          </a>
        ))}
      </Section>

      {/* Opleveringsrapporten */}
      {rapporten.length > 0 && (
        <Section titel="Opleveringsrapporten">
          {rapporten.map((r: any) => (
            <a key={r.id} href={`/klant/rapport/${r.id}`} style={{ textDecoration: 'none' }}>
              <Kaart hover>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0d1b3e' }}>{r.titel}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(r.aangemaakt_op).toLocaleDateString('nl-NL')}</div>
                </div>
              </Kaart>
            </a>
          ))}
        </Section>
      )}

      {/* Documenten / groenverklaring */}
      {documenten.length > 0 && (
        <Section titel="Documenten">
          {documenten.map((d: any) => (
            <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Kaart hover>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0d1b3e' }}>{d.naam}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{new Date(d.aangemaakt_op).toLocaleDateString('nl-NL')}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>Downloaden ↗</span>
                </div>
              </Kaart>
            </a>
          ))}
        </Section>
      )}

      {/* Profiel link */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <a href="/klant/profiel" style={{ color: '#64748b', fontSize: 13, textDecoration: 'underline' }}>
          Mijn gegevens wijzigen
        </a>
      </div>
    </div>
  )
}

function Section({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
        {titel}
      </h2>
      {children}
    </div>
  )
}

function Kaart({ children, hover }: { children: React.ReactNode; hover?: boolean }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 8,
      border: '1px solid #e2e8f0',
      cursor: hover ? 'pointer' : 'default',
      transition: 'box-shadow .15s',
    }}>
      {children}
    </div>
  )
}

function Badge({ tekst, kleur }: { tekst: string; kleur: string }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 20,
      background: kleur + '18', color: kleur,
      marginTop: 4,
    }}>
      {tekst}
    </span>
  )
}

function Leeg({ tekst }: { tekst: string }) {
  return <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{tekst}</p>
}
