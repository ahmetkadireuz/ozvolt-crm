import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: { default: 'Rapport', template: '%s — Ozvolt' },
}

export default function RapportenLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: '#d7dde5', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
