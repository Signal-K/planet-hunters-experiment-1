'use client'

import { useLayoutEffect, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'

/**
 * Which way a dropdown opens. The bar sits at the bottom of the first screen, so a menu opens upward there, and downward once the
 * bar is pinned to the top. The room it has is passed back so a long list scrolls instead of running off the window.
 */
export function usePopoverSide(open: boolean, anchor: RefObject<HTMLElement | null>): { side: 'down' | 'up'; style: CSSProperties } {
  const [place, setPlace] = useState<{ side: 'down' | 'up'; room: number }>({ side: 'down', room: 600 })
  useLayoutEffect(() => {
    if (!open || !anchor.current) return
    const rect = anchor.current.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - 16
    const above = rect.top - 16
    const up = below < 360 && above > below
    setPlace({ side: up ? 'up' : 'down', room: Math.max(220, up ? above : below) })
  }, [open, anchor])
  return { side: place.side, style: { maxHeight: Math.min(600, place.room) } }
}
