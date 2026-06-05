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

export async function mbMaakFactuur(params: {
  contactId: string
  factuurNummer: string
  factuurdatum: string
  betalingstermijn: number
  regels: Array<{ omschrijving: string; aantal: number; prijs: number; btw: number }>
  notities?: string | null
}) {
  const details = params.regels.map(r => ({
    description: r.omschrijving,
    amount: String(r.aantal),
    price: r.prijs.toFixed(2),
    tax_rate_id: null, // Moneybird gebruikt tax_rate_id — stel handmatig in als nodig
    ledger_account_id: null,
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

  const payload = {
    sales_invoice: {
      contact_id: params.contactId,
      invoice_date: params.datum.slice(0, 10),
      due_date: vervaldatum.toISOString().slice(0, 10),
      reference: params.referentie,
      details_attributes: [{
        description: params.omschrijving,
        amount: '1',
        price: nettoBedrag.toFixed(2),
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
