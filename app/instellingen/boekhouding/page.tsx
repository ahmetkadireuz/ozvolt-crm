export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { sql, formatEuro } from '@/lib/db'
import CopyKnop from './CopyKnop'
import Icon from '@/components/Icon'

export const metadata: Metadata = { title: 'Boekhouding' }

const WEBHOOK_PATH = '/api/moneybird/webhook'

export default async function BoekhoudingPage() {
  const heeftToken = !!process.env.MONEYBIRD_API_TOKEN
  const heeftAdmin = !!process.env.MONEYBIRD_ADMIN_ID
  const gekoppeld = heeftToken && heeftAdmin
  const siteUrl = process.env.SITE_URL ?? 'https://portaal.ozvoltelektro.nl'
  const webhookUrl = siteUrl.replace(/\/$/, '') + WEBHOOK_PATH

  // Live status van Moneybird-koppeling testen
  let liveCheck: { ok: boolean; foutmelding?: string; aantal_open?: number } = { ok: false }
  if (gekoppeld) {
    try {
      const res = await fetch(
        `https://moneybird.com/api/v2/${process.env.MONEYBIRD_ADMIN_ID}/sales_invoices?filter=state:open`,
        { headers: { Authorization: `Bearer ${process.env.MONEYBIRD_API_TOKEN}` }, cache: 'no-store' },
      )
      if (res.ok) {
        const data = await res.json()
        liveCheck = { ok: true, aantal_open: Array.isArray(data) ? data.length : 0 }
      } else {
        liveCheck = { ok: false, foutmelding: `HTTP ${res.status}` }
      }
    } catch (err) {
      liveCheck = { ok: false, foutmelding: err instanceof Error ? err.message : String(err) }
    }
  }

  // Synchronisatie-overzicht uit CRM
  const [aantalCRM, gesyncteFacturen, betaaldRecent] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM facturen WHERE status IN ('verstuurd','te_laat','betaald')`,
    sql`SELECT COUNT(*)::int AS n FROM facturen WHERE moneybird_id IS NOT NULL`,
    sql`
      SELECT f.id, f.factuurnummer, f.regels, f.btw_pct, f.bijgewerkt_op, kt.naam AS klant_naam
      FROM facturen f JOIN klanten kt ON kt.id = f.klant_id
      WHERE f.status = 'betaald'
      ORDER BY f.bijgewerkt_op DESC NULLS LAST
      LIMIT 5
    `,
  ])
  const totaalCRM = aantalCRM[0]?.n ?? 0
  const totaalGesynct = gesyncteFacturen[0]?.n ?? 0

  function inclBtw(r: any) {
    const regels = Array.isArray(r.regels) ? r.regels : []
    const sub = regels.reduce((s: number, l: any) => s + Number(l.aantal) * Number(l.prijs), 0)
    return sub * (1 + Number(r.btw_pct ?? 21) / 100)
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Boekhouding</h1>
          <p style={{ margin: 0, fontSize: '.78rem', color: '#8ba8c4' }}>
            Koppeling met Moneybird en je bankrekening.
          </p>
        </div>
      </div>

      {/* ── Status-kaart ── */}
      <div className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${liveCheck.ok ? '#16a34a' : (gekoppeld ? '#ea580c' : '#94a3b8')}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: liveCheck.ok ? 'rgba(45,138,78,.12)' : '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={liveCheck.ok ? 'check-circle' : 'alert-circle'} size={26} style={{ color: liveCheck.ok ? '#16a34a' : '#64748b' }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, color: '#0d1b3e', fontSize: '1.05rem' }}>
              {liveCheck.ok ? 'Moneybird is gekoppeld' : gekoppeld ? 'Moneybird configuratie aanwezig, maar API reageert niet' : 'Moneybird is nog niet gekoppeld'}
            </div>
            <div style={{ fontSize: '.82rem', color: '#64748b', marginTop: 2 }}>
              {liveCheck.ok && `${liveCheck.aantal_open ?? 0} openstaande factu${(liveCheck.aantal_open ?? 0) === 1 ? 'ur' : 'ren'} in Moneybird.`}
              {!liveCheck.ok && gekoppeld && (liveCheck.foutmelding ?? 'API onbereikbaar')}
              {!gekoppeld && 'Voeg MONEYBIRD_API_TOKEN en MONEYBIRD_ADMIN_ID toe in Vercel.'}
            </div>
          </div>
          <a href="https://moneybird.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>open_in_new</span>
            Open Moneybird
          </a>
        </div>
      </div>

      {/* ── Synchronisatie-overzicht ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '3px solid #1d4fa3' }}>
          <div className="stat-label">In CRM</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>{totaalCRM}</div>
          <div className="stat-sub">Verstuurde/betaalde facturen</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid #16a34a' }}>
          <div className="stat-label">In Moneybird</div>
          <div className="stat-value" style={{ fontSize: '1.4rem', color: '#15803d' }}>{totaalGesynct}</div>
          <div className="stat-sub">{totaalGesynct === totaalCRM ? 'Alles gesynchroniseerd' : `${totaalCRM - totaalGesynct} nog niet gesynct`}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid #7c3aed' }}>
          <div className="stat-label">Openstaand</div>
          <div className="stat-value" style={{ fontSize: '1.4rem', color: '#7c3aed' }}>
            {liveCheck.ok ? (liveCheck.aantal_open ?? 0) : '—'}
          </div>
          <div className="stat-sub">Wachten op betaling via Knab</div>
        </div>
      </div>

      {/* ── Setup-stappen ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Hoe het werkt</div>
        <p style={{ fontSize: '.86rem', color: '#475569', lineHeight: 1.7, margin: '0 0 14px' }}>
          Elke betaalnota die je vanuit het CRM verstuurt komt automatisch in Moneybird terecht.
          Moneybird haalt jouw Knab-rekeningmutaties binnen via de PSD2-koppeling en matcht
          inkomende betalingen aan de factuur. Zodra de factuur in Moneybird op &quot;betaald&quot; springt,
          krijgt de factuur in dit CRM automatisch dezelfde status via een webhook.
        </p>
        <ol style={{ margin: 0, paddingLeft: 22, fontSize: '.86rem', color: '#1e293b', lineHeight: 1.8 }}>
          <li>
            <strong>Moneybird gekoppeld</strong>: API-token en administratie-ID staan in Vercel.{' '}
            {gekoppeld ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Klaar</span> : <span style={{ color: '#ea580c', fontWeight: 700 }}>Nog instellen</span>}
          </li>
          <li>
            <strong>Knab koppelen in Moneybird</strong>: Moneybird → Administratie → Banken → Toevoegen → Knab.
            Volg de PSD2-stappen (inloggen bij Knab + machtiging). Vanaf dat moment komen je Knab-transacties
            automatisch binnen in Moneybird.
          </li>
          <li>
            <strong>Webhook instellen in Moneybird</strong> (eenmalig): kopieer onderstaande URL en plak hem in
            Moneybird → Instellingen → Webhooks → Toevoegen. Vink minstens <em>payment_created</em> en{' '}
            <em>sales_invoice_updated</em> aan.
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{ background: '#f1f5f9', borderRadius: 6, padding: '6px 10px', fontSize: '.78rem', color: '#0d1b3e', wordBreak: 'break-all', flex: '1 1 320px' }}>
                {webhookUrl}
              </code>
              <CopyKnop tekst={webhookUrl} />
            </div>
          </li>
        </ol>
      </div>

      {/* ── Recent betaald ── */}
      <div className="card">
        <div className="section-label">Recent betaald (via Knab/Moneybird)</div>
        {betaaldRecent.length === 0 ? (
          <p style={{ fontSize: '.84rem', color: '#94a3b8', margin: 0 }}>Nog geen betaalde facturen.</p>
        ) : (
          <div style={{ marginTop: 4 }}>
            {betaaldRecent.map((f: any) => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.84rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0d1b3e' }}>{f.klant_naam}</div>
                  <div style={{ fontSize: '.74rem', color: '#8ba8c4' }}>{f.factuurnummer}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontWeight: 700, color: '#15803d' }}>{formatEuro(inclBtw(f))}</div>
                  {f.bijgewerkt_op && (
                    <div style={{ fontSize: '.72rem', color: '#94a3b8' }}>
                      {new Date(f.bijgewerkt_op).toLocaleDateString('nl-NL')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
