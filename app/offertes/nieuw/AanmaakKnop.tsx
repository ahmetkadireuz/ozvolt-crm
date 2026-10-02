'use client'

import { useFormStatus } from 'react-dom'

export default function AanmaakKnop({ bot }: { bot: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? (bot ? 'Offertebot is bezig…' : 'Bezig…') : 'Offerte aanmaken'}
    </button>
  )
}
