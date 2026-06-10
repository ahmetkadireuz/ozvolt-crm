export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql } from '@/lib/db'
import { ensureProjectbeheerTables } from '@/lib/projectbeheer'
import KlantTekenen from './KlantTekenen'

type Foto = { url: string; caption?: string }

function herstelItems(inhoud: any): string[] {
  if (!inhoud) return []
  if (Array.isArray(inhoud.items)) return inhoud.items.filter((s: any) => typeof s === 'string' && s.trim())
  if (Array.isArray(inhoud.secties)) {
    const out: string[] = []
    for (const s of inhoud.secties) for (const r of (s.rijen ?? [])) if (r.punt) out.push(String(r.punt))
    return out
  }
  return []
}

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
  const items = herstelItems(rapport.inhoud)
  const aanvullend = rapport.inhoud?.aanvullend ?? rapport.notities ?? ''
  const fotos: Foto[] = Array.isArray(rapport.fotos) ? rapport.fotos : []
  const isGetekend = !!rapport.handtekening_klant

  return (
    <div>
      <a href="/klant/dashboard" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>← Terug naar overzicht</a>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginTop: 16, border: '1px solid #e2e8f0' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#0d1b3e' }}>
          {rapport.titel}
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
          {rapport.type_werk || rapport.klus_omschrijving || 'Werkzaamheden'}
          {' · '}
          {new Date(rapport.aangemaakt_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Uitgevoerde werkzaamheden */}
        {items.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b', marginBottom: 10 }}>
              Uitgevoerde werkzaamheden
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {items.map((it, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: 14, lineHeight: 1.55, color: '#1e293b' }}>
                  <span style={{ color: '#1d4fa3', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>•</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Aanvullende opmerkingen */}
        {aanvullend.trim() && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b', marginBottom: 8 }}>
              Aanvullende opmerkingen
            </div>
            <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e8edf3', borderRadius: 10, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#475569' }}>
              {aanvullend}
            </div>
          </div>
        )}

        {/* Foto's */}
        {fotos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b', marginBottom: 10 }}>
              Foto&apos;s
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
            }}>
              {fotos.map((foto, i) => (
                <div key={i}>
                  <a href={foto.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foto.url}
                      alt={foto.caption ?? `Foto ${i + 1}`}
                      style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, display: 'block', border: '1px solid #e2e8f0' }}
                    />
                  </a>
                  {foto.caption && (
                    <p style={{ fontSize: 11, color: '#64748b', margin: '6px 0 0', textAlign: 'center' }}>{foto.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Handtekening monteur */}
        {rapport.handtekening_monteur && (
          <div style={{ marginTop: 8 }}>
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
