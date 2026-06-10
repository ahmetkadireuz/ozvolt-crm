export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql } from '@/lib/db'
import { ensureProjectbeheerTables, type RapportSectie } from '@/lib/projectbeheer'
import KlantTekenen from './KlantTekenen'

export default async function KlantRapportPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klantId = await getKlantSessie()
  if (!klantId) redirect('/klant/geen-toegang')

  await ensureProjectbeheerTables()
  const rows = await sql`
    SELECT r.*, k.type_werk, k.omschrijving AS klus_omschrijving
    FROM opleveringsrapporten r
    JOIN klussen k ON k.id = r.klus_id
    WHERE r.id = ${id} AND r.klant_id = ${klantId}
  `
  if (!rows[0]) notFound()

  const rapport = rows[0]
  const fotos: { url: string; caption?: string }[] = rapport.fotos ?? []
  const inhoud = rapport.inhoud as { secties?: RapportSectie[]; aanvullend?: string } | null
  const secties: RapportSectie[] = inhoud?.secties ?? []
  const isGetekend = !!rapport.handtekening_klant

  return (
    <div>
      <a href="/klant/dashboard" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>← Terug naar overzicht</a>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginTop: 16, border: '1px solid #e2e8f0' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#0d1b3e' }}>
          {rapport.titel}
        </h1>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>
          {rapport.klus_omschrijving ?? rapport.type_werk}
          {' · '}{new Date(rapport.aangemaakt_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {rapport.notities && (
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            {rapport.notities}
          </div>
        )}

        {/* Checklist secties */}
        {secties.map((sectie, si) => (
          <div key={si} style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#fff', background: '#0d1b3e', padding: '7px 12px', borderRadius: '8px 8px 0 0' }}>
              {sectie.titel}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {sectie.rijen.map((rij, ri) => {
                  const w = rij.waarde
                  const sym = w === 'ja' ? '✓ Ja' : w === 'nee' ? '✗ Nee' : w === 'nvt' ? '— N.v.t.' : '—'
                  const kleur = w === 'ja' ? '#2d8a4e' : w === 'nee' ? '#c0392b' : '#94a3b8'
                  return (
                    <tr key={ri} style={{ background: ri % 2 ? '#f8fafc' : '#fff' }}>
                      <td style={{ padding: '8px 10px', border: '1px solid #e8edf3' }}>{rij.punt}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #e8edf3', color: kleur, fontWeight: 700, whiteSpace: 'nowrap', width: 80, textAlign: 'center' }}>{sym}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid #e8edf3', color: '#64748b', fontSize: 12, width: '32%' }}>{rij.opmerking || ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}

        {inhoud?.aanvullend?.trim() && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: '#94a3b8', marginBottom: 4 }}>Aanvullende opmerkingen</div>
            <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e8edf3', borderRadius: 8, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#475569' }}>
              {inhoud.aanvullend}
            </div>
          </div>
        )}

        {/* Foto's */}
        {fotos.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
            marginTop: 20,
          }}>
            {fotos.map((foto, i) => (
              <div key={i}>
                <a href={foto.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.url}
                    alt={foto.caption ?? `Foto ${i + 1}`}
                    style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, display: 'block', border: '1px solid #e2e8f0' }}
                  />
                </a>
                {foto.caption && (
                  <p style={{ fontSize: 11, color: '#64748b', margin: '6px 0 0', textAlign: 'center' }}>{foto.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Handtekening monteur */}
        {rapport.handtekening_monteur && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: '#94a3b8', marginBottom: 6 }}>Handtekening monteur</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rapport.handtekening_monteur} alt="Handtekening monteur" style={{ maxWidth: 240, display: 'block' }} />
          </div>
        )}
      </div>

      {/* Ondertekenen of bevestiging */}
      {isGetekend ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginTop: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 99, background: 'rgba(45,138,78,.1)', color: '#2d8a4e', fontSize: 13, fontWeight: 800 }}>
            ✓ Ondertekend{rapport.getekend_op ? ` op ${new Date(rapport.getekend_op).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rapport.handtekening_klant} alt="Uw handtekening" style={{ maxWidth: 280, display: 'block', marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
        </div>
      ) : (
        <KlantTekenen rapportId={rapport.id} />
      )}
    </div>
  )
}
