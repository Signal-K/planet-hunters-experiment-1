'use client'

import { useEffect, useState } from 'react'

/**
 * Local-clock-driven sky phase for Earth Base (KES-231). Ops screens stay on
 * the dark command-deck theme (`.theme-deep`) at every phase — this only
 * modulates sky warmth/star visibility, it never goes to a bright daylight
 * blue, so it doesn't fight the "one dark-navy palette everywhere" rule.
 */
export type TimeOfDayPhase = 'night' | 'dawn' | 'day' | 'dusk'

export interface TimeOfDay {
  phase: TimeOfDayPhase
  /** HH:MM in the player's local time. */
  label: string
}

function phaseForHour(hour: number): TimeOfDayPhase {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 18) return 'day'
  if (hour >= 18 && hour < 22) return 'dusk'
  return 'night'
}

function computeNow(): TimeOfDay {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return { phase: phaseForHour(now.getHours()), label: `${hh}:${mm}` }
}

// Matches the pre-existing static night palette so there's no hydration
// flash between the server render and the client's real local time.
const SSR_DEFAULT: TimeOfDay = { phase: 'night', label: '--:--' }

export function useTimeOfDay(): TimeOfDay {
  const [state, setState] = useState<TimeOfDay>(SSR_DEFAULT)

  useEffect(() => {
    setState(computeNow())
    const id = setInterval(() => setState(computeNow()), 30_000)
    return () => clearInterval(id)
  }, [])

  return state
}
