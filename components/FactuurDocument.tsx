import type { ReactNode } from 'react'
import { formatEuro } from '@/lib/utils'
import KopieerKnop from '@/components/KopieerKnop'
import { OD_CSS, IcoonCheck, IcoonPijl, IcoonTelefoon, IcoonWhatsApp } from '@/components/OfferteDocument'

// Factuur zoals de klant hem ziet in het klantportaal: zelfde opmaak als de offerte
// (OfferteDocument, od-klassen), met Tikkie als eerste betaaloptie en de
// bankoverschrijving (IBAN + EPC-QR) als tweede.

const SITE = 'https://portaal.ozvoltelektro.nl'
const NAVY = '#1b2d4a'
const TIKKIE = '#4b3fbf'
const OZVOLT_TEL = '+31644998789'
const OZVOLT_WA = '31644998789'

const CSS = `
  .od-btn-tikkie { background: ${TIKKIE}; color: #fff; box-shadow: 0 4px 14px rgba(75,63,191,.30); }
  .od-btn-tikkie:hover { background: #3f34a6; }
  .od-status-open { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 700; }
  .od-status-open.amber { background: #fff7e6; color: #b45309; border: 1px solid #fde4b0; }
  .od-status-open.red { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .od-chip.laat b { color: #b91c1c; }

  /* Tikkie-kaart */
  .od-tikkie { position: relative; overflow: hidden; border-radius: 16px; padding: 24px; display: flex; gap: 24px; align-items: center;
    background: linear-gradient(135deg, #f4f2ff 0%, #ffffff 70%); border: 1px solid #ddd8fb; }
  .od-tikkie-main { flex: 1; min-width: 0; }
  .od-tikkie-kop { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .od-tikkie-logo { width: 34px; height: 34px; border-radius: 10px; background: ${TIKKIE}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 17px; flex-shrink: 0; }
  .od-tikkie-titel { font-size: 17px; font-weight: 800; color: ${NAVY}; letter-spacing: -.2px; }
  .od-tikkie-tekst { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 16px; max-width: 420px; }
  .od-tikkie .od-btn { width: 100%; max-width: 360px; }
  .od-tikkie-voordelen { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; font-size: 12px; color: #64748b; }
  .od-tikkie-voordelen span { display: inline-flex; align-items: center; gap: 5px; }
  .od-tikkie-voordelen svg { color: #15803d; width: 14px; height: 14px; }
  .od-qr { width: 150px; flex-shrink: 0; text-align: center; }
  .od-qr-img { background: #fff; border: 1px solid #e3e9f1; border-radius: 12px; padding: 8px; line-height: 0; }
  .od-qr-img svg { width: 100%; height: auto; }
  .od-qr-tekst { font-size: 11.5px; color: #64748b; margin-top: 6px; line-height: 1.4; }

  /* "of" scheiding */
  .od-of { display: flex; align-items: center; gap: 12px; margin: 18px 0; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .1em; }
  .od-of::before, .od-of::after { content: ''; flex: 1; height: 1px; background: #e8edf3; }

  /* Bankoverschrijving */
  .od-bank { border: 1px solid #e3e9f1; border-radius: 16px; padding: 20px 22px; display: flex; gap: 24px; align-items: flex-start; background: #fff; }
  .od-bank-main { flex: 1; min-width: 0; }
  .od-bank-kop { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .od-bank-icoon { width: 34px; height: 34px; border-radius: 10px; background: #eef3fb; color: ${NAVY}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .od-bank-titel { font-size: 15px; font-weight: 800; color: ${NAVY}; }
  .od-bank-sub { font-size: 12.5px; color: #64748b; margin-top: 1px; }
  /* Gegevens als nette tabel: label | waarde | kopieer */
  .od-bank-lijst { border: 1px solid #eef2f7; border-radius: 12px; overflow: hidden; }
  .od-bank-rij { display: grid; grid-template-columns: 130px 1fr auto; align-items: center; gap: 12px; padding: 11px 14px; }
  .od-bank-rij + .od-bank-rij { border-top: 1px solid #eef2f7; }
  .od-bank-rij:nth-child(odd) { background: #fafbfd; }
  .od-bank-label { font-size: 13px; color: #64748b; }
  .od-bank-waarde { font-size: 15px; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; word-break: break-word; }
  .od-bank-waarde.mono { letter-spacing: .03em; white-space: nowrap; }
  .od-kopieer { flex-shrink: 0; background: #fff; border: 1px solid #d6dee9; color: ${NAVY}; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; min-width: 84px; }
  .od-kopieer:hover { background: #eef3fb; }
  .od-bank-noot { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; color: #64748b; margin-top: 12px; line-height: 1.5; }
  .od-bank-noot svg { flex-shrink: 0; margin-top: 1px; color: #94a3b8; }

  .od-termijn { font-size: 13px; font-weight: 700; color: ${NAVY}; margin: 0 0 10px; }
  .od-termijn + .od-termijn, .od-termijn-blok + .od-termijn-blok { margin-top: 22px; }
  .od-betaald { display: flex; align-items: center; gap: 12px; background: #ecfdf3; color: #15803d; border: 1px solid #bbf7d0; border-radius: 14px; padding: 16px 18px; font-weight: 700; font-size: 15px; }
  .od-extra { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }

  @media (max-width: 600px) {
    .od-tikkie { padding: 20px 18px; }
    .od-tikkie .od-btn { max-width: none; }
    .od-qr { display: none; } /* op de telefoon tik je gewoon op de knop */
    .od-bank { padding: 18px; }
    .od-bank-rij { grid-template-columns: 1fr auto; row-gap: 2px; padding: 10px 12px; }
    .od-bank-label { grid-column: 1 / -1; font-size: 12px; }
    .od-bank-waarde { font-size: 14px; }
    .od-bank-waarde.mono { letter-spacing: 0; }
    .od-kopieer { min-width: 0; }
    .od-hero-kaart .od-status-open { align-self: flex-start; }
  }
`

