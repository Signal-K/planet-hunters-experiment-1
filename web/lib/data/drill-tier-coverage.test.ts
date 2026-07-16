import { describe, it, expect } from 'vitest'
import { MISSIONS } from './missions'
import { MINERAL_META } from './minerals'

// Guardrail against the 2026-07-14-class economy audit finding: a mission's
// requires.drill_tier is a flat floor (template.drillTierMin, or a hardcoded
// value on an authored mission) that has no inherent link to which specific
// minerals ended up in requires.minerals. MiningController physically caps
// how deep the laser reaches by the equipped drill tier (see
// LASER_DEPTH_BY_TIER in MiningController.ts), so a mission whose drill_tier
// is lower than the laserAccess tier of any of its required minerals is
// unwinnable — the player can build something the game calls "compatible"
// and still never be able to collect the ore the order needs.
describe('drill-tier coverage — every mission\'s drill_tier covers its own required minerals', () => {
  for (const mission of MISSIONS) {
    const requiredMinerals = Object.keys(mission.requires.minerals)
    if (requiredMinerals.length === 0) continue

    it(`${mission.id} requires drill_tier >= max laserAccess of {${requiredMinerals.join(', ')}}`, () => {
      const maxLaserAccess = Math.max(...requiredMinerals.map(m => MINERAL_META[m]?.laserAccess ?? 1))
      expect(mission.requires.drill_tier).toBeGreaterThanOrEqual(maxLaserAccess)
    })
  }
})
