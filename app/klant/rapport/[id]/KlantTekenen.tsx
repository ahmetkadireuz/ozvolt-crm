'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from '@/components/SignatureCanvas'

export default function KlantTekenen({ rapportId }: { rapportId: number }) {
  const router = useRouter()
  const [sig, setSig] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onderteken() {
    if (!sig) {
      setError('Plaats eerst uw handtekening in het tekenvak.')
      return
    }
    setBusy(true)
    setError('')
    const res = await fetch('/api/klant/rapport/tekenen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rapport_id: rapportId, handtekening: sig }),
    })
    setBusy(false)
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Ondertekenen mislukt — probeer het opnieuw.')
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginTop: 16, border: '1px solid #e2e8f0' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0d1b3e' }}>Ondertekenen</h2>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b' }}>
        Plaats uw handtekening hieronder om de oplevering te bevestigen.
      </p>
      <SignatureCanvas onChange={setSig} height={160} />
      {error && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.22)', color: '#c0392b', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}
      <button
        onClick={onderteken}
        disabled={busy}
        style={{ marginTop: 14, width: '100%', minHeight: 46, border: 'none', borderRadius: 10, background: '#1d4fa3', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {busy ? 'Bezig…' : 'Ondertekenen'}
      </button>
    </div>
  )
}
