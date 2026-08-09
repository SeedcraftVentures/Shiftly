'use client'

import { useState, useEffect } from 'react'

// Canonical client read of the manager's plan entitlement. Reads GET
// /api/subscription (the single derivation point) and exposes the three flags
// callers care about. `isAiTier` is true during any trial (the trial sells the
// AI upgrade) or when subscribed to an AI price. Fails closed to manual so a
// flaky request never leaks the paid agent.
export function useEntitlement() {
  const [state, setState] = useState({ loading: true, hasAccess: false, isTrialing: false, isAiTier: false })

  useEffect(() => {
    let cancelled = false
    fetch('/api/subscription')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) { if (!cancelled) setState((s) => ({ ...s, loading: false })); return }
        setState({ loading: false, hasAccess: !!d.hasAccess, isTrialing: !!d.isTrialing, isAiTier: !!d.isAiTier })
      })
      .catch(() => { if (!cancelled) setState((s) => ({ ...s, loading: false })) })
    return () => { cancelled = true }
  }, [])

  return state
}
