import { NextRequest } from 'next/server'
import { botJson, botAlleenLezen, botScope, botSleutelUitAanvraag, botSleutelIngesteld } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

/**
 * Diagnose voor de bot-API — werkt ook zonder geldige sleutel.
 * Geeft alleen booleans/scope terug, nooit (delen van) sleutels.
 */
export async function GET(req: NextRequest) {
  const ontvangen = botSleutelUitAanvraag(req)
  return botJson({
    header_ontvangen: ontvangen !== null,
    vorm: ontvangen?.vorm ?? null,
    crm_sleutel_ingesteld: botSleutelIngesteld('crm'),
    finance_sleutel_ingesteld: botSleutelIngesteld('finance'),
    scope: botScope(req),
  })
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
