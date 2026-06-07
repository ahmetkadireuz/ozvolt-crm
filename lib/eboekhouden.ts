const BASE = 'https://api.e-boekhouden.nl/v1'

async function getSessionToken(): Promise<string> {
  const res = await fetch(`${BASE}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: process.env.EBOEKHOUDEN_API_TOKEN,
      source: 'OzvoltCRM',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`e-Boekhouden login mislukt (${res.status}): ${text}`)
  }
  const data = await res.json()
  return data.token
}

async function ebFetch(path: string, token: string, options?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`e-Boekhouden API fout ${res.status}: ${text}`)
    }
    return res.status === 204 ? null : res.json()
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('e-Boekhouden reageert niet (timeout)')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// ── Relaties ─────────────────────────────────────────────────────────────────

async function zoekRelatie(token: string, email: string) {
  const data = await ebFetch(`/relation?email=${encodeURIComponent(email)}&limit=1`, token)
  const items = data?.items ?? data?.relations ?? data
  return Array.isArray(items) && items.length > 0 ? items[0] : null
}

async function maakRelatie(token: string, klant: {
  naam: string; email?: string | null; telefoon?: string | null; type?: string
}) {
  const isZakelijk = klant.type === 'Zakelijk'
  const payload = isZakelijk
    ? { companyName: klant.naam, email: klant.email ?? '', phone: klant.telefoon ?? '' }
    : { fullName: klant.naam, email: klant.email ?? '', phone: klant.telefoon ?? '' }

  return ebFetch('/relation', token, { method: 'POST', body: JSON.stringify(payload) })
}

export async function ebHaalOfMaakRelatie(klant: {
  naam: string; email?: string | null; telefoon?: string | null; type?: string
}): Promise<{ token: string; relatieId: number }> {
  const token = await getSessionToken()

  if (klant.email) {
    const gevonden = await zoekRelatie(token, klant.email)
    if (gevonden) return { token, relatieId: gevonden.id }
  }

  const nieuw = await maakRelatie(token, klant)
  return { token, relatieId: nieuw.id }
}

// ── Factuurtemplate ───────────────────────────────────────────────────────────

async function haalEersteTemplate(token: string): Promise<number> {
  const data = await ebFetch('/invoicetemplate', token)
  const items = Array.isArray(data) ? data : (data?.items ?? [])
  if (!items.length) throw new Error('Geen factuursjabloon gevonden in e-Boekhouden')
  return items[0].id
}

// ── Facturen ──────────────────────────────────────────────────────────────────

export async function ebMaakFactuur(params: {
  relatieId: number
  factuurNummer: string
  factuurdatum: string
  betalingstermijn: number
  regels: Array<{ omschrijving: string; aantal: number; prijs: number; btw: number }>
  notities?: string | null
}): Promise<{ id: number; url: string }> {
  const token = await getSessionToken()
  const templateId = await haalEersteTemplate(token)

  const datumStr = new Date(params.factuurdatum).toISOString().slice(0, 10)

  const items = params.regels.map(r => ({
    description: r.omschrijving,
    quantity: r.aantal,
    price: r.prijs,
    vatCode: r.btw === 21 ? 'HOOG_VERK_21' : r.btw === 9 ? 'LAAG_VERK_9' : 'GEEN',
  }))

  const payload = {
    invoiceNumber: params.factuurNummer,
    relationId: params.relatieId,
    date: datumStr,
    termOfPayment: params.betalingstermijn,
    templateId,
    inExVat: 'EX',
    reference: params.factuurNummer,
    text: params.notities ?? '',
    items,
  }

  const factuur = await ebFetch('/invoice', token, { method: 'POST', body: JSON.stringify(payload) })

  return {
    id: factuur.id,
    url: `https://secure.e-boekhouden.nl/bh/facturen`,
  }
}
