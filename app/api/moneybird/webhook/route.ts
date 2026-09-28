import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Moneybird stuurt webhooks bij betalingen
// Stel in via Moneybird → Instellingen → Webhooks
// URL: https://portaal.ozvoltelektro.nl/api/moneybird/webhook

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false, error: 'Ongeldige body' }, { status: 400 })

  // Moneybird stuurt o.a. 'sales_invoice_state_changed_to_paid', '..._to_late' en
  // 'sales_invoice_updated'. We reageren op elk SalesInvoice-event en halen de status
  // zelf op bij Moneybird — een vervalst bericht kan dus geen status forceren.
  const { entity_type, entity_id } = body

  if (entity_type === 'SalesInvoice' && entity_id) {
    try {
      // Zoek factuur op via moneybird_id
      const rows = await sql`
        SELECT id, status FROM facturen WHERE moneybird_id = ${String(entity_id)}
      `
      const factuur = rows[0]
      if (!factuur) return NextResponse.json({ ok: true, skip: 'niet gevonden' })

      // Haal actuele status op uit Moneybird
      const mbRes = await fetch(
        `https://moneybird.com/api/v2/${process.env.MONEYBIRD_ADMIN_ID}/sales_invoices/${entity_id}`,
        { headers: { Authorization: `Bearer ${process.env.MONEYBIRD_API_TOKEN}` } }
      )
      if (!mbRes.ok) return NextResponse.json({ ok: false, error: 'Moneybird fetch mislukt' })

      const mbFactuur = await mbRes.json()
      const mbStatus = mbFactuur.state // 'open', 'paid', 'late', etc.

      let nieuweStatus: string | null = null
      if (mbStatus === 'paid') nieuweStatus = 'betaald'
      else if (mbStatus === 'late') nieuweStatus = 'te_laat'

      if (nieuweStatus && factuur.status !== nieuweStatus) {
        await sql`UPDATE facturen SET status = ${nieuweStatus} WHERE id = ${factuur.id}`

        // Notificatie aanmaken
        if (nieuweStatus === 'betaald') {
          await sql`
            INSERT INTO admin_notifications (type, titel, bericht, link)
            VALUES ('offerte_akkoord', 'Factuur betaald via Moneybird',
              ${`Factuur is betaald en bijgewerkt in het CRM.`},
              ${`/facturen/${factuur.id}`})
          `
        }
      }
    } catch (err) {
      console.error('[moneybird webhook]', err)
    }
  }

  return NextResponse.json({ ok: true })
}

// Moneybird verifieert webhook met GET request
export async function GET() {
  return NextResponse.json({ ok: true })
}
