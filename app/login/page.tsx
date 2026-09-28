export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Icon, { type IconName } from '@/components/Icon'

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
      background: 'var(--surface-mute)',
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
          <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'center' }}>
            <Image
              src="/logo-transparant.png"
              alt="Ozvolt Elektrotechniek"
              width={220}
              height={62}
              priority
              className="sb-logo"
              style={{ objectFit: 'contain', height: 'auto', width: 220 }}
            />
          </div>
          <p style={{ color: 'rgba(226,234,245,.6)', margin: '0 0 44px', fontSize: '.82rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600 }}>CRM Beheerportaal</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {([
              { icon: 'construction', text: 'Klussen & klanten beheren' },
              { icon: 'file-text',    text: 'Offertes & facturen versturen' },
              { icon: 'calendar',     text: 'Agenda & afspraken plannen' },
              { icon: 'sparkles',     text: 'AI-gestuurde mails opstellen' },
            ] as { icon: IconName; text: string }[]).map(item => (
              <div key={item.icon} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={item.icon} size={18} style={{ color: '#fff' }} />
                </div>
                <span style={{ color: 'rgba(226,234,245,.72)', fontSize: '.88rem' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: 'absolute', bottom: 24, color: 'rgba(226,234,245,.45)', fontSize: '.75rem' }}>
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
            <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)' }}>
              Welkom terug
            </h2>
            <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '.88rem' }}>
              Log in om het CRM-portaal te openen
            </p>
          </div>

          {error && (
            <div style={{
              background: 'var(--soft-red)', border: '1px solid var(--tint-red-bg)', borderRadius: 10,
              padding: '12px 16px', marginBottom: 20, fontSize: '.85rem', color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon name="alert-circle" size={18} />
              {error === 'locked'
                ? 'Te veel pogingen. Probeer het over 5 minuten opnieuw.'
                : 'Onjuiste gebruikersnaam of wachtwoord.'}
            </div>
          )}

          <form action="/api/auth/login" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Gebruikersnaam</label>
              <div style={{ position: 'relative' }}>
                <Icon name="user" size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-soft)', pointerEvents: 'none' }} />
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
                <Icon name="lock" size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-soft)', pointerEvents: 'none' }} />
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
              <Icon name="login" size={18} />
              Inloggen
            </button>
          </form>

          <p style={{ marginTop: 32, textAlign: 'center', fontSize: '.78rem', color: 'var(--text-soft)' }}>
            Problemen met inloggen? Neem contact op via{' '}
            <a href="mailto:info@ozvoltelektro.nl" style={{ color: 'var(--text)', fontWeight: 600 }}>
              info@ozvoltelektro.nl
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
