'use client'

import type { CSSProperties } from 'react'

function groei(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

/** Meegroeiende textarea voor een toelichting (min. 2 regels). Enter geeft een nieuwe regel. */
export default function ToelichtingVeld({ value, onChange, placeholder, style }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  style?: CSSProperties
}) {
  return (
    <textarea
      className="form-ctrl"
      placeholder={placeholder ?? 'Toelichting (optioneel) — begin een regel met "-" voor een opsomming'}
      value={value}
      onChange={e => onChange(e.target.value)}
      onInput={e => groei(e.currentTarget)}
      ref={groei}
      rows={2}
      style={{ resize: 'none', overflow: 'hidden', lineHeight: 1.5, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', ...style }}
    />
  )
}
