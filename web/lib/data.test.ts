import { describe, it, expect } from 'vitest'
import {
  sellCargo,
  suggestBuild,
  validateBuild,
  compatibleTargetsFor,
  rateMission,
  calibrateOnboardingPayout,
  STARTER_ROCKET_COST,
  MINERAL_META,
  MISSIONS,
  MISSION_TEMPLATES,
  TARGETS,
  PARTS,
  CONTRACTOR_SLOTS,
} from './data'

describe('sellCargo', () => {
  it('sums cargo value using mineral prices', () => {
    const total = sellCargo({ iron: 6, silicon: 2 }, MINERAL_META)
    expect(total).toBe(6 * MINERAL_META.iron.price + 2 * MINERAL_META.silicon.price)
  })

  it('ignores minerals not present in the meta table', () => {
    const total = sellCargo({ unobtanium: 5 }, MINERAL_META)
    expect(total).toBe(0)
  })

  it('returns 0 for empty cargo', () => {
    expect(sellCargo({}, MINERAL_META)).toBe(0)
  })
})

describe('suggestBuild', () => {
  const m1 = MISSIONS.find(m => m.sequence === 1)!
  const target = TARGETS.find(t => t.id === 'mars')!

  it('suggests starter parts before any missions are done', () => {
    const build = suggestBuild({ mission: m1, target, missionsDone: 0, parts: PARTS })
    expect(build.chassis).toBe('hull-mk1')
    expect(build.propulsion).toBe('ion-a1')
    expect(build.drill).toBe('hand-drill')
  })

  it('suggests best available drill when mission requires locked tier', () => {
    // A higher-tier drill requirement should use laser-t2 once it is available after M1.
    const m2 = MISSIONS.find(m => m.sequence === 2)!
    const missionWithDrill2 = { ...m2, requires: { ...m2.requires, drill_tier: 2 } }
    const belt = TARGETS.find(t => t.id === 'belt')!
    const build = suggestBuild({ mission: missionWithDrill2, target: belt, missionsDone: 2, parts: PARTS })
    expect(build.drill).toBe('laser-t2')
  })

  it('treats launchpadUpgraded as having completed at least one mission', () => {
    // laser-t2 has missionsRequired: 1 — unavailable at missionsDone: 0 without upgrade.
    // A drill_tier: 2 requirement falls back to hand-drill without upgrade, but gets laser-t2 with it.
    const m1 = MISSIONS.find(m => m.sequence === 1)!
    const target = TARGETS.find(t => t.id === 'mars')!
    const missionWithDrill2 = { ...m1, requires: { ...m1.requires, drill_tier: 2 } }
    const withoutUpgrade = suggestBuild({ mission: missionWithDrill2, target, missionsDone: 0, parts: PARTS })
    expect(withoutUpgrade.drill).toBe('hand-drill')
    const withUpgrade = suggestBuild({ mission: missionWithDrill2, target, missionsDone: 0, launchpadUpgraded: true, parts: PARTS })
    expect(withUpgrade.drill).toBe('laser-t2')
  })
})

describe('validateBuild', () => {
  const m1 = MISSIONS.find(m => m.sequence === 1)!
  const mars = TARGETS.find(t => t.id === 'mars')!

  it('passes when the rocket meets all mission requirements', () => {
    const result = validateBuild({
      mission: m1,
      target: mars,
      rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
      parts: PARTS,
    })
    expect(result.ok).toBe(true)
    expect(result.problems).toEqual([])
  })

  it('flags insufficient cargo capacity', () => {
    const tinyParts = {
      ...PARTS,
      chassis: [{ id: 'tiny', name: 'Tiny', tier: 1, locked: false, img: '', cargo: 1, mass: 1 }],
    }
    const result = validateBuild({
      mission: m1,
      target: mars,
      rocket: { chassis: 'tiny', propulsion: 'ion-a1', drill: 'hand-drill' },
      parts: tinyParts,
    })
    expect(result.ok).toBe(false)
    expect(result.problems.some(p => p.includes('cargo'))).toBe(true)
  })

  it('flags propulsion that cannot reach the target orbit', () => {
    const m2 = MISSIONS.find(m => m.sequence === 2)!
    const farTarget = TARGETS.find(t => t.id === 'jupiter')!
    const result = validateBuild({
      mission: m2,
      target: farTarget,
      rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
      parts: PARTS,
    })
    expect(result.ok).toBe(false)
    expect(result.problems.some(p => p.includes('Propulsion'))).toBe(true)
  })
})

describe('compatibleTargetsFor', () => {
  it('restricts M1 to asteroid targets within orbit range (any minerals)', () => {
    const m1 = MISSIONS.find(m => m.sequence === 1)!
    const compatible = compatibleTargetsFor(m1, TARGETS)
    expect(compatible.every(t => t.type === 'asteroid')).toBe(true)
    expect(compatible.every(t => t.orbit <= m1.requires.max_orbit)).toBe(true)
  })

  it('restricts M2 to asteroid targets (onboarding, no planet access)', () => {
    const m2 = MISSIONS.find(m => m.sequence === 2)!
    const compatible = compatibleTargetsFor(m2, TARGETS)
    expect(compatible.every(t => t.type === 'asteroid')).toBe(true)
  })

  it('allows planets for M3+ missions that require their minerals', () => {
    // Synthesise a sequence-3 mission without a fixed targetId that requires ice
    const m3: import('./data/types').Mission = {
      id: 'test-m3', title: 'Test', brief: '', contractor: 'kepler-materials',
      tag: 'BULK', difficulty: 'L2', locked: false, sequence: 3,
      requires: { minerals: { ice: 2 }, cargo_min: 2, drill_tier: 1, max_orbit: 8 },
      payout: { francs: 0, affinity: 0 },
    }
    const compatible = compatibleTargetsFor(m3, TARGETS)
    expect(compatible.some(t => t.type === 'planet')).toBe(true)
  })

  it('returns only the fixed target for M3 rover delivery missions', () => {
    const m3 = MISSIONS.find(m => m.id === 'lnm_m3_ore_delivery')!
    const compatible = compatibleTargetsFor(m3, TARGETS)
    expect(compatible).toHaveLength(1)
    expect(compatible[0].id).toBe('lutetia')
  })
})

