import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import '../globals.css'
import './klant.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: { default: 'Mijn Ozvolt Portaal', template: '%s — Ozvolt' },
  themeColor: '#0d1b3e',
}

export default function KlantLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable}>
      <body className="kp-body">
        <header className="kp-header">
          <Link href="/klant/dashboard" className="kp-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wit.png" alt="Ozvolt Elektrotechniek" />
            <span className="kp-brand-tag">Klantportaal</span>
          </Link>
          <a href="mailto:info@ozvoltelektro.nl" className="kp-header-link">
            info@ozvoltelektro.nl
          </a>
        </header>
        <main className="kp-main">{children}</main>
        <footer className="kp-footer">
          <span>© {new Date().getFullYear()} Ozvolt Elektrotechniek</span>
          <a href="https://ozvoltelektro.nl" target="_blank" rel="noreferrer">ozvoltelektro.nl</a>
        </footer>
      </body>
    </html>
  )
}
