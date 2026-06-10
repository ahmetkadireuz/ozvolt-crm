export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { ensureProjectbeheerTables } from '@/lib/projectbeheer'
import { werkzaamhedenSecties } from '@/lib/oplevering-checklists'
import OpleveringsFormulier from './OpleveringsFormulier'

export const metadata: Metadata = { title: 'Opleveringsrapport' }

export default async function OpleveringPagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ rapport?: string }>
}) {
  const { id } = await params
  const { rapport: rapportParam } = await searchParams
  const klusId = parseInt(id)
  if (isNaN(klusId)) notFound()

  await ensureProjectbeheerTables()

  const klusRows = await sql`
    SELECT k.*, kt.id AS klant_id, kt.naam AS klant_naam, kt.email AS klant_email,
           kt.telefoon AS klant_tel, kt.locatie AS klant_locatie
    FROM klussen k JOIN klanten kt ON kt.id = k.klant_id
    WHERE k.id = ${klusId}
  `
  const klus = klusRows[0]
  if (!klus) notFound()

  // Offerte-regels voor de werkzaamheden-checklist (meest recente offerte van deze klus)
  let offerteRegels: { omschrijving?: string }[] = []
  try {
    const o = await sql`SELECT regels FROM offertes WHERE klus_id = ${klusId} ORDER BY datum DESC LIMIT 1`
    if (Array.isArray(o[0]?.regels)) offerteRegels = o[0].regels
  } catch {}

  // Bestaand rapport bewerken?
  let bestaandRapport: any = null
  const rapportId = parseInt(rapportParam ?? '')
  if (!isNaN(rapportId)) {
    const r = await sql`SELECT * FROM opleveringsrapporten WHERE id = ${rapportId} AND klus_id = ${klusId}`
    bestaandRapport = r[0] ?? null
  }

  const werkSecties = werkzaamhedenSecties(offerteRegels, { type_werk: klus.type_werk, omschrijving: klus.omschrijving })

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href={`/klussen/${klusId}`} className="btn btn-ghost btn-sm">
            <span className="nav-ico" style={{ fontSize: 16 }}>arrow_back</span>
          </Link>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>Opleveringsrapport</h1>
            <span className="mono" style={{ color: '#8ba8c4' }}>{klus.klant_naam} · Project #{klusId}</span>
          </div>
        </div>
      </div>

      <OpleveringsFormulier
        klusId={klusId}
        klantId={klus.klant_id}
        klantNaam={klus.klant_naam}
        typeWerk={klus.type_werk}
        werkzaamhedenSecties={werkSecties}
        bestaandRapport={bestaandRapport}
      />
    </div>
  )
}
