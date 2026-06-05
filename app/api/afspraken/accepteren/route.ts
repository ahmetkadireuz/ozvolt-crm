import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendMail, werkafspraakBevestigingMailHtml } from '@/lib/mail'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, naam, email } = body

  if (!token || !naam) return NextResponse.json({ error: 'Token en naam zijn verplicht' }, { status: 400 })

  const rows = await sql`
    SELECT w.*, k.naam AS klant_naam, k.email AS klant_email
    FROM werkafspraken w JOIN klanten k ON k.id = w.klant_id
    WHERE w.accept_token = ${token}
  `
  const w = rows[0]
  if (!w) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  if (w.accepted_at) return NextResponse.json({ error: 'Al bevestigd' }, { status: 409 })

  const ip = req.headers.get('x-forwarded-for') ?? ''
  await sql`
    UPDATE werkafspraken SET
      status = 'geaccepteerd',
      accepted_at = NOW(),
      accepted_name = ${naam},
      accepted_email = ${email ?? null},
      accepted_ip = ${ip},
      bijgewerkt_op = NOW()
    WHERE accept_token = ${token}
  `

  // Bevestigingsmail naar klant
  const klantEmail = email || w.klant_email
  if (klantEmail) {
    try {
      const afspraken = Array.isArray(w.afspraken) ? w.afspraken : []
      const afspraakNr = `OZWA-${String(w.afspraaknummer).padStart(4, '0')}`
      const datum = w.datum
        ? new Date(w.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
        : undefined

      await sendMail({
        to: klantEmail,
        subject: `Werkafspraken ${afspraakNr} bevestigd — Ozvolt Elektrotechniek`,
        html: werkafspraakBevestigingMailHtml({
          klantNaam: w.klant_naam,
          afspraakNr,
          afspraken,
          datum,
        }),
      })
    } catch (err) {
      console.error('[werkafspraak bevestiging mail]', err)
    }
  }

  return NextResponse.json({ ok: true })
}
