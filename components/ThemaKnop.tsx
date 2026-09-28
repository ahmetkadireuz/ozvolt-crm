'use client'

import { useEffect, useState } from 'react'
import Icon from './Icon'

type Thema = 'auto' | 'light' | 'dark'
const VOLGENDE: Record<Thema, Thema> = { auto: 'dark', dark: 'light', light: 'auto' }
const LABEL: Record<Thema, string> = { auto: 'Thema: automatisch', dark: 'Thema: donker', light: 'Thema: licht' }
const ICOON = { auto: 'monitor', dark: 'moon', light: 'sun' } as const

// Wisselt tussen automatisch (systeem), donker en licht; onthouden per apparaat
export default function ThemaKnop() {
  const [thema, setThema] = useState<Thema>('auto')

  useEffect(() => {
    try {
      const t = localStorage.getItem('ozvolt-thema')
      if (t === 'dark' || t === 'light') setThema(t)
    } catch {}
  }, [])

  function wissel() {
    const nieuw = VOLGENDE[thema]
    setThema(nieuw)
    const html = document.documentElement
    if (nieuw === 'auto') html.removeAttribute('data-theme')
    else html.setAttribute('data-theme', nieuw)
    try {
      if (nieuw === 'auto') localStorage.removeItem('ozvolt-thema')
      else localStorage.setItem('ozvolt-thema', nieuw)
    } catch {}
  }

  return (
    <button type="button" className="logout-link thema-knop" onClick={wissel}
      style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }} title="Wissel licht/donker">
      <span className="nav-ico"><Icon name={ICOON[thema]} size={18} /></span>
      {LABEL[thema]}
    </button>
  )
}
