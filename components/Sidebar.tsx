'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import Icon, { IconName } from './Icon'

type NavItem = { key: string; icon: IconName; label: string }

const navWerk: NavItem[] = [
  { key: '/',         icon: 'dashboard',  label: 'Overzicht' },
  { key: '/klussen',  icon: 'briefcase',  label: 'Projecten' },
  { key: '/agenda',   icon: 'calendar',   label: 'Agenda' },
  { key: '/klanten',  icon: 'users',      label: 'Klanten' },
]

const navVerkoop: NavItem[] = [
  { key: '/offertes', icon: 'file-text',  label: 'Offertes' },
  { key: '/facturen', icon: 'receipt',    label: 'Facturen' },
]

const navAdmin: NavItem[] = [
  { key: '/kosten',                     icon: 'payments', label: 'Kosten' },
  { key: '/inkoop',                     icon: 'cart',     label: 'Inkoop' },
  { key: '/groepenverklaring',          icon: 'bolt',     label: 'Groepenverklaring' },
  { key: '/instellingen/boekhouding',   icon: 'book',     label: 'Boekhouding' },
]

const navComms: NavItem[] = [
  { key: '/whatsapp',     icon: 'chat',      label: 'WhatsApp' },
  { key: '/mail',         icon: 'sparkles',  label: 'Mail AI' },
  { key: '/notificaties', icon: 'bell',      label: 'Meldingen' },
]

export default function Sidebar({ nieuwCount = 0, notifCount = 0 }: { nieuwCount?: number; notifCount?: number }) {
  const pathname = usePathname()

  if (pathname.startsWith('/login') || pathname.startsWith('/api')) return null

  function isActive(key: string) {
    if (key === '/') return pathname === '/'
    return pathname.startsWith(key)
  }

  function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open')
    document.getElementById('sidebar-backdrop')?.classList.remove('open')
  }

  function renderItem(item: NavItem) {
    return (
      <Link key={item.key} href={item.key} className={`nav-item ${isActive(item.key) ? 'active' : ''}`} onClick={closeSidebar}>
        <span className="nav-ico"><Icon name={item.icon} size={18} /></span>
        <span>{item.label}</span>
        {item.key === '/klussen' && nieuwCount > 0 && (
          <span className="n-badge">{nieuwCount}</span>
        )}
        {item.key === '/notificaties' && notifCount > 0 && (
          <span className="n-badge">{notifCount}</span>
        )}
      </Link>
    )
  }

  const mobileTabs: { href: string; icon: IconName; label: string }[] = [
    { href: '/',         icon: 'dashboard', label: 'Overzicht' },
    { href: '/klussen',  icon: 'briefcase', label: 'Projecten' },
    { href: '/offertes', icon: 'file-text', label: 'Offertes' },
    { href: '/facturen', icon: 'receipt',   label: 'Facturen' },
  ]

  return (
    <>
      <aside className="sidebar" id="sidebar">
        <div className="sb-brand">
          <Image
            src="/logo-transparant.png"
            alt="Ozvolt Elektrotechniek"
            width={170}
            height={48}
            priority
            style={{ objectFit: 'contain', height: 'auto', width: 'auto', maxHeight: 44, maxWidth: '100%' }}
          />
        </div>

        <nav className="sb-nav">
          {navWerk.map(renderItem)}

          <div className="sb-divider">Verkoop</div>
          {navVerkoop.map(renderItem)}

          <div className="sb-divider">Administratie</div>
          {navAdmin.map(renderItem)}

          <div className="sb-divider">Communicatie</div>
          {navComms.map(renderItem)}
        </nav>

        <div className="sb-foot">
          <button
            type="button"
            className="logout-link"
            style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }}
            onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => { window.location.href = '/login' })}
          >
            <span className="nav-ico"><Icon name="logout" size={18} /></span>
            Uitloggen
          </button>
        </div>
      </aside>

      <div
        className="sidebar-backdrop"
        id="sidebar-backdrop"
        onClick={() => {
          document.getElementById('sidebar')?.classList.remove('open')
          document.getElementById('sidebar-backdrop')?.classList.remove('open')
        }}
      />

      <nav className="mobile-tab-bar">
        {mobileTabs.map(t => (
          <Link key={t.href} href={t.href} className={`mobile-tab ${isActive(t.href) ? 'active' : ''}`} onClick={closeSidebar}>
            <span className="nav-ico"><Icon name={t.icon} size={22} /></span>
            <span>{t.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="mobile-tab"
          onClick={() => {
            document.getElementById('sidebar')?.classList.toggle('open')
            document.getElementById('sidebar-backdrop')?.classList.toggle('open')
          }}
        >
          <span className="nav-ico"><Icon name="menu" size={22} /></span>
          <span>Meer</span>
        </button>
      </nav>
    </>
  )
}
