'use client'

import { useState } from 'react'

export default function CopyKnop({ tekst }: { tekst: string }) {
  const [gekopieerd, setGekopieerd] = useState(false)
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(tekst)
        setGekopieerd(true)
        setTimeout(() => setGekopieerd(false), 2000)
      }}
    >
      <span className="nav-ico" style={{ fontSize: 15 }}>{gekopieerd ? 'check' : 'content_copy'}</span>
      {gekopieerd ? 'Gekopieerd' : 'Kopieer'}
    </button>
  )
}
