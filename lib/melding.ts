// Pushmelding naar Ahmets telefoon. Stuurt via ntfy (gratis app, geen account) en/of Telegram,
// afhankelijk van wat er in Vercel is ingesteld. Niets ingesteld → stil overslaan.
//   NTFY_TOPIC                          bijv. 'ozvolt-ahmet-8f3k2q' (zelfde naam abonneren in de ntfy-app)
//   NTFY_URL                            optioneel, standaard https://ntfy.sh
//   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
// Een mislukte melding mag de klant nooit hinderen: fouten worden alleen gelogd.

export async function stuurPushMelding(p: { titel: string; bericht: string; link?: string }) {
  const taken: Promise<unknown>[] = []

  const topic = process.env.NTFY_TOPIC?.trim()
  if (topic) {
    const basis = (process.env.NTFY_URL ?? 'https://ntfy.sh').replace(/\/$/, '')
    taken.push(
      fetch(basis, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          title: p.titel,
          message: p.bericht,
          tags: ['eyes'],
          priority: 4,
          ...(p.link ? { click: p.link } : {}),
        }),
      }).then(r => { if (!r.ok) throw new Error(`ntfy ${r.status}`) }),
    )
  }

  const tgToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const tgChat = process.env.TELEGRAM_CHAT_ID?.trim()
  if (tgToken && tgChat) {
    const tekst = [`*${p.titel}*`, p.bericht, p.link].filter(Boolean).join('\n')
    taken.push(
      fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChat, text: tekst, parse_mode: 'Markdown', disable_web_page_preview: true }),
      }).then(r => { if (!r.ok) throw new Error(`telegram ${r.status}`) }),
    )
  }

  const uitkomst = await Promise.allSettled(taken)
  for (const u of uitkomst) if (u.status === 'rejected') console.error('[pushmelding]', u.reason)
}
