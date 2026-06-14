'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'

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
      <Icon name={gekopieerd ? 'check' : 'copy'} size={15} />
      {gekopieerd ? 'Gekopieerd' : 'Kopieer'}
    </button>
  )
}
