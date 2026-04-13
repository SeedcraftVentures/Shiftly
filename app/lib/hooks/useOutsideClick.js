'use client'

import { useEffect } from 'react'

export function useOutsideClick(ref, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler(e)
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler, enabled])
}