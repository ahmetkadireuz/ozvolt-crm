'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navMain = [
  { key: '/',           icon: 'dashboard',        label: 'Overzicht' },
  { key: '/klussen',    icon: 'construction',      label: 'Projecten' },
  { key: '/agenda',     icon: 'calendar_month',    label: 'Agenda' },
  { key: '/klanten',    icon: 'groups',            label: 'Klanten' },
  { key: '/offertes',   icon: 'description',       label: 'Offertes' },
  { key: '/facturen',   icon: 'receipt_long',      label: 'Facturen' },
  { key: '/whatsapp',     icon: 'chat',          label: 'WhatsApp' },
  { key: '/notificaties', icon: 'notifications', label: 'Notificaties' },
]

const navOps = [
  { key: '/kosten',             icon: 'payments',         label: 'Kosten' },
  { key: '/inkoop',             icon: 'shopping_cart',    label: 'Inkoop' },
  { key: '/groepenverklaring',  icon: 'electrical_services', label: 'Groepenverklaring' },
]

const navAI = [
  { key: '/mail', icon: 'auto_awesome', label: 'Mail AI' },
]

export default function Sidebar({ nieuwCount = 0, notifCount = 0 }: { nieuwCount?: number; notifCount?: number }) {
  const pathname = usePathname()

  // Verberg sidebar op login en API pagina's
  if (pathname.startsWith('/login') || pathname.startsWith('/api')) return null

  function isActive(key: string) {
    if (key === '/') return pathname === '/'
    return pathname.startsWith(key)
  }

  return (
    <>
      <aside className="sidebar" id="sidebar">
        <div className="sb-brand">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }}>
            <Image src="/logo.png" alt="Ozvolt" width={30} height={30} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          </div>
          <div>
            <strong>Ozvolt</strong>
            <span>Elektrotechniek · CRM</span>
          </div>
        </div>

        <nav className="sb-nav">
          {navMain.map(item => (
            <Link key={item.key} href={item.key} className={`nav-item ${isActive(item.key) ? 'active' : ''}`}>
              <span className="material-symbols-outlined nav-ico">{item.icon}</span>
              <span>{item.label}</span>
              {item.key === '/klussen' && nieuwCount > 0 && (
                <span className="n-badge">{nieuwCount}</span>
              )}
              {item.key === '/notificaties' && notifCount > 0 && (
                <span className="n-badge">{notifCount}</span>
              )}
            </Link>
          ))}

          <div className="sb-divider">Bedrijf</div>

          {navOps.map(item => (
            <Link key={item.key} href={item.key} className={`nav-item ${isActive(item.key) ? 'active' : ''}`}>
              <span className="material-symbols-outlined nav-ico">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="sb-divider">AI Tools</div>

          {navAI.map(item => (
            <Link key={item.key} href={item.key} className={`nav-item ${isActive(item.key) ? 'active' : ''}`}>
              <span className="material-symbols-outlined nav-ico">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sb-foot">
          <button
            type="button"
            className="logout-link"
            style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }}
            onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => { window.location.href = '/login' })}
          >
            <span className="material-symbols-outlined nav-ico">logout</span>
            Uitloggen
          </button>
        </div>
      </aside>

      {/* Mobile: backdrop om sidebar te sluiten */}
      <div
        className="sidebar-backdrop"
        id="sidebar-backdrop"
        onClick={() => {
          document.getElementById('sidebar')?.classList.remove('open')
          document.getElementById('sidebar-backdrop')?.classList.remove('open')
        }}
      />

      {/* Mobile tab bar */}
      <nav className="mobile-tab-bar">
        {[
          { href: '/',             icon: 'dashboard',     label: 'Overzicht' },
          { href: '/klussen',      icon: 'construction',  label: 'Projecten' },
          { href: '/klanten',      icon: 'groups',        label: 'Klanten' },
          { href: '/agenda',       icon: 'calendar_month',label: 'Agenda' },
          { href: '/notificaties', icon: 'notifications', label: 'Meldingen' },
        ].map(t => (
          <Link key={t.href} href={t.href} className={`mobile-tab ${isActive(t.href) ? 'active' : ''}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{t.icon}</span>
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
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>menu</span>
          <span>Meer</span>
        </button>
      </nav>
    </>
  )
}
