export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql } from '@/lib/db'

export default async function KlantRapportPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klantId = await getKlantSessie()
  if (!klantId) redirect('/klant/geen-toegang')

  const rows = await sql`
    SELECT r.*, k.type_werk, k.omschrijving AS klus_omschrijving
    FROM opleveringsrapporten r
    JOIN klussen k ON k.id = r.klus_id
    WHERE r.id = ${id} AND r.klant_id = ${klantId}
  `
  if (!rows[0]) notFound()

  const rapport = rows[0]
  const fotos: { url: string; caption?: string }[] = rapport.fotos ?? []

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
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 24, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            {rapport.notities}
          </div>
        )}

        {fotos.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Er zijn nog geen foto&apos;s toegevoegd aan dit rapport.</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
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
      </div>
    </div>
  )
}
