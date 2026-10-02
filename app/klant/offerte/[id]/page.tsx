export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect, notFound } from 'next/navigation'
import { getKlantSessie } from '@/lib/klant-sessie'
import { sql } from '@/lib/db'
import { formatEuro } from '@/lib/utils'
import Icon from '@/components/Icon'
import OfferteDocument, { offerteTotalen } from '@/components/OfferteDocument'
import SignForm from '@/components/OfferteSignForm'
import crypto from 'crypto'

export default async function KlantOffertePagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klantId = await getKlantSessie()
  if (!klantId) redirect('/klant/geen-toegang')

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_adres
    FROM offertes o
    JOIN klanten k ON k.id = o.klant_id
    WHERE o.id = ${id} AND o.klant_id = ${klantId} AND o.status <> 'concept'
  `
  if (!rows[0]) notFound()
  const o = rows[0]

  // Zelfde tekenformulier als de publieke offerte-link: token zo nodig aanmaken
  if (!o.accept_token) {
    const upd = await sql`UPDATE offertes SET accept_token = COALESCE(accept_token, ${crypto.randomBytes(32).toString('hex')}) WHERE id = ${o.id} RETURNING accept_token`
    o.accept_token = upd[0].accept_token
  }
  const totalen = offerteTotalen(o)

  return (
    <div>
      <a href="/klant/dashboard" className="kp-terug">← Terug naar overzicht</a>
      <OfferteDocument
        o={o}
        tekenen={
          <SignForm
            token={o.accept_token}
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
        onderaan={
          <a href={`/api/offertes/${o.id}/pdf?klant=1`} target="_blank" rel="noopener noreferrer" className="kp-pdf-knop">
            <Icon name="download" size={16} />
            PDF downloaden
          </a>
        }
      />
    </div>
  )
}
