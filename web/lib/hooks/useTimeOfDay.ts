'use client'

import { useEffect, useState } from 'react'
import {
  coarseSkyPhase,
  lockedSeason,
  lockedWorldTime,
  sanitizeSeason,
  sanitizeWorldTime,
  seasonForDate,
  worldTimeForHour,
  type Season,
  type WorldTimeGrade,
} from '@/lib/scene/base-world'

/**
 * Game clock for Earth Base. The sky follows the player's local hour through
 * dawn, morning, midday, afternoon, dusk and night. `?time=` and `?season=`
 * lock a preview grade so each combination can be screenshotted. The coarse
 * `phase` still feeds screens that only have four plates.
 */
export type TimeOfDayPhase = 'night' | 'dawn' | 'day' | 'dusk'

export interface TimeOfDay {
  /** Four-step sky for older scenes. */
  phase: TimeOfDayPhase
  /** Six-step grade that paints the Base. */
  grade: WorldTimeGrade
  /** HH:MM in the player's local time. */
  label: string
}

function formatClock(now: Date): string {
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function computeNow(): TimeOfDay {
  const now = new Date()
  const grade = worldTimeForHour(now.getHours())
  return { phase: coarseSkyPhase(grade), grade, label: formatClock(now) }
}

function previewGrade(): WorldTimeGrade | null {
  if (typeof window === 'undefined') return null
  return sanitizeWorldTime(new URLSearchParams(window.location.search).get('time'))
}

function previewSeason(): Season | null {
  if (typeof window === 'undefined') return null
  return sanitizeSeason(new URLSearchParams(window.location.search).get('season'))
}

// Night matches the first server paint so the sky does not flash at midday
// before the client reads the clock.
const SSR_DEFAULT: TimeOfDay = { phase: 'night', grade: 'night', label: '--:--' }

export function useTimeOfDay(): TimeOfDay {
  const [state, setState] = useState<TimeOfDay>(SSR_DEFAULT)

  useEffect(() => {
    const locked = lockedWorldTime() ?? previewGrade()
    if (locked) {
      setState({ phase: coarseSkyPhase(locked), grade: locked, label: formatClock(new Date()) })
      return
    }
    setState(computeNow())
    const id = setInterval(() => setState(computeNow()), 30_000)
    return () => clearInterval(id)
  }, [])

  return state
}

/** Season from the local month, or `?season=` when a preview is locked. */
export function useBaseSeason(): Season {
  const [season, setSeason] = useState<Season>('autumn')
  useEffect(() => {
    setSeason(lockedSeason() ?? previewSeason() ?? seasonForDate(new Date()))
  }, [])
  return season
}
