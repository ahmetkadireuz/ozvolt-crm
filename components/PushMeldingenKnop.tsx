'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/Icon'

type Stand = 'laden' | 'niet-ondersteund' | 'beginscherm' | 'uit' | 'aan' | 'geblokkeerd' | 'bezig'

function base64NaarBytes(b64: string) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

function isBeginschermApp() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

// Zet pushmeldingen op dit apparaat aan of uit (iPhone: alleen vanuit het CRM-icoon op het beginscherm).
export default function PushMeldingenKnop() {
  const [stand, setStand] = useState<Stand>('laden')
  const [fout, setFout] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setStand(isIos() && !isBeginschermApp() ? 'beginscherm' : 'niet-ondersteund'); return
      }
      if (Notification.permission === 'denied') { setStand('geblokkeerd'); return }
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.getSubscription()
      setStand(sub ? 'aan' : 'uit')
    })().catch(() => setStand('niet-ondersteund'))
  }, [])

  async function aanzetten() {
    setFout(null); setStand('bezig')
    try {
      const toestemming = await Notification.requestPermission()
      if (toestemming !== 'granted') { setStand(toestemming === 'denied' ? 'geblokkeerd' : 'uit'); return }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const { publicKey } = await fetch('/api/push/abonneren').then(r => r.json())
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64NaarBytes(publicKey) })
      const res = await fetch('/api/push/abonneren', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), test: true }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Opslaan mislukt')
      setStand('aan')
    } catch (err: any) {
      setFout(err?.message ?? 'Aanzetten mislukt'); setStand('uit')
    }
  }

  async function uitzetten() {
    setStand('bezig')
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/abonneren', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
        await sub.unsubscribe()
      }
    } finally { setStand('uit') }
  }

  const tekst: Record<Stand, string> = {
    laden: '',
    'niet-ondersteund': 'Pushmeldingen werken niet in deze browser.',
    beginscherm: 'Open het CRM via het Ozvolt-icoon op je beginscherm om meldingen aan te zetten (Safari → Deel → Zet op beginscherm).',
    uit: 'Krijg een melding op dit apparaat als een klant een offerte opent.',
    aan: 'Meldingen staan aan op dit apparaat.',
    geblokkeerd: 'Meldingen zijn geblokkeerd. Zet ze aan bij Instellingen → Meldingen → Ozvolt.',
    bezig: 'Even geduld…',
  }
  if (stand === 'laden') return null

  return (
    <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <Icon name="bell" size={18} />
      <div style={{ flex: 1, minWidth: 200, fontSize: '.85rem' }}>
        <div style={{ fontWeight: 600 }}>Pushmeldingen op je telefoon</div>
        <div style={{ color: 'var(--text-soft)' }}>{tekst[stand]}</div>
        {fout && <div style={{ color: '#dc2626', marginTop: 4 }}>{fout}</div>}
      </div>
      {(stand === 'uit' || stand === 'bezig') && (
        <button type="button" className="btn btn-primary btn-sm" onClick={aanzetten} disabled={stand === 'bezig'}>Meldingen aanzetten</button>
      )}
      {stand === 'aan' && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={uitzetten}>Uitzetten</button>
      )}
    </div>
  )
}
