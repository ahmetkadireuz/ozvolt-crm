export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Icon, { type IconName } from '@/components/Icon'
import Logo, { Bars } from '@/components/Logo'
import './login.css'

export const metadata: Metadata = { title: 'Inloggen — Ozvolt CRM' }

// Huisstijl 2026 (zie ozvolt-website/CLAUDE.md): navy #1C2A44, staalblauw #5B7A99,
// accent #3E8EDE, Outfit + JetBrains Mono. De inlogpagina is altijd licht, ook in donkere modus.

const PUNTEN: { icon: IconName; text: string }[] = [
  { icon: 'construction', text: 'Klussen & klanten beheren' },
  { icon: 'file-text',    text: 'Offertes & facturen versturen' },
  { icon: 'calendar',     text: 'Agenda & afspraken plannen' },
  { icon: 'sparkles',     text: 'AI-gestuurde mails opstellen' },
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await getSession()
  if (session?.loggedIn) redirect('/')

  const { error } = await searchParams

  return (
    <div className="lg">
      {/* Linker paneel — merk */}
      <aside className="lg-merk">
        <Bars variant="neg" thickness={34} gap={26} className="lg-deco" />

        <div className="lg-merk-top">
          <Logo size={46} variant="neg" />
          <p className="lg-label">CRM · Beheerportaal</p>
        </div>

        <div className="lg-merk-midden">
          <h1 className="lg-kop">
            Alles voor je klussen,<br />
            <span>op één plek.</span>
          </h1>
          <ul className="lg-punten">
            {PUNTEN.map(p => (
              <li key={p.icon}>
                <span className="lg-punt-ico"><Icon name={p.icon} size={18} /></span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="lg-voet">
          © {new Date().getFullYear()} Ozvolt Elektrotechniek · KVK 99837366 · BTW NL005413208B33
        </p>
      </aside>

      {/* Rechter paneel — inlogformulier */}
      <main className="lg-form-paneel">
        <div className="lg-form-wrap">
          <div className="lg-mobiel-logo"><Logo size={36} variant="pos" /></div>

          <p className="lg-label lg-label-licht">Inloggen</p>
          <h2 className="lg-welkom">
            Welkom <span>terug</span>
          </h2>
          <p className="lg-sub">Log in om het CRM-portaal te openen.</p>

          {error && (
            <div className="lg-fout" role="alert">
              <Icon name="alert-circle" size={18} />
              {error === 'locked'
                ? 'Te veel pogingen. Probeer het over 5 minuten opnieuw.'
                : 'Onjuiste gebruikersnaam of wachtwoord.'}
            </div>
          )}

          <form action="/api/auth/login" method="POST" className="lg-form">
            <label className="lg-veld">
              <span>Gebruikersnaam</span>
              <span className="lg-invoer">
                <Icon name="user" size={18} />
                <input type="text" name="username" autoComplete="username" required autoFocus />
              </span>
            </label>

            <label className="lg-veld">
              <span>Wachtwoord</span>
              <span className="lg-invoer">
                <Icon name="lock" size={18} />
                <input type="password" name="password" autoComplete="current-password" required />
              </span>
            </label>

            <button type="submit" className="lg-knop">
              Inloggen
              <Icon name="login" size={18} />
            </button>
          </form>

          <p className="lg-hulp">
            Problemen met inloggen? Mail{' '}
            <a href="mailto:info@ozvoltelektro.nl">info@ozvoltelektro.nl</a>
          </p>
        </div>
      </main>
    </div>
  )
}
