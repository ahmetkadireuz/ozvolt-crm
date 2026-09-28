import Anthropic from '@anthropic-ai/sdk'
import { mbDownloadBijlage } from '@/lib/moneybird'
import { leverancierNaam, type BonAnalyse, type DocSoort, type Grootboek } from './data'

/* ============================================================
   AI-controle van één bon/factuur met Claude (vision + PDF).
   Leest de bijlage, vergelijkt met de boeking in Moneybird en
   stelt per regel een grootboekrekening voor.
   ============================================================ */

const MODEL = 'claude-opus-5'

const AFBEELDING_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type AfbeeldingType = typeof AFBEELDING_TYPES[number]

const SYSTEEM = `Je controleert inkoopfacturen en bonnen voor een Nederlandse eenmanszaak in elektrotechniek (installatiewerk, laadpalen, groepenkasten, storingen). De ondernemer werkt daarnaast in loondienst; het bedrijf is btw-plichtig (geen KOR).

Je krijgt de bon/factuur als bijlage, de boeking zoals die in Moneybird staat, en de lijst met beschikbare grootboekrekeningen.

Doe het volgende:
1. Lees leverancier, datum, factuurnummer, totaal incl. btw en btw-bedrag van de bijlage.
2. Beoordeel of de boeking in Moneybird klopt met de bijlage (bedragen, datum, leverancier).
3. Stel per boekingsregel de best passende grootboekrekening voor, uitsluitend gekozen uit de meegegeven lijst (gebruik het id). Laat het voorstel gelijk aan de huidige rekening als die al goed is.
4. Benoem fiscale aandachtspunten volgens de Nederlandse regels:
   - Bedrijfsmiddel van €450 of meer excl. btw dat meerdere jaren meegaat (gereedschap, meetapparatuur, laptop, telefoon, inrichting bus): hoort op een activa-rekening (afschrijven) en telt mee voor de kleinschaligheidsinvesteringsaftrek. Zet is_investering dan op true en kies een activa-rekening als die in de lijst staat.
   - Werkkleding is alleen aftrekbaar met bedrijfslogo van minimaal 70 cm² of als beschermende kleding (veiligheidsschoenen S1-S3, handschoenen, veiligheidsbril, isolerende handschoenen).
   - Eten en drinken (horeca, lunch, koffie onderweg), representatie en relatiegeschenken: btw is niet aftrekbaar; kosten vallen onder de gemengde kosten (beperkt aftrekbaar).
   - Brandstof en auto: afhankelijk van zakelijke of privéauto; bij privéauto alleen €0,23 per zakelijke kilometer, geen brandstofbonnen.
   - Telefoon en internet thuis: alleen het zakelijke deel.
   - Privé-uitgaven horen niet in de administratie.
   - Btw op de bon moet op naam van het bedrijf staan voor aftrek bij bedragen boven circa €100; een kassabon zonder btw-specificatie geeft geen recht op btw-aftrek.
   - Ontbreekt de bijlage of is die onleesbaar, meld dat als actie.
5. Geef een korte samenvatting in één zin.

Schrijf alles in helder Nederlands voor een ondernemer zonder boekhoudkennis. Wees concreet en kort. Verzin geen gegevens: gebruik null als iets niet leesbaar is.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['soort_document', 'leverancier', 'datum', 'factuurnummer', 'totaal_incl', 'btw_bedrag', 'btw_aftrekbaar',
    'btw_toelichting', 'is_investering', 'samenvatting', 'aandachtspunten', 'regels'],
  properties: {
    soort_document: { type: 'string', enum: ['inkoopfactuur', 'bon', 'geen_bon'] },
    leverancier: { type: 'string' },
    datum: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
    factuurnummer: { type: ['string', 'null'] },
    totaal_incl: { type: ['number', 'null'] },
    btw_bedrag: { type: ['number', 'null'] },
    btw_aftrekbaar: { type: 'string', enum: ['ja', 'deels', 'nee'] },
    btw_toelichting: { type: 'string' },
    is_investering: { type: 'boolean' },
    samenvatting: { type: 'string' },
    aandachtspunten: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['niveau', 'tekst'],
        properties: {
          niveau: { type: 'string', enum: ['actie', 'let_op', 'info'] },
          tekst: { type: 'string' },
        },
      },
    },
    regels: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['detail_id', 'voorgesteld_grootboek_id', 'reden'],
        properties: {
          detail_id: { type: 'string' },
          voorgesteld_grootboek_id: { type: ['string', 'null'] },
          reden: { type: 'string' },
        },
      },
    },
  },
} as const

type RuweAnalyse = Omit<BonAnalyse, 'regels'> & {
  regels: { detail_id: string; voorgesteld_grootboek_id: string | null; reden: string }[]
}

function num(v: unknown) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

export async function analyseerDocument(soort: DocSoort, doc: any, grootboeken: Grootboek[]): Promise<BonAnalyse> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is niet ingesteld in Vercel')

  const details: any[] = Array.isArray(doc.details) ? doc.details : []
  const grootboekNaam = new Map(grootboeken.map(g => [g.id, g.naam]))

  // ── Bijlage ophalen (eerste bruikbare pdf/afbeelding) ──
  const bijlagen: any[] = Array.isArray(doc.attachments) ? doc.attachments : []
  const content: Anthropic.ContentBlockParam[] = []
  let bijlageGelezen = false
  for (const b of bijlagen) {
    const type = String(b.content_type ?? '').toLowerCase()
    const isPdf = type === 'application/pdf' || String(b.filename ?? '').toLowerCase().endsWith('.pdf')
    const isAfbeelding = (AFBEELDING_TYPES as readonly string[]).includes(type)
    if (!isPdf && !isAfbeelding) continue
    const { data } = await mbDownloadBijlage(soort, String(doc.id), String(b.id))
    const base64 = data.toString('base64')
    content.push(isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: type as AfbeeldingType, data: base64 } })
    bijlageGelezen = true
    break
  }

  const boeking = {
    soort: soort === 'receipts' ? 'bon' : 'inkoopfactuur',
    leverancier: leverancierNaam(doc),
    datum: doc.date ?? null,
    referentie: doc.reference ?? null,
    totaal_incl_btw: num(doc.total_price_incl_tax),
    totaal_excl_btw: num(doc.total_price_excl_tax),
    prijzen_incl_btw: !!doc.prices_are_incl_tax,
    regels: details.map(d => ({
      detail_id: String(d.id),
      omschrijving: d.description ?? '',
      bedrag_excl: num(d.total_price_excl_tax_with_discount ?? num(d.price) * (num(d.amount) || 1)),
      huidige_grootboekrekening: d.ledger_account_id ? grootboekNaam.get(String(d.ledger_account_id)) ?? String(d.ledger_account_id) : null,
    })),
  }

  content.push({
    type: 'text',
    text: [
      bijlageGelezen ? 'De bijlage hierboven is de bon/factuur.' : 'LET OP: er is geen leesbare bijlage (pdf/afbeelding) bij dit document.',
      '',
      'Boeking in Moneybird:',
      JSON.stringify(boeking, null, 2),
      '',
      'Beschikbare grootboekrekeningen (id — naam — type):',
      grootboeken.map(g => `${g.id} — ${g.naam} — ${g.type === 'non_current_assets' ? 'activa (investering)' : 'kosten'}`).join('\n'),
    ].join('\n'),
  })

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA as unknown as Record<string, unknown> } },
    system: SYSTEEM,
    messages: [{ role: 'user', content }],
  })
  const bericht = await stream.finalMessage()

  if (bericht.stop_reason === 'refusal') throw new Error('De AI heeft dit document niet beoordeeld (geweigerd)')
  if (bericht.stop_reason === 'max_tokens') throw new Error('De AI-analyse werd afgebroken (te lang)')

  const tekst = bericht.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text
  if (!tekst) throw new Error('Geen antwoord van de AI')
  const ruw = JSON.parse(tekst) as RuweAnalyse

  // Alleen bestaande regels en grootboekrekeningen accepteren
  const geldigGrootboek = new Set(grootboeken.map(g => g.id))
  const voorstelPerRegel = new Map(ruw.regels.map(r => [r.detail_id, r]))
  const regels = details.map(d => {
    const v = voorstelPerRegel.get(String(d.id))
    const voorgesteld = v?.voorgesteld_grootboek_id && geldigGrootboek.has(v.voorgesteld_grootboek_id) ? v.voorgesteld_grootboek_id : null
    return {
      detail_id: String(d.id),
      omschrijving: d.description ?? '',
      bedrag_excl: num(d.total_price_excl_tax_with_discount ?? num(d.price) * (num(d.amount) || 1)),
      huidig_grootboek_id: d.ledger_account_id ? String(d.ledger_account_id) : null,
      voorgesteld_grootboek_id: voorgesteld,
      reden: v?.reden ?? '',
    }
  })

  // Controle: wijkt het gelezen totaal af van de boeking?
  const aandachtspunten = [...ruw.aandachtspunten]
  if (ruw.totaal_incl != null && Math.abs(ruw.totaal_incl - boeking.totaal_incl_btw) > 1) {
    aandachtspunten.unshift({
      niveau: 'actie',
      tekst: `Het totaal op de bon (€ ${ruw.totaal_incl.toFixed(2)}) wijkt af van de boeking in Moneybird (€ ${boeking.totaal_incl_btw.toFixed(2)}).`,
    })
  }

  return { ...ruw, aandachtspunten, regels }
}
