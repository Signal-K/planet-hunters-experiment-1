'use client'

import { useEffect, useState } from 'react'

/** Window size in CSS px, for screens that lay the base world out in kit units. */
export function useViewSize(): { w: number; h: number } {
  // Same default on server and client so hydration matches; the effect below applies the real size right after mount.
  const [size, setSize] = useState({ w: 1440, h: 900 })
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return size
}
