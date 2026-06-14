'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'

const HIDE_ON = ['/login', '/klussen/nieuw', '/offerte/', '/werkafspraak/', '/klant', '/rapporten/']

export default function MobileFab() {
  const pathname = usePathname()
  if (HIDE_ON.some(p => pathname.startsWith(p))) return null
  return (
    <Link href="/klussen/nieuw" className="mobile-fab" aria-label="Nieuwe aanvraag">
      <Icon name="plus" size={26} strokeWidth={2.2} />
    </Link>
  )
}
