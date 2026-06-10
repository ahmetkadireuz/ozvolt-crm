export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { ensureProjectbeheerTables, type RapportSectie } from '@/lib/projectbeheer'
import PrintKnoppen from './PrintKnoppen'

export const metadata: Metadata = { title: 'Opleveringsrapport' }

const BEDRIJF = {
  naam: 'Ozvolt Elektrotechniek',
  kvk: '99837366',
  btw: 'NL005413208B33',
  email: 'financien@ozvoltelektro.nl',
}

export default async function RapportPrintPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rapportId = parseInt(id)
  if (isNaN(rapportId)) notFound()

  await ensureProjectbeheerTables()
  const rows = await sql`
    SELECT r.*, k.type_werk, k.status AS klus_status,
           kt.naam AS klant_naam, kt.email AS klant_email,
           kt.telefoon AS klant_tel, kt.locatie AS klant_locatie
    FROM opleveringsrapporten r
    JOIN klussen k ON k.id = r.klus_id
    JOIN klanten kt ON kt.id = k.klant_id
    WHERE r.id = ${rapportId}
  `
  const rapport = rows[0]
  if (!rapport) notFound()

  const inhoud = rapport.inhoud as { secties?: RapportSectie[]; aanvullend?: string } | null
  const secties: RapportSectie[] = inhoud?.secties ?? []
  const docNumber = 'OPL-' + String(rapport.id).padStart(5, '0')
  const datum = new Date(rapport.bijgewerkt_op ?? rapport.aangemaakt_op).toLocaleDateString('nl-NL')

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          body { background: #fff !important; }
          .actionbar { display: none !important; }
          .page { margin: 0 !important; box-shadow: none !important; min-height: auto !important; }
          .panel { break-inside: avoid; }
          tr { break-inside: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <PrintKnoppen klusId={rapport.klus_id} />

      <article className="page" style={{
        width: '210mm', minHeight: '297mm', margin: '22px auto', background: '#fff',
        position: 'relative', overflow: 'hidden', boxShadow: '0 18px 70px rgba(16,32,51,.18)',
        fontFamily: 'Inter, Arial, sans-serif', color: '#172033',
      }}>
        <div style={{ position: 'absolute', inset: '0 0 auto 0', height: '50mm', background: 'linear-gradient(135deg, #0d1b3e 0%, #1d4fa3 100%)' }} />
        <div style={{ position: 'relative', padding: '12mm 14mm' }}>

          {/* Hero */}
          <header style={{ display: 'grid', gridTemplateColumns: '1fr 64mm', gap: '10mm', color: '#fff', minHeight: '38mm' }}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-wit.png" alt={BEDRIJF.naam} style={{ width: '40mm', display: 'block', marginBottom: '5mm' }} />
              <div style={{ fontSize: '8.5pt', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.78)' }}>
                Opleveringsrapport
              </div>
              <h1 style={{ margin: '2mm 0 0', fontSize: '19pt', lineHeight: 1.1, letterSpacing: '-.03em', fontWeight: 800 }}>
                {rapport.titel}
              </h1>
            </div>
            <aside style={{ alignSelf: 'start', border: '1px solid rgba(255,255,255,.22)', borderRadius: 10, padding: '4mm', background: 'rgba(255,255,255,.08)', fontSize: '8.4pt' }}>
              {[
                ['Document', docNumber],
                ['Datum', datum],
                ['Project', `#${rapport.klus_id}`],
                ['Klant', rapport.klant_naam],
              ].map(([label, val], i, arr) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '6mm', padding: '2mm 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,.18)' : 'none' }}>
                  <span style={{ color: 'rgba(255,255,255,.68)', fontWeight: 700 }}>{label}</span>
                  <span style={{ fontWeight: 800, textAlign: 'right' }}>{val}</span>
                </div>
              ))}
            </aside>
          </header>

          {/* Projectgegevens */}
          <section style={{ marginTop: '7mm', border: '1px solid #dfe7ef', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '3mm 4mm', background: '#f6f8fb', borderBottom: '1px solid #dfe7ef', color: '#0d1b3e', fontSize: '9pt', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Projectgegevens
            </div>
            <div style={{ padding: '4mm', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 9mm' }}>
              {[
                ['Naam', rapport.klant_naam],
                ['Projectnr.', `#${rapport.klus_id}`],
                ['Adres', rapport.klant_locatie || '-'],
                ['Werk', rapport.type_werk || '-'],
                ['Telefoon', rapport.klant_tel || '-'],
                ['E-mail', rapport.klant_email || '-'],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '27mm 1fr', gap: '4mm', padding: '2mm 0', borderBottom: '1px solid #edf1f5', fontSize: '9pt' }}>
                  <span style={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', fontSize: '7.6pt' }}>{label}</span>
                  <span style={{ fontWeight: 650, wordBreak: 'break-word' }}>{val}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Checklist secties */}
          {secties.map((sectie, si) => (
            <section key={si} className="panel" style={{ marginTop: '5mm', border: '1px solid #dfe7ef', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '3mm 4mm', background: '#0d1b3e', color: '#fff', fontSize: '9pt', fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                {sectie.titel}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.9pt' }}>
                <thead>
                  <tr>
                    {['Controlepunt', 'Resultaat', 'Opmerking'].map((h, i) => (
                      <th key={h} style={{ background: '#f6f8fb', color: '#0d1b3e', padding: '2.4mm 2.3mm', textAlign: 'left', fontSize: '7.6pt', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #dfe7ef', width: i === 1 ? '22mm' : i === 2 ? '48mm' : 'auto' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sectie.rijen.map((rij, ri) => {
                    const w = rij.waarde
                    const sym = w === 'ja' ? '✓ Ja' : w === 'nee' ? '✗ Nee' : w === 'nvt' ? '— N.v.t.' : '—'
                    const kleur = w === 'ja' ? '#2d8a4e' : w === 'nee' ? '#c0392b' : '#94a3b8'
                    return (
                      <tr key={ri} style={{ background: ri % 2 ? '#fafbfc' : '#fff' }}>
                        <td style={{ padding: '2.2mm 2.3mm', borderBottom: '1px solid #edf1f5', color: '#233044' }}>{rij.punt}</td>
                        <td style={{ padding: '2.2mm 2.3mm', borderBottom: '1px solid #edf1f5', color: kleur, fontWeight: 700, whiteSpace: 'nowrap' }}>{sym}</td>
                        <td style={{ padding: '2.2mm 2.3mm', borderBottom: '1px solid #edf1f5', color: '#64748b', fontSize: '8.4pt' }}>{rij.opmerking || ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          ))}

          {/* Aanvullende opmerkingen / vrije notities */}
          {(inhoud?.aanvullend?.trim() || rapport.notities) && (
            <section className="panel" style={{ marginTop: '5mm', border: '1px solid #dfe7ef', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '3mm 4mm', background: '#f6f8fb', borderBottom: '1px solid #dfe7ef', color: '#0d1b3e', fontSize: '9pt', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                Aanvullende opmerkingen
              </div>
              <div style={{ padding: '4mm', fontSize: '9.5pt', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#263244' }}>
                {inhoud?.aanvullend?.trim() || rapport.notities}
              </div>
            </section>
          )}

          {/* Ondertekening */}
          <section className="panel" style={{ marginTop: '5mm', border: '1px solid #dfe7ef', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '3mm 4mm', background: '#f6f8fb', borderBottom: '1px solid #dfe7ef', color: '#0d1b3e', fontSize: '9pt', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Ondertekening
            </div>
            <div style={{ padding: '4mm', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm' }}>
              <div style={{ minHeight: '30mm', border: '1px solid #dfe7ef', borderRadius: 10, padding: '4mm' }}>
                <div style={{ color: '#64748b', fontSize: '7.8pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>Monteur</div>
                {rapport.handtekening_monteur ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rapport.handtekening_monteur} alt="Handtekening monteur" style={{ display: 'block', maxWidth: '60mm', maxHeight: '18mm', marginTop: '3mm' }} />
                ) : (
                  <div style={{ height: '18mm', borderBottom: '1px solid #9aa5b1', marginTop: '4mm' }} />
                )}
                <div style={{ marginTop: '2mm', color: '#64748b', fontSize: '8pt' }}>{BEDRIJF.naam}</div>
              </div>
              <div style={{ minHeight: '30mm', border: '1px solid #dfe7ef', borderRadius: 10, padding: '4mm' }}>
                <div style={{ color: '#64748b', fontSize: '7.8pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>Klant</div>
                {rapport.handtekening_klant ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rapport.handtekening_klant} alt="Handtekening klant" style={{ display: 'block', maxWidth: '60mm', maxHeight: '18mm', marginTop: '3mm' }} />
                    {rapport.getekend_op && (
                      <span style={{ display: 'inline-flex', marginTop: '2mm', borderRadius: 999, padding: '1.3mm 2.7mm', background: 'rgba(45,138,78,.1)', color: '#2d8a4e', fontSize: '7.8pt', fontWeight: 800 }}>
                        Getekend op {new Date(rapport.getekend_op).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ height: '18mm', borderBottom: '1px solid #9aa5b1', marginTop: '4mm' }} />
                    <div style={{ marginTop: '2mm', color: '#64748b', fontSize: '8pt' }}>Nog niet getekend</div>
                  </>
                )}
              </div>
            </div>
          </section>

          <footer style={{ marginTop: '7mm', borderTop: '1px solid #dfe7ef', paddingTop: '3mm', color: '#64748b', fontSize: '7.5pt', textAlign: 'center', lineHeight: 1.5 }}>
            {BEDRIJF.naam} · KVK {BEDRIJF.kvk} · BTW {BEDRIJF.btw} · {BEDRIJF.email}
          </footer>
        </div>
      </article>
    </>
  )
}
