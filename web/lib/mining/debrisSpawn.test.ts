import { describe, expect, it } from 'vitest'
import { DEBRIS_PRESETS, LEONIDS_DEBRIS_PRESET, ORIONIDS_DEBRIS_PRESET } from '@/lib/data/sky-events'
import { miningDebrisSpawn } from './debrisSpawn'

describe('mining event roles', () => {
  it.each(DEBRIS_PRESETS)('$eventId never leaks rain into ordinary mining, even at peak', preset => {
    const spawn = miningDebrisSpawn(preset, false, Date.parse(preset.peakUtc))!
    expect(spawn.ratePerMinute).toBe(0)
    expect(spawn.catchable).toBe(false)
  })
  it('keeps Leonid rain catchable in its own run', () => {
    const spawn = miningDebrisSpawn(LEONIDS_DEBRIS_PRESET, true, Date.parse(LEONIDS_DEBRIS_PRESET.peakUtc))!
    expect(spawn.mineral).toBe('leonid_debris')
    expect(spawn.ratePerMinute).toBeGreaterThan(0)
    expect(spawn.catchable).toBe(true)
  })
  it('preserves the once-only fireball in ordinary mining', () => {
    const now = new Date(2026, 9, 22, 3).getTime()
    const spawn = miningDebrisSpawn(ORIONIDS_DEBRIS_PRESET, false, now)!
    expect(spawn.onceMineral).toBeDefined()
    expect(spawn.onceHero).toBe(true)
    expect(miningDebrisSpawn(ORIONIDS_DEBRIS_PRESET, false, now, now)!.onceMineral).toBeUndefined()
  })
})
