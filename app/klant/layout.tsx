import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: { default: 'Mijn Ozvolt Portaal', template: '%s — Ozvolt' },
}

export default function KlantLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: '#f0f4f8', minHeight: '100vh' }}>
        <header style={{
          background: '#0d1b3e',
          padding: '0 24px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Ozvolt-logo-wit.png" alt="Ozvolt" height={28} style={{ objectFit: 'contain' }} />
            <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>Klantportaal</span>
          </div>
          <a href="mailto:info@ozvoltelektro.nl" style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, textDecoration: 'none' }}>
            info@ozvoltelektro.nl
          </a>
        </header>
        <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 64px' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
