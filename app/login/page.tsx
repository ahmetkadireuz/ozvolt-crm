export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Inloggen — Ozvolt CRM' }

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
      minHeight: '100vh',
      display: 'flex',
      background: '#f0f4f8',
    }}>
      {/* Linker paneel — branding */}
      <div style={{
        width: '45%',
        background: 'linear-gradient(160deg, #0d1b3e 0%, #1a3260 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decoratieve cirkels */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />

        <div style={{ position: 'relative', textAlign: 'center' }}>
          <div style={{ marginBottom: 32 }}>
            <Image
              src="/logo.png"
              alt="Ozvolt Elektrotechniek"
              width={80}
              height={80}
              style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-.5px' }}>
            Ozvolt Elektrotechniek
          </h1>
          <p style={{ color: '#8ba8c4', margin: '0 0 48px', fontSize: '.95rem' }}>CRM Beheerportaal</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {[
              { icon: 'construction', text: 'Klussen & klanten beheren' },
              { icon: 'description', text: 'Offertes & facturen versturen' },
              { icon: 'calendar_month', text: 'Agenda & afspraken plannen' },
              { icon: 'auto_awesome', text: 'AI-gestuurde mails opstellen' },
            ].map(item => (
              <div key={item.icon} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#fff' }}>{item.icon}</span>
                </div>
                <span style={{ color: '#c8d8ea', fontSize: '.88rem' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: 'absolute', bottom: 24, color: '#4a6080', fontSize: '.75rem' }}>
          © {new Date().getFullYear()} Ozvolt Elektrotechniek · KVK 99837366
        </p>
      </div>

      {/* Rechter paneel — inlogformulier */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 900, color: '#0d1b3e' }}>
              Welkom terug
            </h2>
            <p style={{ margin: 0, color: '#8ba8c4', fontSize: '.88rem' }}>
              Log in om het CRM-portaal te openen
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
              padding: '12px 16px', marginBottom: 20, fontSize: '.85rem', color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              {error === 'locked'
                ? 'Te veel pogingen. Probeer het over 5 minuten opnieuw.'
                : 'Onjuiste gebruikersnaam of wachtwoord.'}
            </div>
          )}

          <form action="/api/auth/login" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Gebruikersnaam</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#8ba8c4', pointerEvents: 'none' }}>
                  person
                </span>
                <input
                  className="form-ctrl"
                  type="text"
                  name="username"
                  autoComplete="username"
                  required
                  autoFocus
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Wachtwoord</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#8ba8c4', pointerEvents: 'none' }}>
                  lock
                </span>
                <input
                  className="form-ctrl"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '.95rem', marginTop: 4, borderRadius: 12 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
              Inloggen
            </button>
          </form>

          <p style={{ marginTop: 32, textAlign: 'center', fontSize: '.78rem', color: '#8ba8c4' }}>
            Problemen met inloggen? Neem contact op via{' '}
            <a href="mailto:info@ozvoltelektro.nl" style={{ color: '#0d1b3e', fontWeight: 600 }}>
              info@ozvoltelektro.nl
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
