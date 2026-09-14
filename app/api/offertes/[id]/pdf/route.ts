import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { factuurTenaamstelling, factuurAdresTekst, documentLabel } from '@/lib/utils'
import { requireSession } from '@/lib/session'
import { getKlantSessie } from '@/lib/klant-sessie'
import { genereerOffertePDF } from '@/lib/pdf-offerte'

// De PDF is het document. Er is geen aparte HTML-printweergave meer: die had
// een eigen opmaak die uit de pas liep met de PDF, en Safari printte hem leeg.
// Zonder ?download=1 opent de PDF in de browser, met ?download=1 wordt hij
// als bestand opgeslagen.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const offerteId = parseInt(id)
  const wilDownload = req.nextUrl.searchParams.get('download') === '1'
  const token = req.nextUrl.searchParams.get('token')

  const rows = await sql`
    SELECT o.*, k.naam AS klant_naam, k.email AS klant_email,
           k.telefoon AS klant_telefoon, k.locatie AS klant_locatie,
           k.factuur_naam, k.factuur_adres, k.factuur_postcode, k.factuur_plaats
    FROM offertes o
    JOIN klanten k ON k.id = o.klant_id
    WHERE o.id = ${offerteId}
  `
  const o = rows[0]
  if (!o) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  // Drie manieren om hierbij te mogen: als beheerder, als de klant zelf, of
  // met het accept-token uit de mail. Dat laatste is nodig omdat een klant die
  // op de link in de mail klikt geen sessie heeft, en het is tegelijk veiliger
  // dan een route die alleen op een oplopend nummer werkt.
  const isBeheerder = !!(await requireSession())
  if (!isBeheerder) {
    const heeftGeldigToken = !!token && !!o.accept_token && token === o.accept_token
    if (!heeftGeldigToken) {
      const klantId = await getKlantSessie()
      if (!klantId || klantId !== o.klant_id) {
        return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
      }
    }
  }

  const klantVelden = {
    naam: o.klant_naam,
    locatie: o.klant_locatie,
    factuur_naam: o.factuur_naam,
    factuur_adres: o.factuur_adres,
    factuur_postcode: o.factuur_postcode,
    factuur_plaats: o.factuur_plaats,
  }

  let regels: any[] = []
  if (Array.isArray(o.regels)) regels = o.regels
  else if (typeof o.regels === 'string') { try { regels = JSON.parse(o.regels) } catch {} }

  const offerteNr = `OZVT-${String(o.offertenummer).padStart(4, '0')}`

  const pdf = await genereerOffertePDF({
    offertenummer: offerteNr,
    klantNaam: factuurTenaamstelling(klantVelden),
    klantEmail: o.klant_email,
    klantAdres: factuurAdresTekst(klantVelden),
    klantTelefoon: o.klant_telefoon,
    datum: o.datum,
    geldigTot: o.geldig_tot,
    regels,
    korting: Number(o.korting_pct ?? 0),
    btwPct: Number(o.btw_pct ?? 21),
    notities: o.notities,
    geaccepteerdOp: o.accepted_at,
    geaccepteerdDoor: o.accepted_name,
    documenttype: o.documenttype,
  })

  const bestandsnaam = `${documentLabel(o.documenttype)} ${offerteNr}.pdf`.replace(/[^A-Za-z0-9 ._-]+/g, '-')
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${wilDownload ? 'attachment' : 'inline'}; filename="${bestandsnaam}"`,
      'Content-Length': String(pdf.length),
    },
  })
}
