'use client'

import { useEffect } from 'react'

// Laat het CRM weten dat de klant de offerte heeft geopend (server meldt alleen de eerste keer).
export default function OfferteGeopendMelder({ token }: { token: string }) {
  useEffect(() => {
    const sleutel = `ozv-geopend-${token}`
    try { if (sessionStorage.getItem(sleutel)) return; sessionStorage.setItem(sleutel, '1') } catch {}
    fetch('/api/offertes/geopend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      keepalive: true,
    }).catch(() => {})
  }, [token])
  return null
}
