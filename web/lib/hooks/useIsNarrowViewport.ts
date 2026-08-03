'use client'

import { useState, useEffect } from 'react'

// Matches `.mission-board-layout`'s own stacking breakpoint in globals.css
// (`@media (min-width: 821px)`) exactly, on purpose — a JS hook using a
// different number than the CSS breakpoint it's meant to coordinate with is
// exactly the class of bug that caused the STS-612 mobile-landscape
// failures (a CSS media query and a JS layout decision silently disagreeing
// about which viewport a screen counts as "short"/"narrow").
const NARROW_BREAKPOINT = 821

export function useIsNarrowViewport(): boolean {
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT - 1}px)`)
    setIsNarrow(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isNarrow
}
