'use client'

import { useState } from 'react'

type Bericht = {
  id: number; klant_id: number | null; klus_id: number | null
  klant_naam: string | null; klant_tel: string | null; klus_naam: string | null
  direction: string; body: string | null; status: string | null; aangemaakt_op: string
}

function formatTel(tel: string) {
  const clean = tel.replace(/[^0-9]/g, '')
  if (clean.startsWith('0')) return '31' + clean.slice(1)
  return clean
}

function timeAgo(dt: string) {
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
  if (diff < 60) return 'zojuist'
  if (diff < 3600) return `${Math.floor(diff / 60)}m geleden`
  if (diff < 86400) return `${Math.floor(diff / 3600)}u geleden`
  return new Date(dt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default function WhatsAppClient({ berichten, klanten, apiActief }: {
  berichten: Bericht[]; klanten: any[]; apiActief: boolean
}) {
  const [sendForm, setSendForm] = useState({ klant_id: '', bericht: '' })
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState('')

  async function stuurBericht(e: React.FormEvent) {
    e.preventDefault()
    if (!sendForm.klant_id || !sendForm.bericht) return
    setSending(true)
    setSendMsg('')
    const res = await fetch('/api/whatsapp/sturen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sendForm),
    })
    const data = await res.json()
    setSendMsg(res.ok ? '✅ Bericht verstuurd!' : `❌ ${data.error}`)
    if (res.ok) setSendForm(f => ({ ...f, bericht: '' }))
    setSending(false)
  }

  const selectedKlant = klanten.find(k => k.id === Number(sendForm.klant_id))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">WhatsApp</h1>
        {!apiActief && (
          <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 20, fontSize: '.78rem', fontWeight: 700 }}>
            ⚠ API niet ingesteld — link-modus actief
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Bericht versturen */}
        <div className="card">
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Bericht versturen
          </div>

          <form onSubmit={stuurBericht} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Klant *</label>
              <select className="form-ctrl" value={sendForm.klant_id} onChange={e => setSendForm(f => ({ ...f, klant_id: e.target.value }))} required>
                <option value="">— Kies klant —</option>
                {klanten.map(k => <option key={k.id} value={k.id}>{k.naam} ({k.telefoon})</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Bericht *</label>
              <textarea className="form-ctrl" rows={4} value={sendForm.bericht}
                onChange={e => setSendForm(f => ({ ...f, bericht: e.target.value }))}
                placeholder="Typ je bericht..." required />
            </div>

            {sendMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: sendMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', fontSize: '.85rem', color: sendMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
                {sendMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              {apiActief ? (
                <button type="submit" className="btn btn-primary" disabled={sending} style={{ background: '#25d366' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                  {sending ? 'Versturen...' : 'Versturen via API'}
                </button>
              ) : null}

              {/* Altijd: open in WhatsApp */}
              {selectedKlant && (
                <a
                  href={`https://wa.me/${formatTel(selectedKlant.telefoon)}?text=${encodeURIComponent(sendForm.bericht)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ background: '#25d366', textDecoration: 'none' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                  Open in WhatsApp
                </a>
              )}
            </div>
          </form>
        </div>

        {/* Snelle klant-links */}
        <div className="card">
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Klanten — direct WhatsApp
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {klanten.slice(0, 15).map(k => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0d1b3e', fontSize: '.9rem' }}>{k.naam}</div>
                  <div style={{ fontSize: '.78rem', color: '#8ba8c4' }}>{k.telefoon}</div>
                </div>
                <a
                  href={`https://wa.me/${formatTel(k.telefoon)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{ background: '#25d366', color: '#fff', textDecoration: 'none' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Berichtgeschiedenis */}
      {berichten.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Berichtgeschiedenis
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {berichten.map(b => (
              <div key={b.id} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px',
                background: b.direction === 'inbound' ? '#f0fdf4' : '#f8fafc',
                borderRadius: 8, borderLeft: `3px solid ${b.direction === 'inbound' ? '#16a34a' : '#25d366'}`
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: b.direction === 'inbound' ? '#16a34a' : '#25d366', flexShrink: 0 }}>
                  {b.direction === 'inbound' ? 'call_received' : 'call_made'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '.85rem', color: '#0d1b3e' }}>{b.klant_naam ?? 'Onbekend'}</span>
                    <span style={{ fontSize: '.75rem', color: '#8ba8c4' }}>{timeAgo(b.aangemaakt_op)}</span>
                  </div>
                  <div style={{ fontSize: '.85rem', color: '#4a5568' }}>{b.body ?? '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
