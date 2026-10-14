import { describe, expect, it } from 'vitest'
import { normalizeState, type PartialSave } from './game-state'

// SSL-569: legacy saves from before the one Space Telescope (SSL-528) tracked two
// telescopes. Either flag must mean the telescope is launched with both feeds unlocked.
const fixtures: Record<string, PartialSave> = {
  'transit only': { player: { transitSatelliteLaunchedAt: 1_700_000_000_000 } } as PartialSave,
  'deep space only': { player: { deepSpaceTelescopeBuilt: true, deepSpaceTelescopeLaunchedAt: 1_700_000_500_000 } } as PartialSave,
  'deep space flag without a stamp': { player: { deepSpaceTelescopeBuilt: true } } as PartialSave,
  both: { player: { transitSatelliteLaunchedAt: 1_700_000_000_000, deepSpaceTelescopeBuilt: true, deepSpaceTelescopeLaunchedAt: 1_700_000_900_000 } } as PartialSave,
}

describe('legacy telescope save merge', () => {
  for (const [name, save] of Object.entries(fixtures)) {
    it(`unlocks both feeds for a ${name} save`, () => {
      const { player } = normalizeState(save)
      expect(player.deepSpaceTelescopeBuilt).toBe(true)
      expect(player.transitSatelliteLaunchedAt).toBeGreaterThan(0)
      expect(player.deepSpaceTelescopeLaunchedAt).toBeGreaterThan(0)
    })
  }

  it('keeps the earliest launch time for both feeds', () => {
    const { player } = normalizeState(fixtures['deep space only'])
    expect(player.transitSatelliteLaunchedAt).toBe(1_700_000_500_000)
    const both = normalizeState(fixtures.both).player
    expect(both.transitSatelliteLaunchedAt).toBe(1_700_000_000_000)
    expect(both.deepSpaceTelescopeLaunchedAt).toBe(1_700_000_900_000)
  })

  it('leaves a save with no telescope locked', () => {
    const { player } = normalizeState({ player: {} } as PartialSave)
    expect(player.deepSpaceTelescopeBuilt).toBe(false)
    expect(player.transitSatelliteLaunchedAt ?? null).toBeNull()
    expect(player.deepSpaceTelescopeLaunchedAt ?? null).toBeNull()
  })
})
