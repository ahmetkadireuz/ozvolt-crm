import { NextRequest, NextResponse } from 'next/server'
import { createMollieClient } from '@mollie/api-client'
import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import { sendMail, betaaldBevestigingMailHtml } from '@/lib/mail'
import { genereerFactuurPDF } from '@/lib/pdf-factuur'

export async function POST(req: NextRequest) {
  const body = await req.formData().catch(() => null)
  const paymentId = body?.get('id') as string | null
  if (!paymentId) return new NextResponse('ok', { status: 200 })

  const mollieKey = process.env.MOLLIE_API_KEY
  if (!mollieKey) return new NextResponse('ok', { status: 200 })

  try {
    const mollie = createMollieClient({ apiKey: mollieKey })
    const payment = await mollie.payments.get(paymentId)

    if (payment.status !== 'paid') return new NextResponse('ok', { status: 200 })

    const meta = (payment.metadata ?? {}) as Record<string, string>

    // ── Betaling voor een factuur ─────────────────────────────────────────
    if (meta.factuurId) {
      const factuurId = parseInt(meta.factuurId)

      const rows = await sql`
        SELECT f.*, k.naam AS klant_naam, k.email AS klant_email,
               k.telefoon AS klant_telefoon, k.locatie AS klant_adres,
               o.id AS offerte_id
        FROM facturen f
        JOIN klanten k ON k.id = f.klant_id
        LEFT JOIN offertes o ON o.klant_id = f.klant_id AND o.status = 'geaccepteerd'
        WHERE f.id = ${factuurId}
        LIMIT 1
      `
      const factuur = rows[0]
      if (!factuur || factuur.status === 'betaald') return new NextResponse('ok', { status: 200 })

      // Markeer betaald
      await sql`UPDATE facturen SET status = 'betaald', bijgewerkt_op = NOW() WHERE id = ${factuurId}`

      await sql`
        INSERT INTO admin_notifications (type, titel, bericht, link) VALUES (
          'factuur_betaald',
          ${`💰 ${factuur.klant_naam} heeft betaalnota ${factuur.factuurnummer} betaald`},
          ${`Betaald via Mollie — ${payment.amount.value} ${payment.amount.currency}`},
          ${`/facturen/${factuurId}`}
        )
      `

      if (!factuur.klant_email) return new NextResponse('ok', { status: 200 })

      const regels = Array.isArray(factuur.regels) ? factuur.regels : []
      const totalen = berekenTotalen(regels, 0, factuur.btw_pct)

      // Zoek gekoppelde werkafspraken via klant
      let afspraken: any[] = []
      let afspraakNr: string | undefined
      let afspraakDatum: string | undefined
      if (factuur.offerte_id) {
        const aRows = await sql`
          SELECT * FROM werkafspraken WHERE offerte_id = ${factuur.offerte_id} ORDER BY id DESC LIMIT 1
        `
        if (aRows[0]) {
          const w = aRows[0]
          afspraken = Array.isArray(w.afspraken) ? w.afspraken : []
          afspraakNr = `OZWA-${String(w.afspraaknummer).padStart(4, '0')}`
          afspraakDatum = w.datum ? new Date(w.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined
        }
      }

      // Genereer PDF
      let pdfBuffer: Buffer | null = null
      try {
        pdfBuffer = await genereerFactuurPDF({
          factuurnummer: factuur.factuurnummer,
          klantNaam: factuur.klant_naam,
          klantEmail: factuur.klant_email,
          klantAdres: factuur.klant_adres,
          klantTelefoon: factuur.klant_telefoon,
          factuurdatum: factuur.factuurdatum,
          betalingstermijn: factuur.betalingstermijn ?? 14,
          regels,
          btwPct: Number(factuur.btw_pct ?? 21),
          notities: factuur.notities,
          status: 'betaald',
          betaalUrl: null,
        })
      } catch (e) {
        console.error('[mollie webhook pdf]', e)
      }

      await sendMail({
        to: factuur.klant_email,
        subject: `Betaling ontvangen — Betaalnota ${factuur.factuurnummer} · Ozvolt Elektrotechniek`,
        html: betaaldBevestigingMailHtml({
          klantNaam: factuur.klant_naam,
          factuurNr: factuur.factuurnummer,
          bedrag: formatEuro(totalen.inclBtw),
          afspraakNr,
          afspraken: afspraken.length > 0 ? afspraken : undefined,
          afspraakDatum,
        }),
        attachments: pdfBuffer
          ? [{ filename: `${factuur.factuurnummer}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
          : undefined,
      })
    }

    // ── Betaling voor een offerte (aanbetaling) ───────────────────────────
    if (meta.offerteId && !meta.factuurId) {
      const offerteId = parseInt(meta.offerteId)
      const termijn = meta.termijn ? parseInt(meta.termijn) : null

      if (termijn === 1 || !termijn) {
        await sql`UPDATE offertes SET betaling_1_betaald = true, bijgewerkt_op = NOW() WHERE id = ${offerteId}`
      }
      if (termijn === 2) {
        await sql`UPDATE offertes SET betaling_2_betaald = true, bijgewerkt_op = NOW() WHERE id = ${offerteId}`
      }

      const ofRows = await sql`
        SELECT o.*, k.naam AS klant_naam, k.email AS klant_email
        FROM offertes o JOIN klanten k ON k.id = o.klant_id
        WHERE o.id = ${offerteId}
      `
      const offerte = ofRows[0]
      if (offerte) {
        await sql`
          INSERT INTO admin_notifications (type, titel, bericht, link) VALUES (
            'aanbetaling_ontvangen',
            ${`💰 ${offerte.klant_naam} heeft betaald ${termijn ? `(termijn ${termijn})` : ''}`},
            ${`Betaald via Mollie — ${payment.amount.value} ${payment.amount.currency}`},
            ${`/offertes/${offerteId}`}
          )
        `
      }
    }
  } catch (err) {
    console.error('[mollie webhook]', err)
  }

  return new NextResponse('ok', { status: 200 })
}
