'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'

export default function KlusKebabMenu({ klusId, klantNaam }: { klusId: number; klantNaam: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function clickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', clickAway)
    return () => document.removeEventListener('mousedown', clickAway)
  }, [])

  async function verwijder() {
    if (!confirm(`Project van ${klantNaam} verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
    setOpen(false)
    await fetch(`/api/klussen/${klusId}`, { method: 'DELETE' })
    router.push('/klussen')
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="btn btn-ghost btn-sm"
        title="Meer acties"
        style={{ padding: '6px 10px' }}
      >
        <Icon name="more" size={18} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 30,
            minWidth: 200, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
            boxShadow: '0 12px 32px rgba(13,27,62,.12)', padding: 6,
          }}
        >
          <button
            type="button"
            onClick={verwijder}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 7,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#dc2626', fontWeight: 700, display: 'flex',
              alignItems: 'center', gap: 8, fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Icon name="trash" size={16} />
            Project verwijderen
          </button>
        </div>
      )}
    </div>
  )
}
