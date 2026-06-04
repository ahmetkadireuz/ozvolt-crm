'use client'

import { useState, useRef } from 'react'

interface Props {
  token: string
  isGeaccepteerd: boolean
  acceptedName: string | null
  acceptedAt: string | null
  klantEmail: string
}

export default function AfspraakSignForm({ token, isGeaccepteerd, acceptedName, acceptedAt, klantEmail }: Props) {
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState(klantEmail)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(isGeaccepteerd)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1d2f4c'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    setIsDrawing(true)
    const pos = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y); ctx.stroke(); setHasSigned(true)
  }

  function stopDraw() { setIsDrawing(false) }

  function clearSign() {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  function getPos(e: any, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height
    if (e.touches) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
  }

  async function submit() {
    if (!naam.trim()) { setError('Vul uw naam in'); return }
    if (!hasSigned) { setError('Plaats uw handtekening in het vak'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/afspraken/accepteren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, naam: naam.trim(), email: email.trim() || undefined }),
      })
      const data = await res.json()
      if (data.ok) setDone(true)
      else setError(data.error ?? 'Er ging iets mis')
    } catch { setError('Verbinding mislukt, probeer opnieuw') }
    finally { setLoading(false) }
  }

  if (done) {
    return (
      <div style={{ background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: 12, padding: '28px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d', marginBottom: 8 }}>Werkafspraken bevestigd!</div>
        <div style={{ fontSize: 14, color: '#4a5568', marginBottom: 4 }}>{acceptedName ? `Ondertekend door ${acceptedName}` : `Ondertekend door ${naam}`}</div>
        {acceptedAt && <div style={{ fontSize: 12, color: '#94a3b8' }}>{acceptedAt}</div>}
        <div style={{ marginTop: 16, fontSize: 13, color: '#4a5568' }}>Ozvolt neemt contact met u op om de werkzaamheden in te plannen.<br /><strong>financien@ozvoltelektro.nl</strong></div>
      </div>
    )
  }

  return (
    <div style={{ border: '2px solid #1d2f4c', borderRadius: 12, padding: '24px 28px' }}>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.75, marginBottom: 20 }}>
        Door te ondertekenen bevestigt u kennis te hebben genomen van en akkoord te gaan met bovenstaande werkafspraken.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>Uw naam *</label>
          <input value={naam} onChange={e => setNaam(e.target.value)} placeholder="Voor- en achternaam"
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d0dce8', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>E-mailadres</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="uw@email.nl"
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d0dce8', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '.08em' }}>Handtekening *</label>
          <button onClick={clearSign} type="button" style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Wissen</button>
        </div>
        <canvas ref={canvasRef} width={620} height={130}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
          style={{ width: '100%', height: 130, border: '1.5px solid #d0dce8', borderRadius: 8, cursor: 'crosshair', background: hasSigned ? '#fff' : '#f8fafc', touchAction: 'none' }} />
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Teken hierboven met muis of vinger</div>
      </div>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <button onClick={submit} disabled={loading} type="button"
        style={{ width: '100%', background: '#1d2f4c', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, fontFamily: 'inherit' }}>
        {loading ? 'Bezig met verwerken...' : '✓ Werkafspraken bevestigen'}
      </button>
    </div>
  )
}
