import Anthropic from '@anthropic-ai/sdk'
import type { RegelItem } from '@/lib/utils'

/* ============================================================
   Offertebot: maakt met Claude een eerste opzet van offerteregels
   op basis van een project (type werk, omschrijving, notities).
   Het resultaat is altijd een concept dat Ahmed zelf nakijkt.
   ============================================================ */

const MODEL = 'claude-sonnet-5-5'

const SYSTEEM = `Je bent de calculator van Ozvolt Elektrotechniek, een eenmanszaak in elektrotechniek in Culemborg, Utrecht en omstreken (groepenkasten, laadpalen, uitbreidingen, storingen, keuringen). Het bedrijf is btw-plichtig.

Je maakt een eerste opzet van de offerteregels voor een project. Regels:
- Splits in logische posten: materiaal (bijv. groepenkast, automaten, aardlekschakelaars, kabel, dozen, klein materiaal), arbeid, voorrijden, meten/testen en opleverrapport. Voeg afvoer van oud materiaal toe als dat logisch is.
- Arbeid reken je als aantal uren × € 65 ex btw. Materiaal is een realistische verkoopprijs ex btw per stuk (inkoop plus ongeveer 20% opslag).
- "omschrijving" is een korte regeltitel; "beschrijving" is één heldere zin die een particulier snapt. Geen interne notities.
- Btw 21% per regel, tenzij er een duidelijke reden is voor een ander tarief.
- Is de informatie te summier, maak dan een redelijke standaardopzet voor dit type werk en zet je aannames in "aannames".
- Verzin geen klantgegevens.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['regels', 'aannames'],
  properties: {
    regels: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['omschrijving', 'beschrijving', 'aantal', 'prijs', 'btw'],
        properties: {
          omschrijving: { type: 'string' },
          beschrijving: { type: 'string' },
          aantal: { type: 'number' },
          prijs: { type: 'number', description: 'Prijs per stuk/uur in euro ex btw' },
          btw: { type: 'number', enum: [0, 9, 21] },
        },
      },
    },
    aannames: { type: 'string', description: 'Korte interne toelichting op de aannames, max. 3 zinnen' },
  },
}

export type OfferteConcept = { regels: RegelItem[]; aannames: string }

export async function maakOfferteConcept(input: {
  klant: { naam: string; type?: string | null; locatie?: string | null }
  klus?: { type_werk?: string | null; omschrijving?: string | null; product?: string | null; notities?: string | null } | null
  wensen?: string
}): Promise<OfferteConcept> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY niet ingesteld in Vercel')

  const { klant, klus, wensen } = input
  const regelsTekst = [
    `Klant: ${klant.type || 'Particulier'}${klant.locatie ? `, ${klant.locatie}` : ''}`,
    klus?.type_werk && `Type werk: ${klus.type_werk}`,
    klus?.product && `Product: ${klus.product}`,
    klus?.omschrijving && `Omschrijving van de klant: ${klus.omschrijving}`,
    klus?.notities && `Notities: ${klus.notities}`,
    wensen && `Extra instructies van Ozvolt: ${wensen}`,
  ].filter(Boolean).join('\n')

  const client = new Anthropic()
  const bericht = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA as unknown as Record<string, unknown> } },
    system: SYSTEEM,
    messages: [{ role: 'user', content: `Maak de offerteregels voor dit project.\n\n${regelsTekst}` }],
  })

  if (bericht.stop_reason === 'refusal') throw new Error('De offertebot heeft geen opzet gemaakt')
  const tekst = bericht.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text
  if (!tekst) throw new Error('Geen antwoord van de offertebot')
  const ruw = JSON.parse(tekst) as OfferteConcept

  const regels = (ruw.regels ?? [])
    .map(r => ({
      omschrijving: String(r.omschrijving ?? '').slice(0, 200),
      beschrijving: String(r.beschrijving ?? '').slice(0, 500),
      aantal: Number(r.aantal) > 0 ? Number(r.aantal) : 1,
      prijs: Math.max(0, Math.round(Number(r.prijs) * 100) / 100 || 0),
      btw: [0, 9, 21].includes(Number(r.btw)) ? Number(r.btw) : 21,
    }))
    .filter(r => r.omschrijving)
    .slice(0, 30)

  return { regels, aannames: String(ruw.aannames ?? '').slice(0, 600) }
}
