'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'

const HIDE_ON = ['/login', '/klussen/nieuw', '/offerte/', '/werkafspraak/', '/klant', '/rapporten/']

export default function MobileFab() {
  const pathname = usePathname()
  // Niet op detail- en bewerkpagina's (bijv. /offertes/12): daar zit hij over knoppen en totalen heen
  if (HIDE_ON.some(p => pathname.startsWith(p)) || /^\/[^/]+\/.+/.test(pathname)) return null
  return (
    <Link href="/klussen/nieuw" className="mobile-fab" aria-label="Nieuwe aanvraag">
      <Icon name="plus" size={26} strokeWidth={2.2} />
    </Link>
  )
}
