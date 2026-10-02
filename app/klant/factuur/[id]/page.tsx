export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect, notFound } from 'next/navigation'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql, formatEuro } from '@/lib/db'
import { BEDRIJF, betaalQrSvg, ibanLeesbaar, idealAan } from '@/lib/betalen'
import Overschrijving from '../../_components/Overschrijving'
import BetaalKnop from './BetaalKnop'
import Icon from '@/components/Icon'
import { controleerTikkieFactuur, tikkieQrSvg, tikkieVoorFactuur } from '@/lib/tikkie'

export default async function KlantFactuurPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klantId = await getKlantSessie()
  if (!klantId) redirect('/klant/geen-toegang')

  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam, k.email AS klant_email, k.locatie AS klant_locatie
    FROM facturen f
    JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${id} AND f.klant_id = ${klantId} AND f.status <> 'concept'
  `
  if (!rows[0]) notFound()

  const f = rows[0]
  // Vangnet naast de webhook: is de Tikkie inmiddels betaald?
  if (f.status !== 'betaald' && f.tikkie_token && await controleerTikkieFactuur(f.id)) f.status = 'betaald'
  const regels: { omschrijving: string; beschrijving?: string; aantal: number; prijs: number }[] = Array.isArray(f.regels) ? f.regels : []
  const sub = regels.reduce((s, r) => s + Number(r.aantal) * Number(r.prijs), 0)
  const btw = sub * (Number(f.btw_pct) / 100)
  const totaal = sub + btw

  const isBetaald = f.status === 'betaald'
  const vervaldatum = new Date(f.factuurdatum)
  vervaldatum.setDate(vervaldatum.getDate() + (Number(f.betalingstermijn) || 14))

  // Oude 50/50-facturen (twee termijnen op één factuur) tonen per termijn
  const termijnen = f.betaling_50_50 ? [totaal / 2, totaal / 2] : [totaal]
  const qrs = isBetaald ? [] : await Promise.all(termijnen.map(b => betaalQrSvg(Math.round(b * 100) / 100, f.factuurnummer)))
  const metIdeal = idealAan()

  // Tikkie (ABN AMRO): iDEAL met het geld direct op de rekening. Lukt het niet, dan blijft de overschrijving staan.
  let tikkieUrl: string | null = null
  if (!isBetaald && !f.betaling_50_50) {
    try { tikkieUrl = await tikkieVoorFactuur(f.id) } catch (err) { console.error('[tikkie portaal]', err) }
  }
  const tikkieQr = tikkieUrl ? await tikkieQrSvg(tikkieUrl) : null

  return (
    <div>
      <a href="/klant/dashboard" className="kp-back">← Terug naar overzicht</a>

      <div className="kp-doc">
        <div className="kp-doc-head">
          <div>
            <h1 className="kp-doc-title">Factuur {f.factuurnummer}</h1>
            <p className="kp-doc-meta">
              {new Date(f.factuurdatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
              {!isBetaald && <> · te betalen vóór {vervaldatum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}</>}
            </p>
          </div>
          <span className={`kp-badge ${isBetaald ? 'kp-badge-green' : f.status === 'te_laat' ? 'kp-badge-red' : 'kp-badge-amber'}`}>
            {isBetaald ? 'Betaald' : f.status === 'te_laat' ? 'Te laat' : 'Openstaand'}
          </span>
        </div>

        <div className="kp-doc-klant">
          <strong style={{ color: 'var(--kp-text)' }}>{f.klant_naam}</strong>
          {f.klant_locatie && <> · {f.klant_locatie}</>}
        </div>

        <table className="kp-table">
          <thead>
            <tr>
              <th>Omschrijving</th>
              <th className="num hide-sm">Aantal</th>
              <th className="num hide-sm">Prijs</th>
              <th className="num">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {regels.map((r, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--kp-text)' }}>{r.omschrijving}</div>
                  {r.beschrijving && <div style={{ fontSize: 12, color: 'var(--kp-text-soft)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{r.beschrijving}</div>}
                </td>
                <td className="num hide-sm">{r.aantal}</td>
                <td className="num hide-sm">{formatEuro(Number(r.prijs))}</td>
                <td className="num" style={{ fontWeight: 700, color: 'var(--kp-text)' }}>{formatEuro(Number(r.aantal) * Number(r.prijs))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="kp-totals">
          <div className="kp-totals-row"><span>Subtotaal excl. btw</span><span>{formatEuro(sub)}</span></div>
          <div className="kp-totals-row"><span>Btw ({Number(f.btw_pct)}%)</span><span>{formatEuro(btw)}</span></div>
          <div className="kp-totals-row total"><span>Totaal</span><span>{formatEuro(totaal)}</span></div>
        </div>

        <div className="kp-actions">
          {isBetaald && <div className="kp-paid">✓ Deze factuur is betaald. Hartelijk dank!</div>}

          {tikkieUrl && (
            <div className="kp-pay">
              <div className="kp-pay-head">
                <div className="kp-pay-title">Direct betalen met iDEAL</div>
                <div className="kp-pay-sub">Veilig via Tikkie van ABN AMRO; uw betaling is direct bij ons binnen.</div>
              </div>
              <div className="kp-pay-body">
                <div className="kp-pay-rows">
                  <a href={tikkieUrl} className="kp-btn kp-btn-primary" style={{ width: '100%' }}>
                    <Icon name="payments" size={18} />
                    Betaal {formatEuro(totaal)} met iDEAL
                  </a>
                </div>
                {tikkieQr && (
                  <div className="kp-qr kp-qr-desktop">
                    <div className="kp-qr-img" dangerouslySetInnerHTML={{ __html: tikkieQr }} />
                    <div className="kp-qr-text">Scan met de camera van uw telefoon</div>
                  </div>
                )}
              </div>
            </div>
          )}
          {tikkieUrl && <div className="kp-alt">Liever zelf overmaken?</div>}

          {!isBetaald && totaal > 0 && termijnen.map((bedrag, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Overschrijving
                titel={termijnen.length > 1 ? `${i === 0 ? '1e' : '2e'} termijn (50%) — ${i === 0 ? 'bij start' : 'na oplevering'}` : undefined}
                bedrag={formatEuro(bedrag)}
                kenmerk={f.factuurnummer}
                iban={ibanLeesbaar()}
                tenaamstelling={BEDRIJF.naam}
                qrSvg={tikkieUrl ? null : (qrs[i] ?? null)}
              />
              {metIdeal && !tikkieUrl && (
                <>
                  <div className="kp-alt">Liever met iDEAL betalen?</div>
                  <BetaalKnop factuurId={f.id} totaal={formatEuro(bedrag)} termijn={termijnen.length > 1 ? ((i + 1) as 1 | 2) : undefined} />
                </>
              )}
            </div>
          ))}

          <a href={`/api/facturen/${f.id}/pdf`} target="_blank" rel="noopener noreferrer" className="kp-btn kp-btn-ghost">
            <Icon name="download" size={16} />
            Factuur downloaden (pdf)
          </a>
        </div>
      </div>
    </div>
  )
}
