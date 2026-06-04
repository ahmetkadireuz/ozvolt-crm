import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { klant_naam, klus_info, onderwerp, context, toon } = await req.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY niet ingesteld in Vercel' }, { status: 503 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Schrijf een professionele e-mail namens Ozvolt Elektrotechniek.

Bedrijfsinfo:
- Naam: Ozvolt Elektrotechniek
- Elektricien in Culemborg, Utrecht & omstreken
- NEN 1010, NEN 3140 en VCA gecertificeerd
- Email: financien@ozvoltelektro.nl

${klant_naam ? `Klant: ${klant_naam}` : ''}
${klus_info ? `Klus: ${klus_info}` : ''}
Onderwerp: ${onderwerp || 'Niet opgegeven'}
Toon: ${toon}
${context ? `Extra context: ${context}` : ''}

Schrijf de mail in het Nederlands. Gebruik een professionele aanhef en afsluiting. Onderteken met "Met vriendelijke groet, Ahmed Öz / Ozvolt Elektrotechniek". Geef alleen de e-mailtekst terug, geen extra uitleg.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })
    const mail = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ mail })
  } catch (err: any) {
    return NextResponse.json({ error: 'Claude API fout: ' + (err?.message ?? String(err)) }, { status: 500 })
  }
}
