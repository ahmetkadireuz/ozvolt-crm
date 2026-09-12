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

export type MbKlant = {
  naam: string
  email?: string | null
  telefoon?: string | null
  type?: string
  factuur_naam?: string | null
  factuur_adres?: string | null
  factuur_postcode?: string | null
  factuur_plaats?: string | null
}

function gevuld(v?: string | null) {
  return !!v && !!String(v).trim()
}

// Bouwt de contactvelden voor Moneybird. Een ingevulde factuurnaam wint van
// de klantnaam: de factuur moet op die naam staan. De klantnaam blijft dan
// als contactpersoon staan. Velden zonder waarde laten we weg, zodat we
// bestaande gegevens in Moneybird niet met leegte overschrijven.
function contactVelden(klant: MbKlant): Record<string, string> {
  const velden: Record<string, string> = {}
  const naam = String(klant.naam ?? '').trim()
  const bedrijf = gevuld(klant.factuur_naam)
    ? String(klant.factuur_naam).trim()
    : (klant.type === 'Zakelijk' ? naam : '')

  if (bedrijf) {
    velden.company_name = bedrijf
    // Klantnaam als contactpersoon bij het bedrijf
    if (gevuld(klant.factuur_naam) && naam) {
      velden.firstname = naam.split(' ')[0]
      velden.lastname = naam.split(' ').slice(1).join(' ')
    }
  } else {
    velden.firstname = naam.split(' ')[0]
    velden.lastname = naam.split(' ').slice(1).join(' ')
  }

  if (gevuld(klant.email)) velden.email = String(klant.email).trim()
  if (gevuld(klant.telefoon)) velden.phone = String(klant.telefoon).trim()
  if (gevuld(klant.factuur_adres)) velden.address1 = String(klant.factuur_adres).trim()
  if (gevuld(klant.factuur_postcode)) velden.zipcode = String(klant.factuur_postcode).trim()
  if (gevuld(klant.factuur_plaats)) velden.city = String(klant.factuur_plaats).trim()

  return velden
}

export async function mbMaakContact(klant: MbKlant) {
  return mbFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify({ contact: contactVelden(klant) }),
  })
}

export async function mbWerkContactBij(contactId: string, klant: MbKlant) {
  return mbFetch(`/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify({ contact: contactVelden(klant) }),
  })
}

export async function mbHaalOfMaakContact(klant: MbKlant & { id: number }) {
  // Zoek op e-mail
  if (klant.email) {
    const gevonden = await mbZoekContact(klant.email)
    if (gevonden) {
      // Factuurnaam of factuuradres ingevuld? Dan is het CRM de bron en
      // werken we het bestaande contact bij, anders blijft de oude
      // tenaamstelling op de Moneybird-factuur staan.
      const heeftFactuurgegevens = gevuld(klant.factuur_naam) || gevuld(klant.factuur_adres)
        || gevuld(klant.factuur_postcode) || gevuld(klant.factuur_plaats)
      if (heeftFactuurgegevens) {
        try {
          return await mbWerkContactBij(gevonden.id, klant)
        } catch (err) {
          console.error('[moneybird contact bijwerken]', err)
          return gevonden
        }
      }
      return gevonden
    }
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
