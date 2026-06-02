import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Binnenkort' }

export default function Page() {
  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 20 }}>Binnenkort beschikbaar</h1>
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 48, color: '#8ba8c4', display: 'block', marginBottom: 16 }}>construction</span>
        <p style={{ color: '#8ba8c4', margin: 0, fontSize: '.9rem' }}>
          Deze module is in ontwikkeling en wordt binnenkort toegevoegd.
        </p>
      </div>
    </div>
  )
}
