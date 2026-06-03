import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { klant_naam, klus_info, onderwerp, context, toon } = await req.json()

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY niet ingesteld' }, { status: 503 })
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const prompt = `Schrijf een professionele e-mail namens Ozvolt Elektrotechniek.

Bedrijfsinfo:
- Naam: Ozvolt Elektrotechniek
- Elektricien in Culemborg, Utrecht & omstreken
- NEN 1010, NEN 3140 en VCA gecertificeerd
- Tel: 06 449 98 789
- Email: info@ozvoltelektro.nl

${klant_naam ? `Klant: ${klant_naam}` : ''}
${klus_info ? `Klus: ${klus_info}` : ''}
Onderwerp: ${onderwerp || 'Niet opgegeven'}
Toon: ${toon}
${context ? `Extra context: ${context}` : ''}

Schrijf de mail in het Nederlands. Gebruik een professionele aanhef en afsluiting. Onderteken met "Met vriendelijke groet, Ahmed Öz / Ozvolt Elektrotechniek".`

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.7,
  })

  const mail = completion.choices[0].message.content ?? ''
  return NextResponse.json({ mail })
}
