// Hulpjes om een offerte-link via WhatsApp te delen (werkt op iPhone, Android en desktop).

// '06 12345678', '+31 6 1234 5678', '0031612345678' → '31612345678'. Ongeldig → null.
export function waNummer(tel: string | null | undefined): string | null {
  if (!tel) return null
  let n = tel.trim().replace(/[^0-9+]/g, '')
  if (n.startsWith('+')) n = n.slice(1)
  else if (n.startsWith('00')) n = n.slice(2)
  else if (n.startsWith('0')) n = '31' + n.slice(1)
  n = n.replace(/\D/g, '')
  return n.length >= 10 && n.length <= 15 ? n : null
}

export function offerteWhatsAppTekst(p: { klantNaam?: string | null; offerteNr: string; totaal: string; url: string }) {
  const voornaam = (p.klantNaam ?? '').trim().split(' ')[0]
  return [
    voornaam ? `Beste ${voornaam},` : 'Beste klant,',
    '',
    `Hierbij uw offerte ${p.offerteNr} van Ozvolt Elektrotechniek (${p.totaal} incl. btw).`,
    '',
    'U kunt de offerte hier bekijken en digitaal accepteren:',
    p.url,
    '',
    'Heeft u vragen? Laat het gerust weten.',
    '',
    'Met vriendelijke groet,',
    'Ahmet Öz',
    'Ozvolt Elektrotechniek',
  ].join('\n')
}

// Op telefoons opent whatsapp:// direct de app — ook vanuit het CRM als iPhone-app (beginscherm),
// waar een wa.me-link in een browservenster blijft hangen. Op desktop werkt wa.me het best.
export function whatsAppLink(nummer: string | null, tekst: string, mobiel: boolean) {
  const t = encodeURIComponent(tekst)
  if (mobiel) return nummer ? `whatsapp://send?phone=${nummer}&text=${t}` : `whatsapp://send?text=${t}`
  return nummer ? `https://wa.me/${nummer}?text=${t}` : `https://wa.me/?text=${t}`
}

export function isMobielApparaat() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS meldt zich als Mac; herkennen aan touch
  return /iPhone|iPad|iPod|Android/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}
