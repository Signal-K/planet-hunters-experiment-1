import { debrisRatePerMinute, ORIONIDS_PEAK_MULTIPLIER, ORIONIDS_RUN_FRAGMENTS_PER_MINUTE, type DebrisEventPreset } from '@/lib/data/sky-events'
import { isInLocalEventBonusWindow } from '@/lib/data/sky-event-window'
import { FIREBALL_FRAGMENT_ID, fireballDue } from '@/lib/orionids/fireball'
import type { PlayerLocation } from '@/lib/game-types'

/** Ordinary mining gets event scenery and the existing fireball, never shower rain. */
export function miningDebrisSpawn(preset: DebrisEventPreset | null, catchRain: boolean, now: number, fireballCaughtAt?: number | null, location?: PlayerLocation | null) {
  if (!preset) return null
  const fireball = preset.eventId === 'orionids-2026' && fireballDue(now, fireballCaughtAt)
  return {
    mineral: preset.resourceId,
    speedFactor: preset.eventId === 'orionids-2026' ? 1 : preset.speedFactor,
    ratePerMinute: !catchRain ? 0 : preset.eventId === 'orionids-2026'
      ? ORIONIDS_RUN_FRAGMENTS_PER_MINUTE * (isInLocalEventBonusWindow(now, location) ? ORIONIDS_PEAK_MULTIPLIER : 1)
      : debrisRatePerMinute(preset, now, location),
    onceMineral: fireball ? FIREBALL_FRAGMENT_ID : undefined,
    onceHero: fireball,
    catchable: catchRain,
  }
}
