import { sql } from '@/lib/db'
import { formatEuro } from '@/lib/utils'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import SignForm from '@/components/OfferteSignForm'
import OfferteDocument, { offerteNummer, offerteTotalen } from '@/components/OfferteDocument'

const SITE = 'https://portaal.ozvoltelektro.nl'
const PAGINA_CSS = `
          html, body { min-height: 100%; margin: 0; padding: 0; }
          body { background: #eef1f6; -webkit-text-size-adjust: 100%; }
          @media (max-width: 600px) { body { background: #fff; } }
        `

const OG_TEKST = 'Bekijk uw offerte en accepteer deze eenvoudig online.'

// Titel en linkvoorbeeld (WhatsApp / iMessage)
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const rows = await sql`SELECT offertenummer FROM offertes WHERE accept_token = ${token}`
  const titel = rows[0] ? `Offerte ${offerteNummer(rows[0])} — Ozvolt Elektrotechniek` : 'Offerte — Ozvolt Elektrotechniek'
  return {
    title: { absolute: titel },
    description: OG_TEKST,
    robots: { index: false, follow: false },
    manifest: null,
    appleWebApp: null,
    openGraph: {
      type: 'website',
      siteName: 'Ozvolt Elektrotechniek',
      title: titel,
      description: OG_TEKST,
      url: `${SITE}/offerte/${token}`,
      locale: 'nl_NL',
      images: [{ url: `${SITE}/og-offerte.png`, width: 1200, height: 630, alt: 'Ozvolt Elektrotechniek — offerte' }],
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function OffertePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres,
           o.betaal_url, o.betaling_50_50, o.betaal_url_2
    FROM offertes o JOIN klanten k ON k.id = o.klant_id
    WHERE o.accept_token = ${token}
  `
  const o = rows[0]
  if (!o) notFound()

  const totalen = offerteTotalen(o)

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: PAGINA_CSS }} />
        <OfferteDocument
          o={o}
          tekenen={
            <SignForm
              token={token}
              isGeaccepteerd={!!o.accepted_at || o.status === 'geaccepteerd'}
              acceptedName={o.accepted_name}
              acceptedAt={o.accepted_at ? new Date(o.accepted_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' }) : null}
              klantEmail={o.klant_email ?? ''}
              totaal={formatEuro(totalen.inclBtw)}
              btwPct={Number(o.btw_pct ?? 21)}
              betaalUrl={o.betaal_url ?? null}
              betaling50_50={!!o.betaling_50_50}
              betaalUrl2={o.betaal_url_2 ?? null}
              eersteTermijn={formatEuro(totalen.inclBtw / 2)}
            />
          }
        />
    </>
  )
}
