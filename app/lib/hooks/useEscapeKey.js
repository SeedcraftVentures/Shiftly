'use client'

import { useEffect } from 'react'

export function useEscapeKey(handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const listener = (e) => {
      if (e.key === 'Escape') handler(e)
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [handler, enabled])
}