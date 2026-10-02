'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/Icon'
import { isMobielApparaat, offerteWhatsAppTekst, waNummer, whatsAppLink } from '@/lib/whatsapp'

// Opent WhatsApp met het nummer van de klant en een kant-en-klaar bericht met de portaal-link.
export default function WhatsAppKnop({ telefoon, klantNaam, offerteNr, totaal, url, label = 'Stuur via WhatsApp', className = 'btn btn-success', style }: {
  telefoon: string | null; klantNaam: string | null; offerteNr: string; totaal: string; url: string
  label?: string; className?: string; style?: React.CSSProperties
}) {
  const nummer = waNummer(telefoon)
  const tekst = offerteWhatsAppTekst({ klantNaam, offerteNr, totaal, url })
  // Server rendert de desktop-link; na laden op telefoons de app-link
  const [href, setHref] = useState(() => whatsAppLink(nummer, tekst, false))
  const [mobiel, setMobiel] = useState(false)

  useEffect(() => {
    const m = isMobielApparaat()
    setMobiel(m)
    setHref(whatsAppLink(nummer, tekst, m))
  }, [nummer, tekst])

  return (
    <a href={href} className={className} style={style}
      {...(mobiel ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
      <Icon name="whatsapp" size={16} />
      {label}
    </a>
  )
}
