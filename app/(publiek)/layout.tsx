import type { Viewport } from 'next'

// Publieke layout (offerte- en werkafspraaklinks voor klanten): geen sidebar, geen auth check.
// <html>/<body> staan hier en niet in de pagina's: die zitten binnen het laadscherm (loading.tsx),
// en een <html> die pas later binnenkomt gaf in de browser een hydratiefout / witte pagina.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1b2d4a',
}

export default function PubliekLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
