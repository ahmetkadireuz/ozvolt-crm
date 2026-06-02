'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navMain = [
  { key: '/',           icon: 'dashboard',        label: 'Overzicht' },
  { key: '/klussen',    icon: 'construction',      label: 'Klussen' },
  { key: '/agenda',     icon: 'calendar_month',    label: 'Agenda' },
  { key: '/klanten',    icon: 'groups',            label: 'Klanten' },
  { key: '/offertes',   icon: 'description',       label: 'Offertes' },
  { key: '/facturen',   icon: 'receipt_long',      label: 'Facturen' },
  { key: '/whatsapp',   icon: 'chat',              label: 'WhatsApp' },
  { key: '/mail',       icon: 'inbox',             label: 'Postvak' },
  { key: '/notificaties', icon: 'notifications',   label: 'Notificaties' },
]

const navOps = [
  { key: '/kosten',  icon: 'payments',      label: 'Kosten' },
  { key: '/inkoop',  icon: 'shopping_cart', label: 'Inkoop' },
]

export default function Sidebar({ nieuwCount = 0, notifCount = 0 }: { nieuwCount?: number; notifCount?: number }) {
  const pathname = usePathname()

  function isActive(key: string) {
    if (key === '/') return pathname === '/'
    return pathname.startsWith(key)
  }

  return (
    <>
      <aside className="sidebar" id="sidebar">
        <div className="sb-brand">
          <img src="/logo.png" alt="Ozvolt" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <strong>Ozvolt Elektrotechniek</strong>
            <span>CRM Portaal</span>
          </div>
        </div>

        <nav className="sb-nav">
          {navMain.map(item => (
            <Link key={item.key} href={item.key} className={`nav-item ${isActive(item.key) ? 'active' : ''}`}>
              <span className="nav-ico">{item.icon}</span>
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
              <span className="nav-ico">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sb-foot">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="logout-link" style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }}>
              <span className="nav-ico">logout</span>
              Uitloggen
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile tab bar */}
      <nav className="mobile-tab-bar">
        {[
          { href: '/',           icon: 'dashboard',     label: 'Overzicht' },
          { href: '/klussen',    icon: 'construction',  label: 'Klussen' },
          { href: '/agenda',     icon: 'calendar_month',label: 'Agenda' },
          { href: '/whatsapp',   icon: 'chat',          label: 'WhatsApp' },
          { href: '/notificaties', icon: 'notifications', label: 'Meldingen' },
        ].map(t => (
          <Link key={t.href} href={t.href} className={`mobile-tab ${isActive(t.href) ? 'active' : ''}`}>
            <span className="nav-ico" style={{ fontSize: 22 }}>{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="mobile-tab"
          onClick={() => document.getElementById('sidebar')?.classList.toggle('open')}
        >
          <span className="nav-ico" style={{ fontSize: 22 }}>menu</span>
          <span>Meer</span>
        </button>
      </nav>
    </>
  )
}
