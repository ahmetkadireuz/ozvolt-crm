'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Bestaande handtekening (data-URL) om vooraf te tonen */
  initial?: string | null
  /** Wordt aangeroepen met de data-URL (of '' bij wissen) na elke pennenstreek */
  onChange: (dataUrl: string) => void
  height?: number
}

export default function SignatureCanvas({ initial, onChange, height = 120 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(!!initial)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    if (initial && initial.startsWith('data:image/')) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      img.src = initial
    }

    function pos(e: MouseEvent | TouchEvent) {
      const r = canvas!.getBoundingClientRect()
      const t = 'touches' in e ? e.touches[0] : e
      return {
        x: (t.clientX - r.left) * (canvas!.width / r.width),
        y: (t.clientY - r.top) * (canvas!.height / r.height),
      }
    }
    function start(e: MouseEvent | TouchEvent) {
      e.preventDefault()
      drawing.current = true
      const p = pos(e)
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
    }
    function move(e: MouseEvent | TouchEvent) {
      if (!drawing.current) return
      e.preventDefault()
      const p = pos(e)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#14213d'
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    function stop() {
      if (!drawing.current) return
      drawing.current = false
      setHasInk(true)
      onChange(canvas!.toDataURL('image/png'))
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    canvas.addEventListener('mouseup', stop)
    canvas.addEventListener('mouseleave', stop)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', stop)
    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      canvas.removeEventListener('mouseup', stop)
      canvas.removeEventListener('mouseleave', stop)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', stop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function wis() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange('')
  }

  return (
    <div style={{ position: 'relative', border: '2px dashed #cbd5e1', borderRadius: 10, background: '#fafbfc', touchAction: 'none' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height, cursor: 'crosshair' }} />
      {!hasInk && (
        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#94a3b8', fontSize: 13, pointerEvents: 'none' }}>
          Teken hier
        </span>
      )}
      <button
        type="button"
        onClick={wis}
        style={{ position: 'absolute', top: 6, right: 8, fontSize: 11, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', color: '#64748b' }}
      >
        Wis
      </button>
    </div>
  )
}
