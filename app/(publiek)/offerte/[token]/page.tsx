import { sql } from '@/lib/db'
import { berekenTotalen, formatEuro } from '@/lib/utils'
import { notFound } from 'next/navigation'
import SignForm from './SignForm'
import Icon from '@/components/Icon'
import UitgangspuntenOptiesWeergave from '@/components/UitgangspuntenOptiesWeergave'
import { parseUoItems } from '@/lib/uitgangspunten'

const SITE = 'https://portaal.ozvoltelektro.nl'
const NAVY = '#1b2d4a'
const GREEN = '#1a7a3c'
const OZVOLT_TEL = '+31644998789'
const OZVOLT_WA = '31644998789'

export default async function OffertePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres,
           o.betaal_url, o.betaling_50_50, o.betaal_url_2
    FROM offertes o JOIN klanten k ON k.id = o.klant_id
    WHERE o.accept_token = ${token}
  `
  const o = rows[0]
  if (!o) notFound()

  let regels: any[] = []
  if (Array.isArray(o.regels)) regels = o.regels
  else if (typeof o.regels === 'string') { try { regels = JSON.parse(o.regels) } catch {} }

  let waItems: any[] = []
  if (Array.isArray(o.wa_items)) waItems = o.wa_items
  else if (typeof o.wa_items === 'string') { try { waItems = JSON.parse(o.wa_items) } catch {} }

  let bijlagen: any[] = []
  if (Array.isArray(o.bijlagen)) bijlagen = o.bijlagen
  else if (typeof o.bijlagen === 'string') { try { bijlagen = JSON.parse(o.bijlagen) } catch {} }

  const uoItems = parseUoItems(o.uo_items)

  const korting = Number(o.korting_pct ?? 0)
  const btwPct = Number(o.btw_pct ?? 21)
  const totalen = berekenTotalen(regels, korting, btwPct)
  const offerteNr = `OZVT-${String(o.offertenummer).padStart(4, '0')}`
  const fmtDatum = (d: any) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' })
  const datum = fmtDatum(o.datum)
  const geldigTot = o.geldig_tot ? fmtDatum(o.geldig_tot) : null
  const isGeaccepteerd = !!o.accepted_at
  const voornaam = String(o.klant_naam ?? '').trim().split(' ')[0]
  const fmtAantal = (n: any) => Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 2 })

  const ogTitel = `Offerte ${offerteNr} — Ozvolt Elektrotechniek`
  const ogTekst = 'Bekijk uw offerte en accepteer deze eenvoudig online.'
  const waLink = `https://wa.me/${OZVOLT_WA}?text=${encodeURIComponent(`Hallo Ozvolt, ik heb een vraag over offerte ${offerteNr}.`)}`

  return (
    <html lang="nl">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content={NAVY} />
        <title>{ogTitel}</title>
        <meta name="description" content={ogTekst} />
        {/* Linkvoorbeeld in WhatsApp / iMessage */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Ozvolt Elektrotechniek" />
        <meta property="og:title" content={ogTitel} />
        <meta property="og:description" content={ogTekst} />
        <meta property="og:url" content={`${SITE}/offerte/${token}`} />
        <meta property="og:image" content={`${SITE}/og-offerte.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Ozvolt Elektrotechniek — offerte" />
        <meta property="og:locale" content="nl_NL" />
        <meta name="twitter:card" content="summary_large_image" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { min-height: 100%; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #eef1f6; color: #0f172a; font-size: 14px; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; }
          a { color: inherit; }

          .page { max-width: 760px; margin: 0 auto; padding: 28px 16px 64px; }
          .doc { background: #fff; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05), 0 10px 40px rgba(15,23,42,.08); overflow: hidden; }

          /* Header */
          .doc-header { background: ${NAVY}; border-top: 5px solid ${GREEN}; padding: 26px 36px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
          .doc-logo { height: 40px; width: auto; display: block; }
          .doc-meta { text-align: right; }
          .doc-type { font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.55); margin-bottom: 4px; }
          .doc-nr { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -.3px; }

          /* Hero */
          .hero { padding: 32px 36px 28px; border-bottom: 1px solid #e8edf3; }
          .hero-groet { font-size: 22px; font-weight: 800; color: ${NAVY}; letter-spacing: -.4px; margin-bottom: 8px; }
          .hero-tekst { font-size: 15px; color: #475569; line-height: 1.65; margin-bottom: 22px; max-width: 560px; }
          .hero-kaart { background: #f6f8fb; border: 1px solid #e3e9f1; border-radius: 14px; padding: 20px 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
          .hero-label { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 2px; }
          .hero-bedrag { font-size: 32px; font-weight: 900; color: ${NAVY}; letter-spacing: -1px; font-variant-numeric: tabular-nums; line-height: 1.1; }
          .hero-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
          .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
          .chip { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e3e9f1; border-radius: 999px; padding: 6px 12px; font-size: 12px; color: #475569; }
          .chip b { color: #0f172a; font-weight: 600; }
          .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; padding: 15px 24px; font-size: 16px; font-weight: 700; text-decoration: none; border: none; cursor: pointer; font-family: inherit; line-height: 1.2; }
          .btn-groen { background: ${GREEN}; color: #fff; box-shadow: 0 4px 14px rgba(26,122,60,.28); }
          .btn-licht { background: #fff; color: ${NAVY}; border: 1.5px solid #d6dee9; }
          .btn-wa { background: #25d366; color: #fff; }
          .btn svg { flex-shrink: 0; }
          .status-ok { display: inline-flex; align-items: center; gap: 8px; background: #ecfdf3; color: #15803d; border: 1px solid #bbf7d0; border-radius: 999px; padding: 10px 16px; font-size: 14px; font-weight: 700; }
          .hero-vragen { margin-top: 16px; font-size: 13px; color: #64748b; }
          .hero-vragen a { color: ${NAVY}; font-weight: 600; text-decoration: none; border-bottom: 1px solid #c8d3e1; }

          /* Body */
          .doc-body { padding: 32px 36px 36px; }
          .sec { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #94a3b8; margin-bottom: 12px; }
          .blok { margin-bottom: 32px; }

          /* Gegevens */
          .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .info-kaart { border: 1px solid #e8edf3; border-radius: 12px; padding: 16px 18px; }
          .info-naam { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .info-line { font-size: 13px; color: #475569; line-height: 1.75; word-break: break-word; }
          .info-meta-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; padding: 3px 0; }
          .info-meta-k { color: #94a3b8; }
          .info-meta-v { font-weight: 600; color: #0f172a; text-align: right; }

          /* Regels: tabel op desktop, kaartjes op telefoon */
          .regels { border: 1px solid #e8edf3; border-radius: 12px; overflow: hidden; }
          .regel { display: grid; grid-template-columns: 1fr 70px 110px 110px; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #f1f5f9; align-items: start; }
          .regel:last-child { border-bottom: none; }
          .regel-kop { background: #f8fafc; border-bottom: 1px solid #e8edf3; padding-top: 10px; padding-bottom: 10px; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; }
          .regel .r { text-align: right; font-variant-numeric: tabular-nums; }
          .regel-titel { font-weight: 600; font-size: 14px; color: #0f172a; }
          .regel-sub { font-size: 13px; color: #64748b; margin-top: 3px; line-height: 1.55; white-space: pre-wrap; }
          .regel-totaal { font-weight: 700; }
          .regel-mobiel { display: none; }

          /* Totalen */
          .totals { display: flex; justify-content: flex-end; margin-top: 16px; }
          .totals-box { width: 320px; }
          .tot-row { display: flex; justify-content: space-between; padding: 7px 2px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
          .tot-l { color: #64748b; }
          .tot-v { font-weight: 600; font-variant-numeric: tabular-nums; }
          .tot-final { background: ${NAVY}; border-radius: 12px; padding: 14px 18px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
          .tot-final .l { color: rgba(255,255,255,.7); font-size: 13px; font-weight: 500; }
          .tot-final .v { color: #fff; font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -.5px; }

          /* Opties/uitgangspunten (gedeeld component) in dezelfde stijl */
          .doc .uo-wrap { border-radius: 12px; }
          .doc .uo-sec { font-size: 11px; }

          /* Betalen */
          .pay-btn { display: inline-flex; align-items: center; gap: 8px; background: ${GREEN}; color: #fff; border-radius: 12px; padding: 14px 24px; text-decoration: none; font-weight: 700; font-size: 15px; }
          .pay-btn-secondary { background: ${NAVY}; }
          .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

          /* Werkafspraken */
          .wa-lijst { border: 1px solid #e8edf3; border-radius: 12px; overflow: hidden; }
          .wa-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 13px 18px; border-bottom: 1px solid #f1f5f9; }
          .wa-item:last-child { border-bottom: none; }
          .wa-door { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
          .wa-door-ozvolt      { background: #e8edf5; color: ${NAVY}; }
          .wa-door-klant       { background: #f3f0ff; color: #6d28d9; }
          .wa-door-gezamenlijk { background: #f0fdf4; color: #15803d; }

          /* Bijlagen */
          .bijlagen-list { display: flex; flex-direction: column; gap: 8px; }
          .bijlage-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e8edf3; border-radius: 12px; text-decoration: none; color: #0f172a; }
          .bijlage-icon { font-size: 20px; color: #dc2626; flex-shrink: 0; }
          .bijlage-naam { font-size: 14px; font-weight: 600; flex: 1; word-break: break-word; }
          .bijlage-type { font-size: 11px; color: #94a3b8; text-transform: uppercase; }

          /* Akkoord */
          .akkoord { scroll-margin-top: 16px; }
          .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }

          /* Contact */
          .contact { background: #f6f8fb; border: 1px solid #e3e9f1; border-radius: 14px; padding: 20px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: 28px; }
          .contact-titel { font-size: 16px; font-weight: 800; color: ${NAVY}; margin-bottom: 2px; }
          .contact-tekst { font-size: 13px; color: #64748b; }
          .contact-knoppen { display: flex; gap: 10px; flex-wrap: wrap; }
          .contact-knoppen .btn { padding: 12px 18px; font-size: 15px; }

          /* Footer */
          .doc-footer { background: #f8fafc; border-top: 1px solid #e8edf3; padding: 22px 36px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
          .footer-brand { font-size: 13px; font-weight: 700; color: #0f172a; }
          .footer-details { font-size: 12px; color: #94a3b8; line-height: 1.8; text-align: right; }
          .footer-details a { text-decoration: none; }

          @media (max-width: 600px) {
            .page { padding: 0 0 40px; }
            .doc { border-radius: 0; box-shadow: none; }
            .doc-header { padding: 18px 20px; padding-top: max(18px, env(safe-area-inset-top)); }
            .doc-logo { height: 32px; }
            .doc-nr { font-size: 16px; }
            .doc-type { font-size: 10px; }
            .hero { padding: 24px 20px 22px; }
            .hero-groet { font-size: 20px; }
            .hero-tekst { font-size: 15px; }
            .hero-kaart { padding: 18px; }
            .hero-kaart .btn, .hero-kaart .status-ok { width: 100%; justify-content: center; }
            .hero-bedrag { font-size: 30px; }
            .doc-body { padding: 24px 20px 28px; }
            .info-row { grid-template-columns: 1fr; gap: 12px; }
            .regel { grid-template-columns: 1fr; gap: 0; padding: 14px 16px; }
            .regel-kop, .regel .r { display: none; }
            .regel-mobiel { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-top: 8px; font-size: 13px; color: #64748b; font-variant-numeric: tabular-nums; }
            .regel-mobiel b { color: #0f172a; font-size: 15px; }
            .totals-box { width: 100%; }
            .pay-grid { grid-template-columns: 1fr; }
            .sign-grid { grid-template-columns: 1fr; gap: 14px; }
            .contact { flex-direction: column; align-items: stretch; }
            .contact-knoppen .btn { flex: 1; }
            .doc-footer { flex-direction: column; align-items: flex-start; padding: 20px; padding-bottom: max(20px, env(safe-area-inset-bottom)); }
            .footer-details { text-align: left; }
          }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="doc">

            {/* Header */}
            <div className="doc-header">
              <img src={`${SITE}/logo-wit.png`} alt="Ozvolt Elektrotechniek" className="doc-logo" />
              <div className="doc-meta">
                <div className="doc-type">Offerte</div>
                <div className="doc-nr">{offerteNr}</div>
              </div>
            </div>

            {/* Hero: het belangrijkste meteen bovenaan */}
            <div className="hero">
              <div className="hero-groet">{voornaam ? `Beste ${voornaam},` : 'Beste klant,'}</div>
              <p className="hero-tekst">
                {isGeaccepteerd
                  ? 'Bedankt voor uw akkoord! Hieronder vindt u de offerte nog eens terug. Wij nemen contact met u op om de werkzaamheden in te plannen.'
                  : 'Bedankt voor uw aanvraag. Hieronder vindt u onze offerte. Bent u akkoord? Dan kunt u deze onderaan de pagina direct digitaal ondertekenen.'}
              </p>
              <div className="hero-kaart">
                <div>
                  <div className="hero-label">Totaal incl. {btwPct}% btw</div>
                  <div className="hero-bedrag">{formatEuro(totalen.inclBtw)}</div>
                </div>
                {isGeaccepteerd ? (
                  <span className="status-ok"><IcoonCheck /> Geaccepteerd</span>
                ) : (
                  <a href="#akkoord" className="btn btn-groen">Offerte accepteren <IcoonPijl /></a>
                )}
              </div>
              <div className="chips">
                <span className="chip">Datum <b>{datum}</b></span>
                {geldigTot && <span className="chip">Geldig tot <b>{geldigTot}</b></span>}
              </div>
              <p className="hero-vragen">
                Vragen? <a href={waLink}>App ons</a> of <a href={`tel:${OZVOLT_TEL}`} style={{ whiteSpace: 'nowrap' }}>bel +31 6 44 99 87 89</a>.
              </p>
            </div>

            <div className="doc-body">

              {/* Gegevens */}
              <div className="blok">
                <div className="info-row">
                  <div className="info-kaart">
                    <div className="sec" style={{ marginBottom: 8 }}>Offerte voor</div>
                    <div className="info-naam">{o.klant_naam}</div>
                    <div className="info-line">
                      {o.klant_adres && <>{o.klant_adres}<br /></>}
                      {o.klant_email && <>{o.klant_email}<br /></>}
                      {o.klant_telefoon}
                    </div>
                  </div>
                  <div className="info-kaart">
                    <div className="sec" style={{ marginBottom: 8 }}>Offerte details</div>
                    <div className="info-meta-row"><span className="info-meta-k">Nummer</span><span className="info-meta-v">{offerteNr}</span></div>
                    <div className="info-meta-row"><span className="info-meta-k">Datum</span><span className="info-meta-v">{datum}</span></div>
                    {geldigTot && <div className="info-meta-row"><span className="info-meta-k">Geldig tot</span><span className="info-meta-v">{geldigTot}</span></div>}
                    <div className="info-meta-row"><span className="info-meta-k">BTW</span><span className="info-meta-v">{btwPct}%</span></div>
                  </div>
                </div>
              </div>

              {/* Regels */}
              <div className="blok">
                <div className="sec">Werkzaamheden &amp; materialen</div>
                <div className="regels">
                  <div className="regel regel-kop">
                    <span>Omschrijving</span><span className="r">Aantal</span><span className="r">Stukprijs</span><span className="r">Totaal</span>
                  </div>
                  {regels.map((r: any, i: number) => (
                    <div className="regel" key={i}>
                      <div>
                        <div className="regel-titel">{r.omschrijving || '—'}</div>
                        {r.beschrijving && <div className="regel-sub">{r.beschrijving}</div>}
                        <div className="regel-mobiel">
                          <span>{fmtAantal(r.aantal)} × {formatEuro(Number(r.prijs))}</span>
                          <b>{formatEuro(Number(r.aantal) * Number(r.prijs))}</b>
                        </div>
                      </div>
                      <span className="r">{fmtAantal(r.aantal)}</span>
                      <span className="r">{formatEuro(Number(r.prijs))}</span>
                      <span className="r regel-totaal">{formatEuro(Number(r.aantal) * Number(r.prijs))}</span>
                    </div>
                  ))}
                </div>

                {/* Totalen */}
                <div className="totals">
                  <div className="totals-box">
                    <div className="tot-row"><span className="tot-l">Subtotaal (ex. BTW)</span><span className="tot-v">{formatEuro(totalen.subtotaal)}</span></div>
                    {totalen.korting > 0 && (
                      <div className="tot-row">
                        <span className="tot-l" style={{ color: '#16a34a' }}>Korting</span>
                        <span className="tot-v" style={{ color: '#16a34a' }}>− {formatEuro(totalen.korting)}</span>
                      </div>
                    )}
                    <div className="tot-row"><span className="tot-l">BTW {btwPct}%</span><span className="tot-v">{formatEuro(totalen.btw)}</span></div>
                    <div className="tot-final">
                      <span className="l">Te betalen incl. BTW</span>
                      <span className="v">{formatEuro(totalen.inclBtw)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opties en uitgangspunten (informatief, telt niet mee in het totaal) */}
              <UitgangspuntenOptiesWeergave items={uoItems} btwPct={btwPct} />

              {/* Betaalknop (alleen als er een betaallink is en de offerte is geaccepteerd) */}
              {(o.betaal_url || o.betaling_50_50) && isGeaccepteerd && (
                <div className="blok">
                  <div className="sec" style={{ marginBottom: 14 }}>Online betalen</div>
                  {o.betaling_50_50 ? (
                    <div className="pay-grid">
                      <a href={o.betaal_url ?? '#'} className="pay-btn pay-btn-secondary" style={{ justifyContent: 'center', flexDirection: 'column', textAlign: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, opacity: .75 }}>Eerste termijn (50%)</span>
                        <span>{formatEuro(totalen.inclBtw / 2)}</span>
                      </a>
                      {o.betaal_url_2 ? (
                        <a href={o.betaal_url_2} className="pay-btn" style={{ background: '#475569', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, opacity: .75 }}>Tweede termijn (50%)</span>
                          <span>{formatEuro(totalen.inclBtw / 2)}</span>
                        </a>
                      ) : (
                        <div style={{ fontSize: 13, color: '#64748b', alignSelf: 'center', lineHeight: 1.5 }}>
                          Tweede termijn (50%): u ontvangt de eindfactuur na oplevering.
                        </div>
                      )}
                    </div>
                  ) : (
                    <a href={o.betaal_url} className="pay-btn">
                      Betalen — {formatEuro(totalen.inclBtw)} →
                    </a>
                  )}
                </div>
              )}

              {/* Werkafspraken */}
              {waItems.length > 0 && (
                <div className="blok">
                  <div className="sec">Werkafspraken</div>
                  <div className="wa-lijst">
                    {waItems.map((item: any, i: number) => (
                      <div className="wa-item" key={i}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{item.omschrijving || '—'}</div>
                          {item.toelichting && <div style={{ fontSize: 13, color: '#64748b', marginTop: 3, lineHeight: 1.5 }}>{item.toelichting}</div>}
                        </div>
                        <span className={`wa-door wa-door-${item.door ?? 'ozvolt'}`}>
                          {item.door === 'klant' ? 'Klant' : item.door === 'gezamenlijk' ? 'Gezamenlijk' : 'Ozvolt'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bijlagen */}
              {bijlagen.length > 0 && (
                <div className="blok">
                  <div className="sec">Bijlagen</div>
                  <div className="bijlagen-list">
                    {bijlagen.map((b: any, i: number) => (
                      <a key={i} href={b.url} target="_blank" rel="noreferrer" className="bijlage-item">
                        <Icon name="pdf" size={20} className="bijlage-icon" />
                        <span className="bijlage-naam">{b.naam}</span>
                        <span className="bijlage-type">{b.type}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Akkoord */}
              <div id="akkoord" className="akkoord">
                <div className="sec" style={{ marginBottom: 14 }}>Akkoord &amp; ondertekening</div>
                <SignForm
                  token={token}
                  isGeaccepteerd={isGeaccepteerd}
                  acceptedName={o.accepted_name}
                  acceptedAt={o.accepted_at ? new Date(o.accepted_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' }) : null}
                  klantEmail={o.klant_email ?? ''}
                  totaal={formatEuro(totalen.inclBtw)}
                  btwPct={btwPct}
                  betaalUrl={o.betaal_url ?? null}
                  betaling50_50={!!o.betaling_50_50}
                  betaalUrl2={o.betaal_url_2 ?? null}
                  eersteTermijn={formatEuro(totalen.inclBtw / 2)}
                />
              </div>

              {/* Contact */}
              <div className="contact">
                <div>
                  <div className="contact-titel">Vragen over deze offerte?</div>
                  <div className="contact-tekst">App of bel ons, we denken graag met u mee.</div>
                </div>
                <div className="contact-knoppen">
                  <a href={waLink} className="btn btn-wa"><IcoonWhatsApp /> WhatsApp</a>
                  <a href={`tel:${OZVOLT_TEL}`} className="btn btn-licht"><IcoonTelefoon /> Bellen</a>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="doc-footer">
              <div>
                <div className="footer-brand">Ozvolt Elektrotechniek</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>KVK 99837366 · BTW NL005413208B33</div>
              </div>
              <div className="footer-details">
                <a href="mailto:financien@ozvoltelektro.nl">financien@ozvoltelektro.nl</a><br />
                <a href={`tel:${OZVOLT_TEL}`}><span style={{ whiteSpace: 'nowrap' }}>+31 6 44 99 87 89</span></a> · <a href="https://ozvoltelektro.nl">ozvoltelektro.nl</a>
              </div>
            </div>

          </div>
        </div>
      </body>
    </html>
  )
}

function IcoonPijl() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
}
function IcoonCheck() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
}
function IcoonTelefoon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
}
function IcoonWhatsApp() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.6 2.2 13.8 2.2 12 2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2C18.1 1.3 15.2.1 12 .1 5.5.1.1 5.5.1 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.6c1.7.9 3.7 1.4 5.7 1.4 6.5 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.1-3.5-8.3z" /></svg>
}
