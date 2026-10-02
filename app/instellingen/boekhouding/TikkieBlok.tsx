'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'

type Props = {
  env: { naam: string; aanwezig: boolean }[]
  omgeving: 'sandbox' | 'productie'
  aan: boolean
  webhookUrl: string
}

// Tikkie-koppeling: alleen ja/nee per env-variabele, nooit de waarden zelf
export default function TikkieBlok({ env, omgeving, aan, webhookUrl }: Props) {
  const [bezig, setBezig] = useState<'test' | 'webhook' | null>(null)
  const [test, setTest] = useState<{ ok: boolean; melding: string } | null>(null)
  const [webhook, setWebhook] = useState<{ ok: boolean; melding: string } | null>(null)

  async function roep(pad: string, soort: 'test' | 'webhook') {
    setBezig(soort)
    try {
      const res = await fetch(pad, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      const r = { ok: !!data.ok, melding: data.melding ?? data.error ?? `✗ Onbekende fout (HTTP ${res.status})` }
      if (soort === 'test') setTest(r)
      else setWebhook(r)
    } catch (err: any) {
      const r = { ok: false, melding: '✗ ' + (err?.message ?? 'Verbinding mislukt') }
      if (soort === 'test') setTest(r)
      else setWebhook(r)
    } finally {
      setBezig(null)
    }
  }

  const kleur = (ok: boolean) => (ok ? 'var(--tint-green)' : '#dc2626')

  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #4b3fbf' }}>
      <div className="section-label">Tikkie</div>
      <p style={{ fontSize: '.86rem', color: 'var(--text-2)', lineHeight: 1.7, margin: '0 0 12px' }}>
        Bij het versturen van een (deel)factuur maakt het CRM automatisch een Tikkie voor dat bedrag.
        De klant ziet &quot;Betaal met Tikkie&quot; in de mail, op de PDF en in het portaal. Betalingen zetten de factuur
        via de webhook automatisch op betaald; de boeking in Moneybird loopt via de bankkoppeling.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6, marginBottom: 12 }}>
        {env.map(e => (
          <div key={e.naam} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.aanwezig ? 'var(--green)' : 'var(--text-soft)', flexShrink: 0 }} />
            <code style={{ color: 'var(--text)' }}>{e.naam}</code>
            <span style={{ color: e.aanwezig ? 'var(--tint-green)' : 'var(--text-soft)', fontWeight: 700 }}>{e.aanwezig ? 'ja' : 'nee'}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem' }}>
          <span style={{ color: 'var(--text-mute)' }}>Omgeving:</span>
          <strong style={{ color: omgeving === 'sandbox' ? 'var(--tint-amber)' : 'var(--text)' }}>{omgeving}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => roep('/api/tikkie/test', 'test')} disabled={!!bezig}>
          <Icon name="refresh" size={15} />
          {bezig === 'test' ? 'Testen…' : 'Test Tikkie-koppeling'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => roep('/api/tikkie/webhook-activeren', 'webhook')} disabled={!!bezig || !aan}
          title={`Tikkie stuurt betalingen naar ${webhookUrl}`}>
          <Icon name="external" size={15} />
          {bezig === 'webhook' ? 'Bezig…' : 'Tikkie-webhook activeren'}
        </button>
      </div>
      {test && <div style={{ marginTop: 10, fontSize: '.86rem', fontWeight: 700, color: kleur(test.ok) }}>{test.melding}</div>}
      {webhook && <div style={{ marginTop: 6, fontSize: '.86rem', fontWeight: 700, color: kleur(webhook.ok), wordBreak: 'break-all' }}>{webhook.melding}</div>}
      <div style={{ fontSize: '.74rem', color: 'var(--text-soft)', marginTop: 8 }}>
        De webhook hoef je maar één keer te activeren. Webhook-adres: <code>{webhookUrl}</code>
      </div>
    </div>
  )
}
