export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql, formatEuro } from '@/lib/db'
import { ensureProjectbeheerTables } from '@/lib/projectbeheer'

type Regel = { aantal: number; prijs: number }

function totaalOfferte(o: { regels: Regel[]; korting_pct: number; btw_pct: number }) {
  const sub = o.regels.reduce((s, r) => s + Number(r.aantal) * Number(r.prijs), 0)
  return sub * (1 - o.korting_pct / 100) * (1 + o.btw_pct / 100)
}
function totaalFactuur(f: { regels: Regel[]; btw_pct: number }) {
  const sub = f.regels.reduce((s, r) => s + Number(r.aantal) * Number(r.prijs), 0)
  return sub * (1 + f.btw_pct / 100)
}

function badgeKlasse(status: string): string {
  const s = status.toLowerCase()
  if (['betaald', 'geaccepteerd', 'afgerond'].includes(s)) return 'kp-badge-green'
  if (['te_laat', 'te laat', 'verlopen', 'geweigerd', 'geannuleerd'].includes(s)) return 'kp-badge-red'
  if (['gepland', 'gestuurd', 'verzonden'].includes(s)) return 'kp-badge-blue'
  if (['bezig', 'in_behandeling'].includes(s)) return 'kp-badge-purple'
  if (['nieuw', 'concept', 'openstaand', 'verstuurd'].includes(s)) return 'kp-badge-amber'
  return 'kp-badge-grey'
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    nieuw: 'Nieuw',
    in_behandeling: 'In behandeling',
    gepland: 'Gepland',
    bezig: 'In uitvoering',
    afgerond: 'Afgerond',
    geannuleerd: 'Geannuleerd',
    concept: 'Concept',
    gestuurd: 'Verstuurd',
    geaccepteerd: 'Geaccepteerd',
    geweigerd: 'Geweigerd',
    verlopen: 'Verlopen',
    verstuurd: 'Verstuurd',
    betaald: 'Betaald',
    te_laat: 'Te laat',
    openstaand: 'Openstaand',
  }
  return m[s.toLowerCase()] ?? s.replace(/_/g, ' ')
}