describe('rateMission', () => {
  it('returns 0 when there is no active mission', () => {
    expect(rateMission({ mission: null, cargo: {}, elapsed: 10 })).toBe(0)
  })

  it('returns 1 when cargo requirements are not met', () => {
    const m1 = MISSIONS.find(m => m.sequence === 1)!
    expect(rateMission({ mission: m1, cargo: {}, elapsed: 10 })).toBe(1)
  })

  it('returns 3 stars for a fast delivery that meets requirements', () => {
    const m1 = MISSIONS.find(m => m.sequence === 1)!
    expect(rateMission({ mission: m1, cargo: m1.requires.minerals, elapsed: 20 })).toBe(3)
  })

  it('returns 2 stars for a medium-speed delivery', () => {
    const m1 = MISSIONS.find(m => m.sequence === 1)!
    expect(rateMission({ mission: m1, cargo: m1.requires.minerals, elapsed: 45 })).toBe(2)
  })

  it('returns 1 star for a slow delivery', () => {
    const m1 = MISSIONS.find(m => m.sequence === 1)!
    expect(rateMission({ mission: m1, cargo: m1.requires.minerals, elapsed: 90 })).toBe(1)
  })
})

describe('calibrateOnboardingPayout', () => {
  const floor1 = Math.round(STARTER_ROCKET_COST * 1.5)

  it('enforces a floor of 1.5× rocket cost on the first mission', () => {
    expect(calibrateOnboardingPayout(0, 0)).toBe(floor1)
    expect(calibrateOnboardingPayout(floor1 - 1, 0)).toBe(floor1)
  })

  it('does not reduce a first-mission payout already above the floor', () => {
    expect(calibrateOnboardingPayout(floor1 + 100_000, 0)).toBe(floor1 + 100_000)
  })

  it('nudges second-mission payout toward 1.15× rocket cost', () => {
    const target = Math.round(STARTER_ROCKET_COST * 1.15)
    const rawBelow = target - 10_000
    const result = calibrateOnboardingPayout(rawBelow, 1)
    expect(result).toBeGreaterThanOrEqual(rawBelow)
    expect(result).toBeLessThanOrEqual(target)
  })

  it('leaves payouts unchanged for missions after the second', () => {
    expect(calibrateOnboardingPayout(999, 2)).toBe(999)
    expect(calibrateOnboardingPayout(999, 10)).toBe(999)
  })
})

describe('seed bible v0 catalog', () => {
  it('defines ten mechanical contractor slots at the spec unlock tiers', () => {
    expect(CONTRACTOR_SLOTS).toHaveLength(10)
    expect(CONTRACTOR_SLOTS.map(c => c.unlockTier)).toEqual([1, 1, 1, 2, 2, 3, 3, 4, 4, 5])
    expect(CONTRACTOR_SLOTS.every(c => !c.name.startsWith('Contractor Slot'))).toBe(true)
    expect(CONTRACTOR_SLOTS.every(c => c.mineralPreferences.length > 0)).toBe(true)
    expect(CONTRACTOR_SLOTS.every(c => c.payoutPremium >= 0.18)).toBe(true)
  })

  it('keeps Landnam targets to real solar-system bodies for the seed catalog', () => {
    const blocked = ['tess-451b', 'koi-7923-belt']
    expect(TARGETS.map(t => t.id)).not.toEqual(expect.arrayContaining(blocked))
  })

  it('builds resource-collection missions from mission templates', () => {
    const generated = MISSIONS.filter(m => m.id.startsWith('generated-'))
    expect(MISSION_TEMPLATES.every(t => t.mineralKeys.length > 0)).toBe(true)
    // Generated missions must map to a known template tag
    expect(generated.every(m => MISSION_TEMPLATES.some(t => t.tag === m.tag))).toBe(true)
    expect(generated.filter(m => m.sequence === 1).length).toBeGreaterThan(1)
    expect(generated.filter(m => m.sequence === 2).length).toBeGreaterThan(1)
    expect(generated.every(m => {
      const contractor = CONTRACTOR_SLOTS.find(c => c.id === m.contractor)
      return contractor && contractor.unlockTier <= m.sequence
    })).toBe(true)
  })

  it('authored missions have required fields and valid target references', () => {
    const authored = MISSIONS.filter(m => !m.id.startsWith('generated-'))
    expect(authored.length).toBeGreaterThan(0)
    expect(authored.every(m => m.id && m.title && m.contractor)).toBe(true)
    // M3 authored: lnm_m3_ore_delivery targets lutetia with rover payload
    const m3 = authored.find(m => m.id === 'lnm_m3_ore_delivery')
    expect(m3).toBeDefined()
    expect(m3?.targetId).toBe('lutetia')
    expect(m3?.payload?.type).toBe('rover')
    expect(TARGETS.some(t => t.id === m3?.targetId)).toBe(true)
  })
})
