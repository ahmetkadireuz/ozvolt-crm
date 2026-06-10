'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Slaat `value` automatisch op zodra hij stabiel is gebleven gedurende `delay` ms.
 * Voert geen save uit voor de initiële waarde. `onSave` krijgt de huidige waarde.
 */
export function useAutosave<T>(
  value: T,
  onSave: (val: T) => Promise<void> | void,
  delay: number = 800,
) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const initialRef = useRef(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef(value)

  useEffect(() => {
    if (Object.is(value, lastSavedRef.current)) return
    if (Object.is(value, initialRef.current)) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await onSave(value)
        lastSavedRef.current = value
        setSaved(true)
        setTimeout(() => setSaved(false), 1600)
      } finally {
        setSaving(false)
      }
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return { saving, saved }
}
