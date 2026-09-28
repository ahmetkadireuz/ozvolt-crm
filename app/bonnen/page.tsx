export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { haalAnalyses, haalGrootboeken, haalPostvak, haalRecenteDocumenten, leverancierNaam } from '@/lib/bonnen/data'
import BonnenClient, { type BonItem } from './BonnenClient'

export const metadata: Metadata = { title: 'Bonnen' }

function num(v: unknown) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

export default async function BonnenPage() {
  const adminId = process.env.MONEYBIRD_ADMIN_ID ?? ''
  const gekoppeld = !!process.env.MONEYBIRD_API_TOKEN && !!adminId
  const inboxAdres = process.env.MONEYBIRD_INBOX_EMAIL ?? null

  let items: BonItem[] = []
  let grootboeken: { id: string; naam: string; type: string }[] = []
  let postvak = 0
  let fout: string | null = null

  if (gekoppeld) {
    try {
      const [docs, gb, analyses, pv] = await Promise.all([haalRecenteDocumenten(3), haalGrootboeken(), haalAnalyses(), haalPostvak()])
      grootboeken = gb
      postvak = pv.length
      items = docs.map((d: any) => ({
        id: String(d.id),
        soort: d._soort,
        datum: d.date ?? '',
        leverancier: leverancierNaam(d),
        totaal: num(d.total_price_incl_tax),
        heeftBijlage: Array.isArray(d.attachments) && d.attachments.length > 0,
        regels: (d.details ?? []).map((r: any) => ({
          id: String(r.id),
          omschrijving: r.description ?? '',
          grootboek_id: r.ledger_account_id ? String(r.ledger_account_id) : null,
        })),
        analyse: analyses.get(String(d.id)) ?? null,
      }))
    } catch (err) {
      fout = err instanceof Error ? err.message : String(err)
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Bonnen</h1>
          <p className="page-sub">AI-controle van je inkoopfacturen en bonnen in Moneybird — wijzigingen alleen na jouw akkoord.</p>
        </div>
      </div>

      {!gekoppeld && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #ea580c' }}>
          Moneybird is nog niet gekoppeld. Voeg <code>MONEYBIRD_API_TOKEN</code> en <code>MONEYBIRD_ADMIN_ID</code> toe in Vercel.
        </div>
      )}
      {fout && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #dc2626' }}>
          <strong>Moneybird-gegevens konden niet worden opgehaald.</strong>
          <div style={{ fontSize: '.84rem', color: 'var(--text-mute)', marginTop: 4 }}>{fout}</div>
        </div>
      )}

      {/* ── Mailkoppeling ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Bonnen per e-mail</div>
        <div style={{ fontSize: '.84rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
          {inboxAdres ? (
            <>Bonnen en facturen die op <strong>financien@ozvoltelektro.nl</strong> binnenkomen worden doorgestuurd naar
            Moneybird (<code>{inboxAdres}</code>). Moneybird leest de bijlage uit en zet hem klaar; hier controleert de AI
            de boeking en de categorie.</>
          ) : (
            <>Nog niet ingesteld: stuur alle mail van <strong>financien@ozvoltelektro.nl</strong> automatisch door naar het
            inbox-adres van Moneybird (Moneybird → Documenten → inbox-e-mailadres). Zet dat adres daarna in Vercel als
            <code> MONEYBIRD_INBOX_EMAIL</code>, dan verschijnt het hier.</>
          )}
          {postvak > 0 && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--soft-orange)', borderRadius: 8, color: 'var(--tint-orange)' }}>
              <strong>{postvak} document{postvak === 1 ? '' : 'en'}</strong> in het Moneybird-postvak wacht{postvak === 1 ? '' : 'en'} nog op
              verwerking.{' '}
              <a href={`https://moneybird.com/${adminId}/documents`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tint-orange)', fontWeight: 700 }}>
                Open postvak →
              </a>
            </div>
          )}
        </div>
      </div>

      {gekoppeld && !fout && <BonnenClient items={items} grootboeken={grootboeken} adminId={adminId} />}
    </div>
  )
}
