export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect, notFound } from 'next/navigation'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql, formatEuro } from '@/lib/db'
import { BEDRIJF, betaalQrSvg, ibanAanwezig, ibanLeesbaar, idealAan, linkQrSvg } from '@/lib/betalen'
import { ensureTikkieKolommen, tikkieLinkMetAanmaken } from '@/lib/tikkie'
import FactuurDocument, { type Termijn } from '@/components/FactuurDocument'
import BetaalKnop from './BetaalKnop'
import Icon from '@/components/Icon'

export default async function KlantFactuurPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klantId = await getKlantSessie()
  if (!klantId) redirect('/klant/geen-toegang')

  await ensureTikkieKolommen()
  const rows = await sql`
    SELECT f.*, k.naam AS klant_naam, k.email AS klant_email, k.locatie AS klant_locatie
    FROM facturen f
    JOIN klanten k ON k.id = f.klant_id
    WHERE f.id = ${id} AND f.klant_id = ${klantId} AND f.status <> 'concept'
  `
  if (!rows[0]) notFound()

  const f = rows[0]
  const regels: { omschrijving: string; beschrijving?: string; aantal: number; prijs: number }[] = Array.isArray(f.regels) ? f.regels : []
  const sub = regels.reduce((s, r) => s + Number(r.aantal) * Number(r.prijs), 0)
  const btw = sub * (Number(f.btw_pct) / 100)
  const totaal = sub + btw
  const isBetaald = f.status === 'betaald'

  // Oude 50/50-facturen (twee termijnen op één factuur) tonen per termijn, zonder Tikkie
  const bedragen = f.betaling_50_50 ? [totaal / 2, totaal / 2] : [totaal]
  // Query hierboven filtert al op de klant van deze sessie: alleen díe klant ziet de Tikkie-link
  const tikkieUrl = isBetaald || bedragen.length > 1 || totaal <= 0 ? null : await tikkieLinkMetAanmaken(f)
  const tikkieQr = tikkieUrl ? await linkQrSvg(tikkieUrl).catch(() => null) : null
  const metIdeal = idealAan()

  // 50/50: verwijzing naar de andere termijn (alleen als die ook van deze klant is en zichtbaar)
  const isTermijn = f.soort === 'voorschot' || f.soort === 'eind'
  const andere = isTermijn && f.gekoppelde_factuur_id
    ? (await sql`
        SELECT id, factuurnummer, status, regels, btw_pct FROM facturen
        WHERE id = ${f.gekoppelde_factuur_id} AND klant_id = ${klantId} AND status <> 'concept'`)[0] ?? null
    : null
  const andereBedrag = andere
    ? (Array.isArray(andere.regels) ? andere.regels : []).reduce((t: number, r: any) => t + Number(r.aantal) * Number(r.prijs), 0) * (1 + Number(andere.btw_pct) / 100)
    : 0

  const termijnen: Termijn[] = isBetaald || totaal <= 0 ? [] : await Promise.all(bedragen.map(async (b, i) => ({
    titel: bedragen.length > 1 ? `${i === 0 ? '1e' : '2e'} termijn (50%), ${i === 0 ? 'bij start' : 'na oplevering'}` : undefined,
    bedrag: Math.round(b * 100) / 100,
    epcQr: await betaalQrSvg(Math.round(b * 100) / 100, f.factuurnummer),
    tikkieUrl,
    tikkieQr,
  })))

  return (
    <div>
      <a href="/klant/dashboard" className="kp-terug">← Terug naar overzicht</a>
      {isTermijn && (
        <div className="kp-card" style={{ marginBottom: 14 }}>
          <div className="kp-card-row">
            <div>
              <div className="kp-card-title">{f.soort === 'voorschot' ? 'Eerste termijn (50%)' : 'Tweede termijn (50%)'}</div>
              <div className="kp-card-meta">
                Deze factuur is {f.soort === 'voorschot' ? 'de eerste' : 'de tweede'} van twee termijnen.
                {andere && <> {f.soort === 'voorschot' ? 'Tweede' : 'Eerste'} termijn: factuur {andere.factuurnummer}, {formatEuro(andereBedrag)}.</>}
              </div>
              {andere && (
                <a href={`/klant/factuur/${andere.id}`} className="kp-btn-link" style={{ marginTop: 6 }}>
                  {andere.status === 'betaald' ? 'Andere termijn bekijken →' : 'Andere termijn bekijken en betalen →'}
                </a>
              )}
            </div>
            {andere && (
              <div className="kp-card-side">
                <span className={`kp-badge ${andere.status === 'betaald' ? 'kp-badge-green' : andere.status === 'te_laat' ? 'kp-badge-red' : 'kp-badge-amber'}`}>
                  {andere.status === 'betaald' ? '✓ Betaald' : andere.status === 'te_laat' ? 'Te laat' : 'Openstaand'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      <FactuurDocument
        f={f}
        regels={regels}
        totalen={{ sub, btw, totaal }}
        iban={ibanAanwezig() ? ibanLeesbaar() : null}
        tenaamstelling={BEDRIJF.naam}
        termijnen={termijnen}
        extra={metIdeal ? (i) => (
          <>
            <div className="kp-alt">Liever met iDEAL betalen?</div>
            <BetaalKnop factuurId={f.id} totaal={formatEuro(termijnen[i].bedrag)} termijn={termijnen.length > 1 ? ((i + 1) as 1 | 2) : undefined} />
          </>
        ) : undefined}
        onderaan={
          <a href={`/api/facturen/${f.id}/pdf`} target="_blank" rel="noopener noreferrer" className="kp-pdf-knop">
            <Icon name="download" size={16} />
            Factuur downloaden (pdf)
          </a>
        }
      />
    </div>
  )
}