export default async function KlantDashboard() {
  const klantId = await getKlantSessie()
  if (!klantId) redirect('/klant/geen-toegang')

  await ensureProjectbeheerTables()

  const [klantRows, klussen, offertes, facturen, werkafspraken, rapporten, documenten] = await Promise.all([
    sql`SELECT naam, email, telefoon, locatie FROM klanten WHERE id = ${klantId}`,
    sql`SELECT id, type_werk, omschrijving, status, aangemaakt_op FROM klussen WHERE klant_id = ${klantId} ORDER BY aangemaakt_op DESC`,
    sql`SELECT id, klus_id, offertenummer, status, datum, regels, korting_pct, btw_pct, wa_items, bijlagen FROM offertes WHERE klant_id = ${klantId} ORDER BY datum DESC`,
    sql`SELECT id, factuurnummer, status, factuurdatum, regels, btw_pct FROM facturen WHERE klant_id = ${klantId} ORDER BY factuurdatum DESC`,
    sql`SELECT id, afspraaknummer, status, datum, titel, afspraken FROM werkafspraken WHERE klant_id = ${klantId} AND jsonb_array_length(afspraken) > 0 ORDER BY datum DESC`,
    sql`SELECT id, klus_id, titel, aangemaakt_op, getekend_op FROM opleveringsrapporten WHERE klant_id = ${klantId} ORDER BY aangemaakt_op DESC`,
    sql`SELECT id, naam, url, aangemaakt_op FROM groenverklaringen WHERE klant_id = ${klantId} ORDER BY aangemaakt_op DESC`,
  ])

  const klant = klantRows[0]
  if (!klant) redirect('/klant/geen-toegang')

  const klussenIds = klussen.map((k: any) => k.id)
  const portaalPuntenMap: Record<number, any[]> = {}
  if (klussenIds.length > 0) {
    try {
      const pp = await sql`SELECT id, portaal_punten FROM klussen WHERE id = ANY(${klussenIds})`
      for (const row of pp) {
        portaalPuntenMap[row.id] = Array.isArray(row.portaal_punten) ? row.portaal_punten : []
      }
    } catch { /* kolom mist */ }
  }

  const totaalOpen = facturen
    .filter((f: any) => f.status !== 'betaald')
    .reduce((s: number, f: any) => s + totaalFactuur(f), 0)
  const totaalBetaald = facturen
    .filter((f: any) => f.status === 'betaald')
    .reduce((s: number, f: any) => s + totaalFactuur(f), 0)

  const voornaam = (klant.naam ?? '').split(' ')[0] || 'klant'

  return (
    <div>
      <section className="kp-hero">
        <h1>Goedendag, {voornaam}</h1>
        <p>Hier vindt u een actueel overzicht van uw projecten, offertes en facturen.</p>
      </section>

      {/* ── Stat-duo ── */}
      {facturen.length > 0 && (
        <div className="kp-stats">
          <div className="kp-stat">
            <div className="kp-stat-label">Openstaand</div>
            <div className={`kp-stat-value ${totaalOpen > 0 ? 'red' : 'green'}`}>
              {totaalOpen > 0 ? formatEuro(totaalOpen) : '€ 0,00'}
            </div>
          </div>
          <div className="kp-stat">
            <div className="kp-stat-label">Reeds voldaan</div>
            <div className="kp-stat-value green">{formatEuro(totaalBetaald)}</div>
          </div>
        </div>
      )}

      {/* ── Projecten ── */}
      <section className="kp-section">
        <div className="kp-section-head">
          <h2 className="kp-section-title">Uw projecten</h2>
        </div>
        {klussen.length === 0 ? (
          <div className="kp-empty">Op dit moment geen lopende projecten.</div>
        ) : klussen.map((k: any) => {
          const punten: any[] = (portaalPuntenMap[k.id] ?? []).filter((p: any) => p.omschrijving)
          return (
            <div key={k.id} className="kp-card">
              <div className="kp-card-row">
                <div style={{ minWidth: 0 }}>
                  <div className="kp-card-title">{k.type_werk || 'Project'}</div>
                  {k.omschrijving && <div className="kp-card-meta" style={{ whiteSpace: 'pre-wrap' }}>{k.omschrijving}</div>}
                </div>
                <div className="kp-card-side">
                  <span className={`kp-badge ${badgeKlasse(k.status)}`}>{statusLabel(k.status)}</span>
                </div>
              </div>
              {punten.length > 0 && (
                <div className="kp-bullets">
                  <div className="kp-bullets-head">Afgesproken werkzaamheden</div>
                  {punten.map((p: any, i: number) => (
                    <div key={i} className="kp-bullet">
                      <span className="kp-bullet-dot" />
                      <div>
                        <span className="kp-bullet-text">{p.omschrijving}</span>
                        {p.toelichting && <span className="kp-bullet-toel"> — {p.toelichting}</span>}
                        {p.door === 'klant'      && <span className="kp-pill kp-pill-klant">Door u</span>}
                        {p.door === 'gezamenlijk'&& <span className="kp-pill kp-pill-samen">Gezamenlijk</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* ── Offertes ── */}
      <section className="kp-section">
        <div className="kp-section-head">
          <h2 className="kp-section-title">Offertes</h2>
        </div>
        {offertes.length === 0 ? (
          <div className="kp-empty">Nog geen offertes.</div>
        ) : offertes.map((o: any) => (
          <Link key={o.id} href={`/klant/offerte/${o.id}`} className="kp-card-link">
            <div className="kp-card">
              <div className="kp-card-row">
                <div>
                  <div className="kp-card-title">Offerte OZVT-{String(o.offertenummer).padStart(4,'0')}</div>
                  <div className="kp-card-meta">{new Date(o.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
                <div className="kp-card-side">
                  <div className="kp-card-amount">{formatEuro(totaalOfferte(o))}</div>
                  <span className={`kp-badge ${badgeKlasse(o.status)}`}>{statusLabel(o.status)}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* ── Werkafspraken ── */}
      {werkafspraken.length > 0 && (
        <section className="kp-section">
          <div className="kp-section-head">
            <h2 className="kp-section-title">Werkafspraken</h2>
          </div>
          {werkafspraken.map((w: any) => {
            const afspraken: { omschrijving: string; toelichting?: string; door?: string }[] = Array.isArray(w.afspraken) ? w.afspraken : []
            return (
              <div key={w.id} className="kp-card">
                <div className="kp-card-row">
                  <div>
                    <div className="kp-card-title">
                      {w.titel || `Werkafspraken OZWA-${String(w.afspraaknummer).padStart(4,'0')}`}
                    </div>
                    <div className="kp-card-meta">{new Date(w.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                  <div className="kp-card-side">
                    <span className={`kp-badge ${w.status === 'geaccepteerd' ? 'kp-badge-green' : 'kp-badge-amber'}`}>{statusLabel(w.status)}</span>
                  </div>
                </div>
                {afspraken.length > 0 && (
                  <div className="kp-bullets">
                    {afspraken.map((a, i) => (
                      <div key={i} className="kp-bullet">
                        <span className="kp-bullet-dot" />
                        <div>
                          <span className="kp-bullet-text">{a.omschrijving}</span>
                          {a.toelichting && <span className="kp-bullet-toel"> — {a.toelichting}</span>}
                          {a.door === 'klant'      && <span className="kp-pill kp-pill-klant">Door u</span>}
                          {a.door === 'gezamenlijk'&& <span className="kp-pill kp-pill-samen">Gezamenlijk</span>}
                          {a.door === 'ozvolt'     && <span className="kp-pill kp-pill-ozvolt">Door Ozvolt</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* ── Facturen ── */}
      <section className="kp-section">
        <div className="kp-section-head">
          <h2 className="kp-section-title">Facturen</h2>
        </div>
        {facturen.length === 0 ? (
          <div className="kp-empty">Nog geen facturen.</div>
        ) : facturen.map((f: any) => {
          const isBetaald = f.status === 'betaald'
          const bedrag = totaalFactuur(f)
          return (
            <div key={f.id} className="kp-card">
              <div className="kp-card-row">
                <div>
                  <div className="kp-card-title">Factuur {f.factuurnummer}</div>
                  <div className="kp-card-meta">{new Date(f.factuurdatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
                <div className="kp-card-side">
                  <div className="kp-card-amount">{formatEuro(bedrag)}</div>
                  <span className={`kp-badge ${isBetaald ? 'kp-badge-green' : (f.status === 'te_laat' ? 'kp-badge-red' : 'kp-badge-amber')}`}>
                    {isBetaald ? 'Betaald' : statusLabel(f.status || 'openstaand')}
                  </span>
                </div>
              </div>
              {!isBetaald && bedrag > 0 && (
                <>
                  <div className="kp-iban">
                    <div className="kp-iban-head">Betalen via bankoverschrijving</div>
                    <div className="kp-iban-row"><span>IBAN</span><span>NL69 KNAB 0780 9871 79</span></div>
                    <div className="kp-iban-row"><span>T.n.v.</span><span>Ozvolt Elektrotechniek</span></div>
                    <div className="kp-iban-row"><span>Bedrag</span><span>{formatEuro(bedrag)}</span></div>
                    <div className="kp-iban-row"><span>Kenmerk</span><span>{f.factuurnummer}</span></div>
                  </div>
                  <Link href={`/klant/factuur/${f.id}`} className="kp-btn-link">Factuur bekijken / downloaden →</Link>
                </>
              )}
              {isBetaald && (
                <Link href={`/klant/factuur/${f.id}`} className="kp-btn-link">Factuur bekijken / downloaden →</Link>
              )}
            </div>
          )
        })}
      </section>

      {/* ── Opleveringsrapporten ── */}
      {rapporten.length > 0 && (
        <section className="kp-section">
          <div className="kp-section-head">
            <h2 className="kp-section-title">Opleveringsrapporten</h2>
          </div>
          {rapporten.map((r: any) => (
            <Link key={r.id} href={`/klant/rapport/${r.id}`} className="kp-card-link">
              <div className="kp-card">
                <div className="kp-card-row">
                  <div>
                    <div className="kp-card-title">{r.titel}</div>
                    <div className="kp-card-meta">{new Date(r.aangemaakt_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                  <div className="kp-card-side">
                    <span className={`kp-badge ${r.getekend_op ? 'kp-badge-green' : 'kp-badge-amber'}`}>
                      {r.getekend_op ? 'Ondertekend' : 'Nog te ondertekenen'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* ── Documenten ── */}
      {documenten.length > 0 && (
        <section className="kp-section">
          <div className="kp-section-head">
            <h2 className="kp-section-title">Documenten</h2>
          </div>
          {documenten.map((d: any) => (
            <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="kp-card-link">
              <div className="kp-card">
                <div className="kp-card-row">
                  <div>
                    <div className="kp-card-title">{d.naam}</div>
                    <div className="kp-card-meta">{new Date(d.aangemaakt_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                  <div className="kp-card-side">
                    <span className="kp-badge kp-badge-blue">PDF</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </section>
      )}

      {/* ── Profiel link ── */}
      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <Link href="/klant/profiel" className="kp-btn-link">Mijn gegevens wijzigen</Link>
      </div>
    </div>
  )
}
