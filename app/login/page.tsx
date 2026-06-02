export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Inloggen' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await getSession()
  if (session?.loggedIn) redirect('/')

  const { error } = await searchParams

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0d1b3e 0%, #1b2a4a 50%, #0d1b3e 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '40px 36px',
        width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,.35)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, background: '#0d1b3e', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <span style={{ color: '#fff', fontSize: 26, fontFamily: 'Material Symbols Outlined' }}>bolt</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0d1b3e' }}>
            Ozvolt Elektrotechniek
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: '#8ba8c4' }}>CRM Beheerportaal</p>
        </div>

        {error && (
          <div className="alert alert-err">
            {error === 'locked'
              ? 'Te veel pogingen. Probeer het over 5 minuten opnieuw.'
              : 'Onjuiste inloggegevens.'}
          </div>
        )}

        <form action="/api/auth/login" method="POST">
          <div className="form-group">
            <label className="form-label">Gebruikersnaam</label>
            <input
              className="form-ctrl"
              type="text"
              name="username"
              autoComplete="username"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Wachtwoord</label>
            <input
              className="form-ctrl"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '12px' }}
          >
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18 }}>login</span>
            Inloggen
          </button>
        </form>
      </div>
    </div>
  )
}
