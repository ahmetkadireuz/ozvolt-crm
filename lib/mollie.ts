import { createMollieClient } from '@mollie/api-client'

function getClient() {
  const key = process.env.MOLLIE_API_KEY
  if (!key) throw new Error('MOLLIE_API_KEY niet ingesteld')
  return createMollieClient({ apiKey: key })
}

export async function maakBetaalLink(params: {
  bedrag: number
  omschrijving: string
  redirectUrl: string
  webhookUrl?: string
  metadata?: Record<string, string>
}): Promise<string> {
  const client = getClient()
  const payment = await client.payments.create({
    amount: {
      currency: 'EUR',
      value: params.bedrag.toFixed(2),
    },
    description: params.omschrijving,
    redirectUrl: params.redirectUrl,
    webhookUrl: params.webhookUrl,
    metadata: params.metadata,
  })
  return payment.getCheckoutUrl() ?? payment._links.checkout?.href ?? ''
}
