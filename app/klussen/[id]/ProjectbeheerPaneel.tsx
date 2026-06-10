'use client'

type Rapport = { id: number; titel: string; type: string | null; getekend_op: string | null; aangemaakt_op: string }

interface Props {
  klusId: number
  rapporten: Rapport[]
  omzet: number
  kosten: number
}

const eur = (n: number) => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ProjectbeheerPaneel({ klusId, rapporten, omzet, kosten }: Props) {
  const resultaat = omzet - kosten

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>

      {/* ── Financieel overzicht (alleen intern) ── */}
      <div className="card">
        <div className="section-label">Financieel overzicht</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {[
            ['Omzet (offerte)', eur(omzet), '#15803d'],
            ['Kosten', eur(kosten), '#dc2626'],
            ['Resultaat', eur(resultaat), resultaat >= 0 ? '#15803d' : '#dc2626'],
          ].map(([label, val, kleur]) => (
            <div key={label as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: '.68rem', color: '#8ba8c4', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: '.9rem', color: kleur as string }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Opleveringsrapporten ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Opleveringsrapporten</div>
          <a href={`/klussen/${klusId}/oplevering`} className="btn btn-primary btn-sm">
            <span className="nav-ico" style={{ fontSize: 15 }}>task_alt</span>
            Nieuw rapport
          </a>
        </div>
        {rapporten.length === 0 ? (
          <p style={{ color: '#8ba8c4', fontSize: '.84rem', margin: '10px 0 0' }}>Nog geen opleveringsrapporten.</p>
        ) : (
          <div style={{ marginTop: 10 }}>
            {rapporten.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.82rem', flexWrap: 'wrap' }}>
                <span style={{ flex: '1 1 200px', fontWeight: 600, color: '#0d1b3e' }}>{r.titel}</span>
                <span className="mono" style={{ color: '#8ba8c4', flexShrink: 0 }}>{new Date(r.aangemaakt_op).toLocaleDateString('nl-NL')}</span>
                {r.getekend_op ? (
                  <span style={{ flexShrink: 0, fontSize: '.7rem', fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: 'rgba(45,138,78,.12)', color: '#15803d' }}>✓ Getekend</span>
                ) : (
                  <span style={{ flexShrink: 0, fontSize: '.7rem', fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: '#f1f5f9', color: '#64748b' }}>Niet getekend</span>
                )}
                <a href={`/klussen/${klusId}/oplevering?rapport=${r.id}`} className="btn btn-ghost btn-sm">Bewerken</a>
                <a href={`/rapporten/${r.id}/print`} target="_blank" className="btn btn-ghost btn-sm">Print</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