type Regel = { omschrijving: string; beschrijving?: string; aantal: number; prijs: number }

export type Termijn = {
  titel?: string
  bedrag: number
  epcQr: string | null
  tikkieUrl: string | null
  tikkieQr: string | null
}

export default function FactuurDocument({ f, regels, totalen, iban, tenaamstelling, termijnen, extra, onderaan }: {
  f: any
  regels: Regel[]
  totalen: { sub: number; btw: number; totaal: number }
  iban: string | null
  tenaamstelling: string
  termijnen: Termijn[]
  extra?: (i: number) => ReactNode
  onderaan?: ReactNode
}) {
  const btwPct = Number(f.btw_pct ?? 21)
  const isBetaald = f.status === 'betaald'
  const fmtDatum = (d: any) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' })
  const verval = new Date(f.factuurdatum)
  verval.setDate(verval.getDate() + (Number(f.betalingstermijn) || 14))
  const teLaat = !isBetaald && (f.status === 'te_laat' || verval < new Date())
  const voornaam = String(f.klant_naam ?? '').trim().split(' ')[0]
  const fmtAantal = (n: any) => Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 2 })
  const eersteTikkie = termijnen.length === 1 ? termijnen[0].tikkieUrl : null
  const waLink = `https://wa.me/${OZVOLT_WA}?text=${encodeURIComponent(`Hallo Ozvolt, ik heb een vraag over factuur ${f.factuurnummer}.`)}`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: OD_CSS + CSS }} />
      <div className="od od-page">
        <div className="od-doc">

          {/* Header */}
          <div className="od-doc-header">
            <img src={`${SITE}/logo-wit.png`} alt="Ozvolt Elektrotechniek" className="od-doc-logo" />
            <div className="od-doc-meta">
              <div className="od-doc-type">Factuur</div>
              <div className="od-doc-nr">{f.factuurnummer}</div>
            </div>
          </div>

          {/* Hero */}
          <div className="od-hero">
            <div className="od-hero-groet">{voornaam ? `Beste ${voornaam},` : 'Beste klant,'}</div>
            <p className="od-hero-tekst">
              {isBetaald
                ? 'Hartelijk dank voor uw betaling! Hieronder vindt u de factuur nog eens terug.'
                : eersteTikkie
                  ? 'Hartelijk dank voor uw opdracht. Hieronder vindt u de factuur. Met Tikkie betaalt u in een paar seconden met uw eigen bank-app.'
                  : 'Hartelijk dank voor uw opdracht. Hieronder vindt u de factuur en de gegevens om te betalen.'}
            </p>
            <div className="od-hero-kaart">
              <div>
                <div className="od-hero-label">{isBetaald ? 'Betaald' : 'Te betalen'} incl. {btwPct}% btw</div>
                <div className="od-hero-bedrag">{formatEuro(totalen.totaal)}</div>
              </div>
              {isBetaald ? (
                <span className="od-status-ok"><IcoonCheck /> Betaald</span>
              ) : eersteTikkie ? (
                <a href={eersteTikkie} target="_blank" rel="noopener noreferrer" className="od-btn od-btn-tikkie">Betaal met Tikkie <IcoonPijlRechts /></a>
              ) : (
                <a href="#betalen" className="od-btn od-btn-licht">Naar betalen <IcoonPijl /></a>
              )}
            </div>
            <div className="od-chips">
              <span className="od-chip">Factuurdatum <b>{fmtDatum(f.factuurdatum)}</b></span>
              {!isBetaald && <span className={`od-chip${teLaat ? ' laat' : ''}`}>{teLaat ? 'Vervallen op' : 'Te betalen vóór'} <b>{fmtDatum(verval)}</b></span>}
              {!isBetaald && <span className={`od-status-open ${teLaat ? 'red' : 'amber'}`}>{teLaat ? 'Te laat' : 'Openstaand'}</span>}
            </div>
            <p className="od-hero-vragen">
              Vragen? <a href={waLink}>App ons</a> of <a href={`tel:${OZVOLT_TEL}`} style={{ whiteSpace: 'nowrap' }}>bel +31 6 44 99 87 89</a>.
            </p>
          </div>

          <div className="od-doc-body">

            {/* Gegevens */}
            <div className="od-blok">
              <div className="od-info-row">
                <div className="od-info-kaart">
                  <div className="od-sec" style={{ marginBottom: 8 }}>Factuur aan</div>
                  <div className="od-info-naam">{f.klant_naam}</div>
                  <div className="od-info-line">
                    {f.klant_locatie && <>{f.klant_locatie}<br /></>}
                    {f.klant_email}
                  </div>
                </div>
                <div className="od-info-kaart">
                  <div className="od-sec" style={{ marginBottom: 8 }}>Factuurgegevens</div>
                  <div className="od-info-meta-row"><span className="od-info-meta-k">Nummer</span><span className="od-info-meta-v">{f.factuurnummer}</span></div>
                  <div className="od-info-meta-row"><span className="od-info-meta-k">Factuurdatum</span><span className="od-info-meta-v">{fmtDatum(f.factuurdatum)}</span></div>
                  <div className="od-info-meta-row"><span className="od-info-meta-k">Vervaldatum</span><span className="od-info-meta-v" style={teLaat ? { color: '#b91c1c' } : undefined}>{fmtDatum(verval)}</span></div>
                  <div className="od-info-meta-row"><span className="od-info-meta-k">Betalingstermijn</span><span className="od-info-meta-v">{Number(f.betalingstermijn) || 14} dagen</span></div>
                </div>
              </div>
            </div>

            {/* Regels */}
            <div className="od-blok">
              <div className="od-sec">Gefactureerde werkzaamheden</div>
              <div className="od-regels">
                <div className="od-regel od-regel-kop">
                  <span>Omschrijving</span><span className="od-r">Aantal</span><span className="od-r">Stukprijs</span><span className="od-r">Totaal</span>
                </div>
                {regels.map((r, i) => (
                  <div className="od-regel" key={i}>
                    <div>
                      <div className="od-regel-titel">{r.omschrijving || '—'}</div>
                      {r.beschrijving && <div className="od-regel-sub">{r.beschrijving}</div>}
                      <div className="od-regel-mobiel">
                        <span>{fmtAantal(r.aantal)} × {formatEuro(Number(r.prijs))}</span>
                        <b>{formatEuro(Number(r.aantal) * Number(r.prijs))}</b>
                      </div>
                    </div>
                    <span className="od-r">{fmtAantal(r.aantal)}</span>
                    <span className="od-r">{formatEuro(Number(r.prijs))}</span>
                    <span className="od-r od-regel-totaal">{formatEuro(Number(r.aantal) * Number(r.prijs))}</span>
                  </div>
                ))}
              </div>

              <div className="od-totals">
                <div className="od-totals-box">
                  <div className="od-tot-row"><span className="od-tot-l">Subtotaal (ex. BTW)</span><span className="od-tot-v">{formatEuro(totalen.sub)}</span></div>
                  <div className="od-tot-row"><span className="od-tot-l">BTW {btwPct}%</span><span className="od-tot-v">{formatEuro(totalen.btw)}</span></div>
                  <div className="od-tot-final">
                    <span className="od-l">{isBetaald ? 'Betaald' : 'Te betalen'} incl. BTW</span>
                    <span className="od-v">{formatEuro(totalen.totaal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Betalen */}
            <div id="betalen" className="od-blok" style={{ scrollMarginTop: 16 }}>
              <div className="od-sec" style={{ marginBottom: 14 }}>Betalen</div>
              {isBetaald ? (
                <div className="od-betaald"><IcoonCheck /> Deze factuur is betaald. Hartelijk dank!</div>
              ) : termijnen.map((t, i) => (
                <div key={i} className="od-termijn-blok">
                  {t.titel && <div className="od-termijn">{t.titel} — {formatEuro(t.bedrag)}</div>}

                  {t.tikkieUrl && (
                    <div className="od-tikkie">
                      <div className="od-tikkie-main">
                        <div className="od-tikkie-kop">
                          <div className="od-tikkie-logo">T</div>
                          <div className="od-tikkie-titel">Betaal met Tikkie</div>
                        </div>
                        <p className="od-tikkie-tekst">Eén tik en u betaalt veilig met de app van uw eigen bank. Uw betaling wordt direct verwerkt.</p>
                        <a href={t.tikkieUrl} target="_blank" rel="noopener noreferrer" className="od-btn od-btn-tikkie">
                          Betaal {formatEuro(t.bedrag)} met Tikkie <IcoonPijlRechts />
                        </a>
                        <div className="od-tikkie-voordelen">
                          <span><IcoonCheck /> Alle banken</span>
                          <span><IcoonCheck /> Direct verwerkt</span>
                          <span><IcoonCheck /> Via ABN AMRO</span>
                        </div>
                      </div>
                      {t.tikkieQr && (
                        <div className="od-qr">
                          <div className="od-qr-img" dangerouslySetInnerHTML={{ __html: t.tikkieQr }} />
                          <div className="od-qr-tekst">Of scan met uw telefoon</div>
                        </div>
                      )}
                    </div>
                  )}

                  {t.tikkieUrl && iban && <div className="od-of">of maak het zelf over</div>}

                  {iban && (
                    <div className="od-bank">
                      <div className="od-bank-main">
                        <div className="od-bank-kop">
                          <div className="od-bank-icoon"><IcoonBank /></div>
                          <div>
                            <div className="od-bank-titel">{t.tikkieUrl ? 'Zelf overmaken' : 'Betalen via uw bank-app'}</div>
                            <div className="od-bank-sub">Binnen enkele seconden bij ons binnen.</div>
                          </div>
                        </div>
                        <div className="od-bank-lijst">
                          <BankRij label="IBAN" waarde={iban} kopie={iban.replace(/\s+/g, '')} mono />
                          <BankRij label="Ten name van" waarde={tenaamstelling} kopie={tenaamstelling} />
                          <BankRij label="Bedrag" waarde={formatEuro(t.bedrag)} kopie={t.bedrag.toFixed(2).replace('.', ',')} />
                          <BankRij label="Omschrijving" waarde={f.factuurnummer} kopie={f.factuurnummer} />
                        </div>
                        <p className="od-bank-noot"><IcoonInfo /> Vermeld de omschrijving, dan verwerken we uw betaling automatisch.</p>
                      </div>
                      {/* Eén QR-code per factuur: met Tikkie alleen die van Tikkie, anders de bank-QR */}
                      {t.epcQr && !t.tikkieUrl && (
                        <div className="od-qr">
                          <div className="od-qr-img" dangerouslySetInnerHTML={{ __html: t.epcQr }} />
                          <div className="od-qr-tekst">Scan met de app van uw bank</div>
                        </div>
                      )}
                    </div>
                  )}

                  {extra && <div className="od-extra">{extra(i)}</div>}
                </div>
              ))}
            </div>

            {/* Contact */}
            <div className="od-contact">
              <div>
                <div className="od-contact-titel">Vragen over deze factuur?</div>
                <div className="od-contact-tekst">App of bel ons, we helpen u graag.</div>
              </div>
              <div className="od-contact-knoppen">
                <a href={waLink} className="od-btn od-btn-wa"><IcoonWhatsApp /> WhatsApp</a>
                <a href={`tel:${OZVOLT_TEL}`} className="od-btn od-btn-licht"><IcoonTelefoon /> Bellen</a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="od-doc-footer">
            <div>
              <div className="od-footer-brand">Ozvolt Elektrotechniek</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>KVK 99837366 · BTW NL005413208B33</div>
            </div>
            <div className="od-footer-details">
              <a href="mailto:financien@ozvoltelektro.nl">financien@ozvoltelektro.nl</a><br />
              <a href={`tel:${OZVOLT_TEL}`}><span style={{ whiteSpace: 'nowrap' }}>+31 6 44 99 87 89</span></a> · <a href="https://ozvoltelektro.nl">ozvoltelektro.nl</a>
            </div>
          </div>

        </div>
        {onderaan}
      </div>
    </>
  )
}

function BankRij({ label, waarde, kopie, mono }: { label: string; waarde: string; kopie: string; mono?: boolean }) {
  return (
    <div className="od-bank-rij">
      <span className="od-bank-label">{label}</span>
      <span className={`od-bank-waarde${mono ? ' mono' : ''}`}>{waarde}</span>
      <KopieerKnop waarde={kopie} label={label} className="od-kopieer" />
    </div>
  )
}

function IcoonBank() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18M12 3l9 5H3l9-5z" /></svg>
}
function IcoonInfo() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
}

function IcoonPijlRechts() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
}
