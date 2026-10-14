'use client'

import { useEffect, useState } from 'react'

/** Window size in CSS px, for screens that lay the base world out in kit units. */
export function useViewSize(): { w: number; h: number } {
  const [size, setSize] = useState(() => (typeof window === 'undefined' ? { w: 1440, h: 900 } : { w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return size
}
