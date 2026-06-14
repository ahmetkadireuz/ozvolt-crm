'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'

const SJABLONEN = [
  { label: 'Offerte follow-up', prompt: 'Schrijf een vriendelijke follow-up mail voor een openstaande offerte.' },
  { label: 'Afspraak bevestiging', prompt: 'Schrijf een mail om een afspraak voor een installatie te bevestigen.' },
  { label: 'Oplevering bericht', prompt: 'Schrijf een mail om de oplevering van een klus te melden.' },
  { label: 'Betalingsherinnering', prompt: 'Schrijf een vriendelijke betalingsherinnering voor een openstaande factuur.' },
  { label: 'Welkomstmail nieuwe klant', prompt: 'Schrijf een welkomstmail voor een nieuwe klant.' },
]

export default function MailClient({ klanten, klussen, aiActief }: {
  klanten: any[]; klussen: any[]; aiActief: boolean
}) {
  const [form, setForm] = useState({
    klant_id: '', klus_id: '', onderwerp: '', context: '', toon: 'professioneel',
  })
  const [gegenereerd, setGegenereerd] = useState('')
  const [genereren, setGenereren] = useState(false)
  const [versturen, setVersturen] = useState(false)
  const [sendMsg, setSendMsg] = useState('')

  const selectedKlant = klanten.find(k => k.id === Number(form.klant_id))
  const selectedKlus = klussen.find(k => k.id === Number(form.klus_id))

  async function genereerMail() {
    setGenereren(true)
    setGegenereerd('')
    setSendMsg('')

    const res = await fetch('/api/mail/genereren', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        klant_naam: selectedKlant?.naam,
        klus_info: selectedKlus?.type_werk,
        onderwerp: form.onderwerp,
        context: form.context,
        toon: form.toon,
      }),
    })
    const data = await res.json()
    if (res.ok) setGegenereerd(data.mail)
    else setGegenereerd('❌ ' + (data.error ?? 'Genereren mislukt'))
    setGenereren(false)
  }

  async function stuurMail() {
    if (!selectedKlant?.email || !gegenereerd) return
    setVersturen(true)
    setSendMsg('')
    const res = await fetch('/api/mail/versturen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ naar: selectedKlant.email, onderwerp: form.onderwerp, inhoud: gegenereerd }),
    })
    setSendMsg(res.ok ? '✅ Mail verstuurd naar ' + selectedKlant.email : '❌ Versturen mislukt')
    setVersturen(false)
  }

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Mail AI-opsteller</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Invoer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Instellen</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Klant</label>
                <select className="form-ctrl" value={form.klant_id} onChange={e => setForm(f => ({ ...f, klant_id: e.target.value, klus_id: '' }))}>
                  <option value="">— Kies klant (optioneel) —</option>
                  {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
                </select>
              </div>
              {form.klant_id && (
                <div>
                  <label className="form-label">Klus</label>
                  <select className="form-ctrl" value={form.klus_id} onChange={e => setForm(f => ({ ...f, klus_id: e.target.value }))}>
                    <option value="">— Geen klus —</option>
                    {klussen.filter(k => k.klant_id === Number(form.klant_id)).map(k => (
                      <option key={k.id} value={k.id}>{k.type_werk || `Klus #${k.id}`}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="form-label">Onderwerp</label>
                <input className="form-ctrl" value={form.onderwerp} onChange={e => setForm(f => ({ ...f, onderwerp: e.target.value }))} placeholder="Bijv. Follow-up offerte groepenkast" />
              </div>
              <div>
                <label className="form-label">Toon</label>
                <select className="form-ctrl" value={form.toon} onChange={e => setForm(f => ({ ...f, toon: e.target.value }))}>
                  <option value="professioneel">Professioneel</option>
                  <option value="vriendelijk">Vriendelijk & informeel</option>
                  <option value="formeel">Formeel</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="form-label">Extra context (optioneel)</label>
                <textarea className="form-ctrl" rows={3} value={form.context}
                  onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                  placeholder="Bijv. Offerte is 2 weken geleden verstuurd, klant heeft niet gereageerd..." />
              </div>
            </div>
          </div>

          {/* Sjablonen */}
          <div className="card">
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Snelle sjablonen</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SJABLONEN.map(s => (
                <button key={s.label} className="btn btn-ghost btn-sm" style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                  onClick={() => setForm(f => ({ ...f, context: s.prompt, onderwerp: s.label }))}>
                  <Icon name="sparkles" size={16} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={genereerMail} disabled={genereren || !aiActief} style={{ width: '100%' }}>
            <Icon name="sparkles" size={18} />
            {genereren ? 'Genereren...' : aiActief ? 'Mail genereren met AI' : 'AI niet ingesteld (OPENAI_API_KEY)'}
          </button>
        </div>

        {/* Output */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#5b7fa6', textTransform: 'uppercase', letterSpacing: 1 }}>Gegenereerde mail</div>
            {gegenereerd && !gegenereerd.startsWith('❌') && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(gegenereerd)}>
                  <Icon name="copy" size={16} />
                  Kopiëren
                </button>
                {selectedKlant?.email && (
                  <button className="btn btn-primary btn-sm" onClick={stuurMail} disabled={versturen}>
                    <Icon name="send" size={16} />
                    {versturen ? 'Versturen...' : 'Versturen'}
                  </button>
                )}
              </div>
            )}
          </div>

          {sendMsg && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: sendMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', fontSize: '.85rem', color: sendMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
              {sendMsg}
            </div>
          )}

          {!gegenereerd ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#8ba8c4' }}>
              <Icon name="mail" size={48} style={{ display: 'block', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: '.9rem' }}>Vul links in en klik op Mail genereren.</p>
            </div>
          ) : (
            <textarea
              className="form-ctrl"
              rows={20}
              value={gegenereerd}
              onChange={e => setGegenereerd(e.target.value)}
              style={{ fontFamily: 'inherit', fontSize: '.85rem', lineHeight: 1.6 }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
