'use client'

import { useState, useRef } from 'react'
import type { OfferteBetaling, OfferteTermijn } from '@/lib/offerte-betalen'

const fmtEuro = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)

function TermijnKnop({ t, titel, kleur }: { t: OfferteTermijn; titel: string; kleur: string }) {
  if (t.status === 'betaald') {
    return (
      <div style={{ flex: 1, minWidth: 160, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 10, padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>
        {titel}<br /><strong>✓ Betaald</strong>
      </div>
    )
  }
  if (t.status === 'link' && t.url) {
    return (
      <a href={t.url} style={{ flex: 1, minWidth: 160, display: 'block', background: kleur, color: '#fff', borderRadius: 10, padding: '12px 16px', textDecoration: 'none', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>
        {titel} betalen<br /><strong>{fmtEuro(t.bedrag)}</strong>
      </a>
    )
  }
  return (
    <div style={{ flex: 1, minWidth: 160, fontSize: 12, color: '#64748b', alignSelf: 'center', lineHeight: 1.5 }}>
      {titel}: {t.status === 'na_oplevering' ? 'u ontvangt de eindfactuur na oplevering.' : 'u ontvangt de factuur binnenkort.'}
    </div>
  )
}

export function BetaalLinks({ betaling }: { betaling: OfferteBetaling | null }) {
  if (!betaling || betaling.termijnen.length === 0) return null
  if (betaling.is50_50) {
    return (
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Betaling in twee termijnen:</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <TermijnKnop t={betaling.termijnen[0]} titel="Eerste termijn" kleur="#1d2f4c" />
          {betaling.termijnen[1] && <TermijnKnop t={betaling.termijnen[1]} titel="Tweede termijn" kleur="#4c7191" />}
        </div>
      </div>
    )
  }
  const t = betaling.termijnen[0]
  if (t.status === 'betaald') {
    return <div style={{ marginTop: 20, fontSize: 15, fontWeight: 700, color: '#15803d' }}>✓ Betaald</div>
  }
  if (t.status !== 'link' || !t.url) {
    return <div style={{ marginTop: 20, fontSize: 13, color: '#64748b' }}>U ontvangt de factuur binnenkort.</div>
  }
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>U kunt nu direct betalen:</div>
      <a href={t.url} style={{ display: 'inline-block', background: '#16a34a', color: '#fff', borderRadius: 10, padding: '13px 28px', textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
        Nu betalen → {fmtEuro(t.bedrag)}
      </a>
    </div>
  )
}

interface Props {
  token: string
  isGeaccepteerd: boolean
  acceptedName: string | null
  acceptedAt: string | null
  klantEmail: string
  totaal: string
  btwPct: number
  /** Server-side bepaald (Tikkie van de factuur); alleen meegeven aan wie de offerte mag zien */
  betaling?: OfferteBetaling | null
}

export default function SignForm({ token, isGeaccepteerd, acceptedName, acceptedAt, klantEmail, totaal, btwPct, betaling }: Props) {
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState(klantEmail)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(isGeaccepteerd)
  const [dynamischeBetaling, setDynamischeBetaling] = useState<OfferteBetaling | null>(null)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1d2f4c'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setIsDrawing(true)
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasSigned(true)
  }

  function stopDraw() { setIsDrawing(false) }

  function clearSign() {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  function getPos(e: any, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  async function submit() {
    if (!naam.trim()) { setError('Vul uw naam in'); return }
    if (!hasSigned) { setError('Plaats uw handtekening in het vak'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/offertes/accepteren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, naam: naam.trim(), email: email.trim() || undefined }),
      })
      const data = await res.json()
      if (data.ok) {
        if (data.betaling) setDynamischeBetaling(data.betaling)
        setDone(true)
      }
      else setError(data.error ?? 'Er ging iets mis')
    } catch {
      setError('Verbinding mislukt, probeer opnieuw')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '28px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d', marginBottom: 8 }}>Offerte geaccepteerd!</div>
        <div style={{ fontSize: 14, color: '#4a5568', marginBottom: 4 }}>
          {acceptedName ? `Ondertekend door ${acceptedName}` : `Ondertekend door ${naam}`}
        </div>
        {acceptedAt && <div style={{ fontSize: 12, color: '#94a3b8' }}>{acceptedAt}</div>}
        <div style={{ marginTop: 16, padding: '14px 18px', background: '#fff', borderRadius: 10, display: 'inline-block', textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Ozvolt neemt spoedig contact met u op om de werkzaamheden in te plannen.</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d2f4c' }}>financien@ozvoltelektro.nl</div>
        </div>
        <BetaalLinks betaling={dynamischeBetaling ?? betaling ?? null} />
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid #e3e9f1', background: '#f9fafc', borderRadius: 14, padding: '22px 20px' }}>
      <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>
        Door te ondertekenen gaat u akkoord met de uitvoering van bovenstaande werkzaamheden door
        Ozvolt Elektrotechniek tegen de vermelde bedragen (incl. {btwPct}% BTW).<br />
        Op al onze werkzaamheden zijn onze algemene voorwaarden van toepassing.
      </p>

      <div className="od-sign-grid">
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>Uw naam *</label>
          <input
            value={naam}
            onChange={e => setNaam(e.target.value)}
            placeholder="Voor- en achternaam"
            autoComplete="name"
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #d0dce8', borderRadius: 10, fontSize: 16, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>E-mailadres</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="uw@email.nl"
            type="email"
            inputMode="email"
            autoComplete="email"
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #d0dce8', borderRadius: 10, fontSize: 16, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em' }}>Handtekening *</label>
          <button onClick={clearSign} type="button" style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>Wissen</button>
        </div>
        <canvas
          aria-label="Handtekeningvak"
          ref={canvasRef}
          width={620}
          height={130}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          style={{ width: '100%', height: 130, border: '1.5px solid #d0dce8', borderRadius: 10, cursor: 'crosshair', background: '#fff', touchAction: 'none' }}
        />
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Teken hierboven met uw vinger of muis</div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <button
        onClick={submit}
        disabled={loading}
        type="button"
        style={{ width: '100%', background: '#1a7a3c', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 24px', fontSize: 16, fontWeight: 700, boxShadow: '0 4px 14px rgba(26,122,60,.28)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, fontFamily: 'inherit' }}
      >
        {loading ? 'Bezig met verwerken...' : `✓ Akkoord gaan — ${totaal}`}
      </button>
    </div>
  )
}
