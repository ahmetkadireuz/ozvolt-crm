const BASE = 'https://moneybird.com/api/v2'

function adminId() {
  return process.env.MONEYBIRD_ADMIN_ID ?? ''
}

function headers() {
  return {
    'Authorization': `Bearer ${process.env.MONEYBIRD_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function mbFetch(path: string, options?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000) // 5 seconden timeout
  try {
    const res = await fetch(`${BASE}/${adminId()}${path}`, {
      ...options,
      headers: { ...headers(), ...(options?.headers ?? {}) },
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      if (res.status === 401) throw new Error('Moneybird: ongeldige API token — controleer MONEYBIRD_API_TOKEN in Vercel')
      if (res.status === 404) throw new Error('Moneybird: administratie niet gevonden — controleer MONEYBIRD_ADMIN_ID in Vercel')
      throw new Error(`Moneybird API fout ${res.status}: ${text}`)
    }
    return res.status === 204 ? null : res.json()
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Moneybird reageert niet (timeout) — controleer je API token en admin ID in Vercel')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// Generiek verzoek voor andere modules (bonnen-controle)
export function mbApi(path: string, options?: RequestInit) {
  return mbFetch(path, options)
}

/** Downloadt een bijlage van een inkoopdocument als bytes (volgt de redirect naar de opslag). */
export async function mbDownloadBijlage(docPad: 'purchase_invoices' | 'receipts' | 'typeless_documents', docId: string, bijlageId: string) {
  const res = await fetch(`${BASE}/${adminId()}/documents/${docPad}/${docId}/attachments/${bijlageId}/download`, {
    headers: { Authorization: `Bearer ${process.env.MONEYBIRD_API_TOKEN}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`Bijlage downloaden mislukt (HTTP ${res.status})`)
  return { data: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') ?? '' }
}

// ── Lezen met paginering (fiscale module) ────────────────────────────────────
// Moneybird: max 100 per pagina, limiet 150 requests / 5 min (429 + Retry-After).

export async function mbLijst<T = any>(path: string, maxPaginas = 50): Promise<T[]> {
  const alles: T[] = []
  const scheider = path.includes('?') ? '&' : '?'
  for (let page = 1; page <= maxPaginas; page++) {
    const url = `${BASE}/${adminId()}${path}${scheider}per_page=100&page=${page}`
    let res: Response | null = null
    for (let poging = 0; poging < 3; poging++) {
      res = await fetch(url, { headers: headers(), cache: 'no-store', signal: AbortSignal.timeout(15000) })
      if (res.status !== 429) break
      const wacht = Math.min(Number(res.headers.get('Retry-After') ?? 5), 20)
      await new Promise(r => setTimeout(r, wacht * 1000))
    }
    if (!res || !res.ok) {
      const status = res?.status ?? 0
      if (status === 401) throw new Error('Moneybird: ongeldige API token — controleer MONEYBIRD_API_TOKEN in Vercel')
      if (status === 403) throw new Error(`Moneybird: geen toegang tot ${path.split('?')[0]} — geef de API-token leesrechten op dit onderdeel`)
      throw new Error(`Moneybird API fout ${status} bij ${path.split('?')[0]}`)
    }
    const data = await res.json()
    if (!Array.isArray(data)) return alles
    alles.push(...data)
    if (data.length < 100) break
  }
  return alles
}

// ── Contacten ────────────────────────────────────────────────────────────────

export async function mbZoekContact(email: string) {
  const results = await mbFetch(`/contacts?query=${encodeURIComponent(email)}`)
  return Array.isArray(results) ? results[0] ?? null : null
}

export async function mbMaakContact(klant: {
  naam: string; email?: string | null; telefoon?: string | null; type?: string
}) {
  const isZakelijk = klant.type === 'Zakelijk'
  const payload = isZakelijk
    ? { contact: { company_name: klant.naam, email: klant.email ?? '', phone: klant.telefoon ?? '' } }
    : { contact: { firstname: klant.naam.split(' ')[0], lastname: klant.naam.split(' ').slice(1).join(' '), email: klant.email ?? '', phone: klant.telefoon ?? '' } }

  return mbFetch('/contacts', { method: 'POST', body: JSON.stringify(payload) })
}

export async function mbHaalOfMaakContact(klant: {
  id: number; naam: string; email?: string | null; telefoon?: string | null; type?: string
}) {
  // Zoek op e-mail
  if (klant.email) {
    const gevonden = await mbZoekContact(klant.email)
    if (gevonden) return gevonden
  }
  // Maak nieuw aan
  return mbMaakContact(klant)
}

// ── Verkoopfacturen ───────────────────────────────────────────────────────────

// Btw-tarieven voor verkoopfacturen, per percentage (bijv. 21 → id). Gecached per instance.
let _btwTarieven: Map<number, string> | null = null

export async function mbBtwTariefId(pct: number): Promise<string | undefined> {
  if (!_btwTarieven) {
    try {
      const rates = await mbLijst<any>('/tax_rates?filter=tax_rate_type:sales_invoice', 3)
      _btwTarieven = new Map()
      for (const r of rates) {
        if (r.active === false) continue
        const p = Number(r.percentage)
        if (Number.isFinite(p) && !_btwTarieven.has(p)) _btwTarieven.set(p, String(r.id))
      }
    } catch (err) {
      console.error('[moneybird] btw-tarieven ophalen mislukt:', err)
      return undefined
    }
  }
  return _btwTarieven.get(Number(pct))
}

/** Publieke betaal-/bekijklink van een (verstuurde) Moneybird-factuur */
export function mbBetaalUrl(factuur: any): string | null {
  return factuur?.payment_url ?? factuur?.url ?? null
}

export async function mbMaakFactuur(params: {
  contactId: string
  factuurNummer: string
  factuurdatum: string
  betalingstermijn: number
  regels: Array<{ omschrijving: string; aantal: number; prijs: number; btw: number }>
  notities?: string | null
}) {
  // Expliciet btw-tarief per regel; een meegestuurde `null` gaf regels zonder btw
  const details = await Promise.all(params.regels.map(async r => {
    const taxRateId = await mbBtwTariefId(r.btw)
    return {
      description: r.omschrijving,
      amount: String(r.aantal),
      price: r.prijs.toFixed(2),
      ...(taxRateId ? { tax_rate_id: taxRateId } : {}),
    }
  }))

  const datumStr = new Date(params.factuurdatum).toISOString().slice(0, 10)
  const vervaldatum = new Date(params.factuurdatum)
  vervaldatum.setDate(vervaldatum.getDate() + params.betalingstermijn)

  const payload = {
    sales_invoice: {
      contact_id: params.contactId,
      invoice_date: datumStr,
      due_date: vervaldatum.toISOString().slice(0, 10),
      reference: params.factuurNummer,
      prices_are_incl_tax: false,
      notes: params.notities ?? '',
      details_attributes: details,
    },
  }

  return mbFetch('/sales_invoices', { method: 'POST', body: JSON.stringify(payload) })
}

export async function mbVerstuurFactuur(mbFactuurId: string) {
  return mbFetch(`/sales_invoices/${mbFactuurId}/send_invoice`, {
    method: 'PATCH',
    body: JSON.stringify({ sales_invoice_sending: { delivery_method: 'Manual' } }),
  })
}

export async function mbHaalFactuur(mbFactuurId: string) {
  return mbFetch(`/sales_invoices/${mbFactuurId}`)
}

export async function mbMarkeerBetaald(mbFactuurId: string, bedrag: number, datum?: string) {
  return mbFetch(`/sales_invoices/${mbFactuurId}/register_payment`, {
    method: 'PATCH',
    body: JSON.stringify({
      payment: {
        payment_date: datum ?? new Date().toISOString().slice(0, 10),
        price: bedrag.toFixed(2),
      },
    }),
  })
}

// Maakt concept-factuur in Moneybird en geeft de publieke betaallink terug
export async function mbMaakBetaalLink(params: {
  contactId: string
  omschrijving: string
  bedrag: number
  btwPct: number
  referentie: string
  datum: string
}): Promise<{ mbFactuurId: string; betaalUrl: string }> {
  const vervaldatum = new Date(params.datum)
  vervaldatum.setDate(vervaldatum.getDate() + 14)

  const nettoBedrag = params.bedrag / (1 + params.btwPct / 100)
  const taxRateId = await mbBtwTariefId(params.btwPct)

  const payload = {
    sales_invoice: {
      contact_id: params.contactId,
      invoice_date: params.datum.slice(0, 10),
      due_date: vervaldatum.toISOString().slice(0, 10),
      reference: params.referentie,
      prices_are_incl_tax: false,
      details_attributes: [{
        description: params.omschrijving,
        amount: '1',
        price: nettoBedrag.toFixed(2),
        ...(taxRateId ? { tax_rate_id: taxRateId } : {}),
      }],
    },
  }

  const factuur = await mbFetch('/sales_invoices', { method: 'POST', body: JSON.stringify(payload) })

  return {
    mbFactuurId: factuur.id,
    betaalUrl: factuur.url ?? factuur.payment_url ?? factuur.public_view_url ?? `https://moneybird.com/${adminId()}/sales_invoices/${factuur.id}`,
  }
}

// Haal of maak contact op basis van klantdata
export async function mbZoekContactOpNaam(naam: string) {
  const results = await mbFetch(`/contacts?query=${encodeURIComponent(naam)}`)
  return Array.isArray(results) ? results[0] ?? null : null
}
