'use client'

import { useState, useEffect } from 'react'

// Landscape phones (e.g. 844x390) are short enough that a screen's normal
// top/bottom chrome padding eats most of the available height — see STS-612's
// c1-c4-viewport-matrix "mobile landscape" failures, where AssemblyScreen's
// launch-clearance card rendered under the fixed Confirm Launch bar. Screens
// with fixed top/bottom chrome should compact their content at this size
// rather than let it overflow behind a sticky footer.
const SHORT_VIEWPORT_BREAKPOINT = 460

export function useIsShortViewport(): boolean {
  const [isShort, setIsShort] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-height: ${SHORT_VIEWPORT_BREAKPOINT}px)`)
    setIsShort(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsShort(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isShort
}
