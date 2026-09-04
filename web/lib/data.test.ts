import { describe, it, expect, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  REFINING_VALUE_MULTIPLIER,
  STRUCTURE_PRICES,
  sellCargo,
  suggestBuild,
  validateBuild,
  compatibleTargetsFor,
  feasibleTargetsFor,
  rateMission,
  calibrateOnboardingPayout,
  ONBOARDING_ROCKET_COST,
  MINERAL_META,
  MISSIONS,
  OWN_PROGRAM_BUILD_MISSIONS,
  MISSION_TEMPLATES,
  STRUCTURES,
  TARGETS,
  PARTS,
  CLIENT_SLOTS,
  BASE_LASER_CHARGES,
  canAffordStructure,
  canConfirmCustomizerBuild,
  canUnlockSkillNode,
  calculateShipSuccessChance,
  canInstallPartInSlot,
  chooseCustomizerPart,
  confirmCustomizerBuild,
  createCustomizerBuildState,
  CUSTOMIZER_BUILD_SEQUENCE,
  CUSTOMIZER_PARTS,
  effectiveCargoCapacity,
  effectiveMaxOrbit,
  FREE_OPS_START_MISSIONS_DONE,
  SCANS_PER_DAY,
  SCAN_DURATION_MS,
  SCANS_REQUIRED_TO_MAP,
  TARGET_STRUCTURES,
  findTargetStructure,
  generateFreeOpsMissions,
  getBuildSequence,
  getShipInteriorLayout,
  hasShipCustomizer,
  SKILL_NODES,
  getLaserChargeCap,
  REFINERY_RECIPES,
  refundCustomizerPart,
  selectedCustomizerPartIds,
  structureUnlocked,
  travelDurationMs,
  DAILY_QUEST_TEMPLATES,
  getDailyQuestTemplate,
  todayKey,
  dailyTessCandidates,
  isReviewableTessSubject,
  tessCandidateToExoplanetTarget,
  toTessCandidate,
  archetypeForDiscovery,
  spectralClassForTeff,
  SUN_TEFF_K,
  SELF_DIRECTED_MINING_MISSION_ID,
} from './data'

describe('rocket-part assets', () => {
  it('keeps every rocket-part image reference backed by a public asset', () => {
    for (const part of Object.values(PARTS).flat()) {
      expect(existsSync(resolve(process.cwd(), 'public', part.img.slice(1))), part.img).toBe(true)
    }
  })

  it('gives each named heavy part its own visible sprite', () => {
    const byId = new Map(Object.values(PARTS).flat().map(part => [part.id, part.img]))
    expect(byId.get('hull-mk3')).toBe('/parts/hull_mk3_heavy_t3.png')
    expect(byId.get('hull-hauler')).toBe('/parts/bulk_hauler_t3.png')
    expect(byId.get('plasma-t3')).toBe('/parts/plasma_drill_t3.png')
  })
})

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

describe('skill nodes', () => {
  it('requires enough SP and prevents duplicate unlocks', () => {
    expect(canUnlockSkillNode({ id: 'laser-charge-1', skillPoints: 1, unlockedSkillNodes: [] })).toBe(true)
    expect(canUnlockSkillNode({ id: 'near-range-1', skillPoints: 1, unlockedSkillNodes: [] })).toBe(false)
    expect(canUnlockSkillNode({ id: 'laser-charge-1', skillPoints: 3, unlockedSkillNodes: ['laser-charge-1'] })).toBe(false)
  })

  it('defines the ship customizer unlock node', () => {
    expect(SKILL_NODES.some(node => node.id === 'ship-customizer-1' && node.branch === 'engineering')).toBe(true)
    expect(hasShipCustomizer([])).toBe(false)
    expect(hasShipCustomizer(['ship-customizer-1'])).toBe(true)
  })

  it('applies Sprint 5 node effects to laser, cargo, range, and travel time', () => {
    const unlocked = ['laser-charge-1', 'cargo-slot-1', 'near-range-1']
    expect(getLaserChargeCap(unlocked)).toBe(BASE_LASER_CHARGES + 2)
    expect(effectiveCargoCapacity({ id: 'cargo-test', name: 'Cargo Test', tier: 1, locked: false, img: '', cargo: 10 }, unlocked)).toBe(12)
    expect(effectiveMaxOrbit({ id: 'drive-test', name: 'Drive Test', tier: 1, locked: false, img: '', max_orbit: 5 }, unlocked)).toBe(6)
    expect(travelDurationMs({ id: 'target-test', name: 'Target Test', type: 'asteroid', orbit: 4, difficulty: 'L1', brief: '', minerals: [] }, unlocked, 1000)).toBe(3400)
  })

  it('lets Cargo Slot I satisfy marginal cargo requirements', () => {
    const parts = {
      ...PARTS,
      chassis: [{ id: 'tight', name: 'Tight Hull', tier: 1, locked: false, img: '', cargo: 5, mass: 1 }],
    }
    const mission = { ...MISSIONS[0], requires: { ...MISSIONS[0].requires, cargo_min: 6 } }
    const target = TARGETS.find(t => t.id === 'mars')!
    const locked = validateBuild({
      mission,
      target,
      rocket: { chassis: 'tight', propulsion: 'ion-a1', drill: 'hand-drill' },
      parts,
      unlockedSkillNodes: [],
    })
    const unlocked = validateBuild({
      mission,
      target,
      rocket: { chassis: 'tight', propulsion: 'ion-a1', drill: 'hand-drill' },
      parts,
      unlockedSkillNodes: ['cargo-slot-1'],
    })
    expect(locked.ok).toBe(false)
    expect(unlocked.ok).toBe(true)
  })
})

describe('ship room layouts', () => {
  it('slots Explorer rooms into the cutaway container bounds', () => {
    const layout = getShipInteriorLayout('explorer')
    const legacyLayout = getShipInteriorLayout('sr1')
    expect(legacyLayout).toBe(layout)
    expect(layout?.containerSrc).toBe('/game/assets/ships/containers/sr1_cutaway.png')
    expect(layout?.slots.map(slot => slot.kind).sort()).toEqual(['booster', 'cockpit', 'crew-module', 'engine', 'lander', 'payload'])
    for (const slot of layout?.slots ?? []) {
      expect(slot.x).toBeGreaterThanOrEqual(0)
      expect(slot.y).toBeGreaterThanOrEqual(0)
      expect(slot.x + slot.w).toBeLessThanOrEqual(100)
      expect(slot.y + slot.h).toBeLessThanOrEqual(100)
    }
  })
})

describe('ship customizer parts', () => {
  it('walks the builder from engine through payload', () => {
    expect(CUSTOMIZER_BUILD_SEQUENCE).toEqual(['engine', 'booster', 'cockpit', 'payload'])
    // engine/booster/payload each got 4 higher tiers (T2-T5, 2026-08-04
    // tiered-art pass) on top of the original 2 T1 options; cockpit is
    // still single-tier, unaffected.
    expect(CUSTOMIZER_BUILD_SEQUENCE.map(kind => CUSTOMIZER_PARTS.filter(part => part.kind === kind).length)).toEqual([6, 6, 2, 6])
  })

  it('adds Crew Quarters only to researched post-onboarding hulls', () => {
    expect(getBuildSequence(3, true)).not.toContain('crew-module')
    expect(getBuildSequence(4, false)).not.toContain('crew-module')
    expect(getBuildSequence(4, true)).toContain('crew-module')
  })

  it('adds the Lander Module only to researched post-onboarding hulls', () => {
    expect(getBuildSequence(3, false, true)).not.toContain('lander')
    expect(getBuildSequence(4, false, false)).not.toContain('lander')
    expect(getBuildSequence(4, false, true)).toContain('lander')
    expect(getBuildSequence(4, true, true)).toEqual(expect.arrayContaining(['crew-module', 'lander']))
  })

  it('adds Crew Quarters only to researched post-onboarding hulls', () => {
    expect(getBuildSequence(3, true)).not.toContain('crew-module')
    expect(getBuildSequence(4, false)).not.toContain('crew-module')
    expect(getBuildSequence(4, true)).toContain('crew-module')
  })

  it('adds the Lander Module only to researched post-onboarding hulls', () => {
    expect(getBuildSequence(3, false, true)).not.toContain('lander')
    expect(getBuildSequence(4, false, false)).not.toContain('lander')
    expect(getBuildSequence(4, false, true)).toContain('lander')
    expect(getBuildSequence(4, true, true)).toEqual(expect.arrayContaining(['crew-module', 'lander']))
  })

  it('calculates a higher success chance as required rooms are installed', () => {
    const empty = calculateShipSuccessChance([])
    const full = calculateShipSuccessChance(CUSTOMIZER_PARTS.map(part => part.id))
    expect(full).toBeGreaterThan(empty)
    expect(full).toBeLessThanOrEqual(96)
  })

  it('only allows matching part kinds in hull slots', () => {
    const cockpit = CUSTOMIZER_PARTS.find(part => part.kind === 'cockpit')!
    const engine = CUSTOMIZER_PARTS.find(part => part.kind === 'engine')!
    expect(canInstallPartInSlot(cockpit, 'cockpit')).toBe(true)
    expect(canInstallPartInSlot(cockpit, 'engine')).toBe(false)
    expect(canInstallPartInSlot(engine, 'engine')).toBe(true)
  })

  it('buys, replaces, and refunds staged parts at full market price before confirmation', () => {
    const ion = CUSTOMIZER_PARTS.find(part => part.id === 'ion-thruster-t1')!
    const pulse = CUSTOMIZER_PARTS.find(part => part.id === 'pulse-thruster-t1')!
    const initial = createCustomizerBuildState(1_000_000_000)

    const bought = chooseCustomizerPart(initial, ion.id)
    expect(bought.ok).toBe(true)
    expect(bought.state.balance).toBe(1_000_000_000 - ion.price)
    expect(bought.state.installed.engine).toBe(ion.id)

    const replaced = chooseCustomizerPart(bought.state, pulse.id)
    expect(replaced.ok).toBe(true)
    expect(replaced.state.balance).toBe(1_000_000_000 - pulse.price)
    expect(replaced.state.installed.engine).toBe(pulse.id)

    const refunded = refundCustomizerPart(replaced.state, 'engine')
    expect(refunded.ok).toBe(true)
    expect(refunded.state.balance).toBe(1_000_000_000)
    expect(refunded.state.installed.engine).toBeUndefined()
  })

  it('blocks unaffordable parts without mutating the build state', () => {
    const state = createCustomizerBuildState(100)
    const result = chooseCustomizerPart(state, 'ion-thruster-t1')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('insufficient-balance')
    expect(result.state).toBe(state)
  })

  it('requires all four stages before confirmation and locks changes afterwards', () => {
    let state = createCustomizerBuildState(3_000_000_000)

    const incomplete = confirmCustomizerBuild(state)
    expect(incomplete.ok).toBe(false)
    expect(incomplete.reason).toBe('incomplete-build')
    expect(canConfirmCustomizerBuild(state.installed)).toBe(false)

    for (const partId of ['ion-thruster-t1', 'strap-booster-t1', 'cockpit-command-t1', 'cargo-payload-t1']) {
      state = chooseCustomizerPart(state, partId).state
    }

    expect(selectedCustomizerPartIds(state.installed)).toEqual(['ion-thruster-t1', 'strap-booster-t1', 'cockpit-command-t1', 'cargo-payload-t1'])
    expect(canConfirmCustomizerBuild(state.installed)).toBe(true)

    const confirmed = confirmCustomizerBuild(state)
    expect(confirmed.ok).toBe(true)
    expect(confirmed.state.confirmed).toBe(true)
    expect(chooseCustomizerPart(confirmed.state, 'pulse-thruster-t1').reason).toBe('confirmed')
    expect(refundCustomizerPart(confirmed.state, 'engine').reason).toBe('confirmed')
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

  it('keeps Jupiter body copy specific and excludes planets from onboarding targets', () => {
    const m1 = MISSIONS.find(m => m.sequence === 1)!
    expect(compatibleTargetsFor(m1, TARGETS).some(t => t.id === 'jupiter')).toBe(false)
    expect(TARGETS.find(t => t.id === 'jupiter')?.brief).not.toContain('moons')
  })

  it('allows planets for M3+ missions that require their minerals', () => {
    // Synthesise a sequence-3 mission without a fixed targetId that requires ice
    const m3: import('./data/types').Mission = {
      id: 'test-m3', title: 'Test', brief: '', client: 'kepler-materials',
      tag: 'BULK', difficulty: 'L2', locked: false, sequence: 3,
      requires: { minerals: { ice: 2 }, cargo_min: 2, drill_tier: 1, max_orbit: 8 },
      payout: { francs: 0, affinity: 0 },
    }
    const compatible = compatibleTargetsFor(m3, TARGETS)
    expect(compatible.some(t => t.type === 'planet')).toBe(true)
  })

  it('makes a discovered exoplanet target reachable by an ordinary generated mission (not just its one-off survey flight)', () => {
    // A hot-host, close-in discovery archetypes to 'M' — mirrors what
    // generateMissionsFromRules templates like 'metal-prospect' actually
    // request (iridium/rhodium/gold), proving discovered targets don't need
    // a dedicated generator path: they're picked up the same way any other
    // target is, via compatibleTargetsFor's live mineral/orbit match.
    const discovered = tessCandidateToExoplanetTarget(
      toTessCandidate({
        id: 'discovered-1', tic_id: '999999999', toi_id: '999.01',
        sectors: 'Sector 9', subject_type: 'transit',
        period_days: 2.4, depth_pct: 0.12, st_teff: 9500,
      }),
      2, // measured period days -> close orbit
    )
    expect(discovered.type).toBe('exoplanet')
    expect(discovered.archetype).toBe('M')

    const metalProspect: import('./data/types').Mission = {
      id: 'test-metal-prospect', title: 'Test', brief: '', client: 'kepler-materials',
      tag: 'PROSPECT', difficulty: 'L2', locked: false, sequence: 5,
      requires: { minerals: { iridium: 2 }, cargo_min: 2, drill_tier: 2, max_orbit: 5 },
      payout: { francs: 0, affinity: 0 },
    }
    const compatible = compatibleTargetsFor(metalProspect, [...TARGETS, discovered])
    expect(compatible.some(t => t.id === discovered.id)).toBe(true)
  })
})

describe('feasibleTargetsFor', () => {
  it('rejects a mineral match that the currently unlocked propulsion cannot reach', () => {
    const mission: import('./data/types').Mission = {
      id: 'unreachable-test', title: 'Unreachable', brief: '', client: 'kepler-materials', targetId: 'jupiter',
      tag: 'BULK', difficulty: 'L3', locked: false, sequence: 3,
      requires: { minerals: { hydrogen: 2 }, cargo_min: 2, drill_tier: 1, max_orbit: 6 },
      payout: { francs: 0, affinity: 0 },
    }
    expect(compatibleTargetsFor(mission, TARGETS).some(target => target.id === 'jupiter')).toBe(true)
    expect(feasibleTargetsFor(mission, TARGETS, PARTS, 0)).toHaveLength(0)
  })

  it('keeps a compatible target when the player has unlocked the matching drive', () => {
    const mission = MISSIONS.find(item => item.sequence === 1)!
    expect(feasibleTargetsFor(mission, TARGETS, PARTS, 1).length).toBeGreaterThan(0)
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
  const floor1 = Math.round(ONBOARDING_ROCKET_COST * 1.05)
  const floor2 = Math.round(ONBOARDING_ROCKET_COST * 1.05)

  it('enforces a floor of 1.05× the Prospector cost on the first mission, so it alone covers the mandatory purchase gating M2', () => {
    expect(calibrateOnboardingPayout(0, 0)).toBe(floor1)
    expect(calibrateOnboardingPayout(floor1 - 1, 0)).toBe(floor1)
    expect(floor1).toBeGreaterThan(ONBOARDING_ROCKET_COST)
  })

  it('does not reduce a first-mission payout already above the floor', () => {
    expect(calibrateOnboardingPayout(floor1 + 100_000, 0)).toBe(floor1 + 100_000)
  })

  it('enforces a floor of 1.05× the Prospector cost on the second mission', () => {
    expect(calibrateOnboardingPayout(0, 1)).toBe(floor2)
    expect(calibrateOnboardingPayout(floor2 - 1, 1)).toBe(floor2)
  })

  it('does not reduce a second-mission payout already above the floor', () => {
    expect(calibrateOnboardingPayout(floor2 + 100_000, 1)).toBe(floor2 + 100_000)
  })

  it('leaves payouts unchanged for missions after the second', () => {
    expect(calibrateOnboardingPayout(999, 2)).toBe(999)
    expect(calibrateOnboardingPayout(999, 10)).toBe(999)
  })
})

describe('seed bible v0 catalog', () => {
  it('defines twelve mechanical client slots at the spec unlock tiers', () => {
    expect(CLIENT_SLOTS).toHaveLength(12)
    expect(CLIENT_SLOTS.map(c => c.unlockTier)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5])
    expect(CLIENT_SLOTS.every(c => !c.name.startsWith('Client Slot'))).toBe(true)
    expect(CLIENT_SLOTS.every(c => c.mineralPreferences.length > 0)).toBe(true)
    expect(CLIENT_SLOTS.every(c => c.payoutPremium >= 0.18)).toBe(true)
  })

  it('seeds the three Sprint 5 Free Ops clients at L1', () => {
    const l1Clients = CLIENT_SLOTS.filter(c => c.unlockTier === 1)
    expect(l1Clients.map(c => c.name)).toEqual([
      'Helios Propulsion Depot',
      'Arcturus Battery Systems',
      'Ferrum Orbital Construction',
    ])
    expect(l1Clients.map(c => c.mineralPreferences)).toEqual([
      ['platinum', 'palladium'],
      ['palladium', 'iridium'],
      ['platinum', 'iridium'],
    ])
  })

  it('includes the Sprint 5 mineral taxonomy without dropping onboarding minerals', () => {
    expect(Object.keys(MINERAL_META)).toEqual(expect.arrayContaining([
      'gold', 'uranium', 'cobalt', 'copper', 'aluminium', 'hydrogen',
      'iron', 'silicon', 'carbon', 'ice', 'nickel',
    ]))
  })

  it('defines six refined mineral recipes that are worth running', () => {
    // Every recipe used to destroy value: 3 gold (₣2,400 of ore) refined into
    // one output worth ₣1,760, on top of a ₣100,000 cycle fee. Refining now
    // returns REFINING_VALUE_MULTIPLIER on the ore it consumes, so the output
    // clears both the input and the fee.
    expect(REFINERY_RECIPES).toHaveLength(6)
    for (const recipe of REFINERY_RECIPES) {
      const inputValue = MINERAL_META[recipe.input.mineral].price * recipe.input.amount
      expect(recipe.output.name).toBe(`Refined ${MINERAL_META[recipe.input.mineral].name}`)
      expect(recipe.output.price).toBeCloseTo(inputValue * REFINING_VALUE_MULTIPLIER, -1)
      expect(recipe.output.price - inputValue - recipe.cost).toBeGreaterThan(0)
    }
  })

  it('defines the Refinery structure seed data with Francs and material costs (KES-283)', () => {
    const refinery = STRUCTURES.find(structure => structure.id === 'refinery')
    expect(refinery).toMatchObject({
      kind: 'refinery',
      cost: STRUCTURE_PRICES.refinery,
      costMaterials: { aluminium: 20, copper: 10 },
      unlockTrigger: 'free-operations',
    })
    // KES-283: a normal Earth Base plot purchase available once Free
    // Operations begins — same unlock shape as the Surface Silo. The prior
    // off-world site-commissioning path (KES-286) is retired: no mission ever
    // satisfied its unlock condition, so it was permanently unreachable.
    expect(refinery && structureUnlocked(refinery, { placed: [] })).toBe(false)
    expect(refinery && structureUnlocked(refinery, { freeOperations: true })).toBe(true)
    expect(refinery && structureUnlocked(refinery, { placed: ['refinery'] })).toBe(true)
    expect(refinery && canAffordStructure(refinery, {
      francs: STRUCTURE_PRICES.refinery,
      stash: { aluminium: 20, copper: 10 },
    })).toBe(true)
  })

  it('keeps Landnam targets to real solar-system bodies for the seed catalog', () => {
    const blocked = ['tess-451b', 'koi-7923-belt']
    expect(TARGETS.map(t => t.id)).not.toEqual(expect.arrayContaining(blocked))
  })

  it('builds resource-collection missions from mission templates', () => {
    const generated = MISSIONS.filter(m => m.id.startsWith('generated-'))
    expect(MISSION_TEMPLATES.every(t => t.mineralKeys.length > 0)).toBe(true)
    expect(MISSION_TEMPLATES.map(t => t.id)).toEqual(expect.arrayContaining([
      'freeops-delivery',
      'freeops-mining-survey',
      'freeops-bulk-run',
      'freeops-station-scan',
      'freeops-rover-landing',
    ]))
    // Generated missions must map to a known template tag
    expect(generated.every(m => MISSION_TEMPLATES.some(t => t.tag === m.tag))).toBe(true)
    expect(generated.filter(m => m.sequence === 1).length).toBeGreaterThan(1)
    expect(generated.filter(m => m.sequence === 2).length).toBeGreaterThan(1)
    expect(generated.every(m => {
      const client = CLIENT_SLOTS.find(c => c.id === m.client)
      return client && client.unlockTier <= m.sequence
    })).toBe(true)
  })

  it('defines Sprint 6 survey templates for station scans and starter rover landing', () => {
    const stationScan = MISSION_TEMPLATES.find(t => t.id === 'freeops-station-scan')
    expect(stationScan?.survey).toMatchObject({
      scanRequired: true,
      scanCount: 3,
      scanSource: 'station',
      depositsToMap: 2,
      revealsMinerals: true,
      unlocksLanding: true,
    })

    const roverLanding = MISSION_TEMPLATES.find(t => t.id === 'freeops-rover-landing')
    expect(roverLanding?.survey).toMatchObject({
      scanRequired: true,
      scanSource: 'rover',
      onWorldVehicle: 'starter-rover',
      anyTargetType: true,
      unlocksLanding: true,
    })
  })

  it('generates 0-2 Free Ops missions per starting client after M3', () => {
    const missions = generateFreeOpsMissions()
    const startingClientIds = CLIENT_SLOTS.filter(c => c.unlockTier === 1).map(c => c.id)
    expect(new Set(missions.map(m => m.client))).toEqual(new Set(startingClientIds))
    for (const clientId of startingClientIds) {
      const offers = missions.filter(m => m.client === clientId)
      expect(offers.length).toBeGreaterThanOrEqual(0)
      expect(offers.length).toBeLessThanOrEqual(2)
    }
    expect(missions.every(m => m.sequence === FREE_OPS_START_MISSIONS_DONE + 1)).toBe(true)
    expect(missions.every(m => compatibleTargetsFor(m, TARGETS).length > 0)).toBe(true)
  })

  it('authored M3 is a two-client transport-job choice, not self-directed mining', () => {
    const authored = MISSIONS.filter(m => !m.id.startsWith('generated-'))
    expect(authored.length).toBeGreaterThan(0)
    expect(authored.every(m => m.id && m.title)).toBe(true)
    const m3Missions = authored.filter(m => m.sequence === 3)
    expect(m3Missions.length).toBe(2)
    for (const m3 of m3Missions) {
      expect(m3.client).toBeDefined()
      expect(m3.targetId).toBeDefined()
      expect(m3.deliveryTargetId).toBeDefined()
      expect(TARGETS.some(t => t.id === m3.targetId)).toBe(true)
      expect(TARGETS.some(t => t.id === m3.deliveryTargetId)).toBe(true)
      expect(CLIENT_SLOTS.some(c => c.id === m3.client)).toBe(true)
    }
    // No generic generated missions leak into the curated M3 slot.
    expect(MISSIONS.some(m => m.id.startsWith('generated-') && m.sequence === 3)).toBe(false)
  })

  it('Free Ops self-directed mining mission has no client and reachable requirements', () => {
    const selfDirected = MISSIONS.find(m => m.id === SELF_DIRECTED_MINING_MISSION_ID)
    expect(selfDirected).toBeDefined()
    expect(selfDirected?.client).toBeUndefined()
    expect(selfDirected?.targetId).toBeUndefined()
    expect(selfDirected?.sequence).toBe(FREE_OPS_START_MISSIONS_DONE + 1)
    const compatible = compatibleTargetsFor(selfDirected!, TARGETS)
    expect(compatible.length).toBeGreaterThan(0)
  })

  it('authored relay mission is a two-leg mine-then-deliver job with a real client', () => {
    const relay = MISSIONS.find(m => m.id === 'lnm_relay_psyche_ceres')
    expect(relay).toBeDefined()
    expect(relay?.client).toBe('kepler-materials')
    expect(relay?.targetId).toBe('psyche')
    expect(relay?.deliveryTargetId).toBe('ceres')
    expect(TARGETS.some(t => t.id === relay?.targetId)).toBe(true)
    expect(TARGETS.some(t => t.id === relay?.deliveryTargetId)).toBe(true)
    expect(CLIENT_SLOTS.some(c => c.id === relay?.client)).toBe(true)
  })

  it('defines remote-silo, refinery, and scanning-station builds as own-program missions', () => {
    expect(OWN_PROGRAM_BUILD_MISSIONS.map(mission => mission.id)).toEqual([
      'program-build-remote-silo',
      'program-build-refinery',
      'program-build-scan-station',
    ])

    for (const mission of OWN_PROGRAM_BUILD_MISSIONS) {
      expect(mission.client).toBeUndefined()
      expect(mission.payout).toEqual({ francs: 0, affinity: 0 })
      expect(mission.programReward?.researchXP).toBe(0)
      expect(mission.construction?.structureKind).toBeTruthy()
      expect(mission.construction?.requiredMaterials).toEqual(mission.requires.minerals)
      expect(mission.requires.cargo_min).toBe(
        Object.values(mission.requires.minerals).reduce((sum, amount) => sum + amount, 0),
      )
      // The remote silo and off-world refinery are commissioned at a site the
      // player owns or leases (max_orbit: 5); the scan station stays Earth-based.
      expect(mission.requires.max_orbit).toBe(mission.id === 'program-build-scan-station' ? 0 : 5)
      expect(mission.sequence).toBe(FREE_OPS_START_MISSIONS_DONE + 1)
      expect(MISSIONS).toContainEqual(mission)
    }

    expect(OWN_PROGRAM_BUILD_MISSIONS[0]).toMatchObject({
      construction: { structureKind: 'mineral-silo' },
    })
    expect(OWN_PROGRAM_BUILD_MISSIONS[1]).toMatchObject({
      construction: { structureKind: 'refinery', requiredMaterials: { aluminium: 20, copper: 10 } },
    })
    expect(OWN_PROGRAM_BUILD_MISSIONS[2]).toMatchObject({
      construction: { structureKind: 'scan-station', requiredMaterials: {} },
    })
  })
})

describe('Construction mission templates and target structure blueprints', () => {
  it('defines three Sprint 6 construction templates (fuel-depot, battery-station, fabrication-pad)', () => {
    const constructTemplates = MISSION_TEMPLATES.filter(t => t.tag === 'CONSTRUCT')
    expect(constructTemplates.map(t => t.id)).toEqual(
      expect.arrayContaining(['construct-fuel-depot', 'construct-battery-station', 'construct-fabrication-pad'])
    )
  })

  it('construction templates carry a construction plan with structureKind, materials, and buildTimeMs', () => {
    const fuelDepot = MISSION_TEMPLATES.find(t => t.id === 'construct-fuel-depot')
    expect(fuelDepot?.construction).toMatchObject({
      structureKind: 'fuel-depot',
      placementMode: 'confirm',
      buildTimeMs: 20 * 60 * 1000,
    })
    expect(fuelDepot?.construction?.requiredMaterials).toMatchObject({ hydrogen: 8, aluminium: 6 })
  })

  it('TARGET_STRUCTURES covers all three client archetypes', () => {
    const roles = TARGET_STRUCTURES.map(s => s.clientRole)
    expect(roles).toEqual(expect.arrayContaining(['prospect', 'command', 'bulk']))
  })

  it('TARGET_STRUCTURES entries have required fields and valid build times', () => {
    for (const s of TARGET_STRUCTURES) {
      expect(s.id).toBeTruthy()
      expect(s.buildTimeMs).toBeGreaterThan(0)
      expect(Object.keys(s.requiredMaterials).length).toBeGreaterThan(0)
    }
  })

  it('findTargetStructure resolves a known structure kind', () => {
    const depot = findTargetStructure('fuel-depot')
    expect(depot?.name).toBe('Fuel Depot')
    expect(findTargetStructure('nonexistent')).toBeUndefined()
  })
})

describe('Scanning station constants and structure seed', () => {
  it('exports expected scan constants', () => {
    expect(SCANS_PER_DAY).toBe(5)
    expect(SCAN_DURATION_MS).toBe(10 * 60 * 1000)
    expect(SCANS_REQUIRED_TO_MAP).toBe(3)
  })

  it('stays dark regardless of Free Ops when NEXT_PUBLIC_FEATURE_SCAN_STATION is unset', () => {
    const scanner = STRUCTURES.find(s => s.id === 'scan-station')
    expect(scanner).toBeDefined()
    expect(scanner?.cost).toBe(0)
    expect(scanner && structureUnlocked(scanner, { freeOperations: false })).toBe(false)
    expect(scanner && structureUnlocked(scanner, { freeOperations: true })).toBe(false)
  })

  it('scan-station is not unlocked for launchpad-only context', () => {
    const scanner = STRUCTURES.find(s => s.id === 'scan-station')
    expect(scanner && structureUnlocked(scanner, { placed: ['launchpad'] })).toBe(false)
  })

  it('requires the story-scan-station-commission mission before unlocking, even with the flag and Free Ops on (KES-132)', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_SCAN_STATION', 'true')
    vi.resetModules()
    const { STRUCTURES: freshStructures, structureUnlocked: freshUnlocked } = await import('./data')
    const scanner = freshStructures.find(s => s.id === 'scan-station')
    expect(scanner && freshUnlocked(scanner, { freeOperations: false })).toBe(false)
    expect(scanner && freshUnlocked(scanner, { freeOperations: true })).toBe(false)
    expect(scanner && freshUnlocked(scanner, { freeOperations: true, scanStationMissionCompletedAt: Date.now() })).toBe(true)
    expect(scanner && freshUnlocked(scanner, { placed: ['scan-station'] })).toBe(true)
    vi.unstubAllEnvs()
    vi.resetModules()
  })

})

describe('Daily quest framework', () => {
  it('exports at least one scan, land, and map quest template', () => {
    const kinds = DAILY_QUEST_TEMPLATES.map(q => q.kind)
    expect(kinds).toContain('scan')
    expect(kinds).toContain('land')
    expect(kinds).toContain('map')
  })

  it('getDailyQuestTemplate resolves by id', () => {
    const q = getDailyQuestTemplate('daily-scan-5-asteroids')
    expect(q).toBeDefined()
    expect(q?.count).toBe(5)
    expect(q?.targetScope).toBe('any-asteroid')
    expect(getDailyQuestTemplate('nonexistent')).toBeUndefined()
  })

  it('all quest templates have positive payout', () => {
    for (const q of DAILY_QUEST_TEMPLATES) {
      expect(q.payout.francs).toBeGreaterThan(0)
      expect(q.payout.affinity).toBeGreaterThan(0)
    }
  })

  it('todayKey returns an ISO date string', () => {
    const key = todayKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('TESS live subject filtering', () => {
  const baseSubject = {
    id: 'pb-subject-1',
    tic_id: '123456789',
    toi_id: '1234.01',
    sectors: 'Sector 9',
    subject_type: 'transit',
    lightcurve_points: [{ x: 0, y: 1 }, { x: 1, y: 0.998 }],
    period_days: 2.4,
    depth_pct: 0.12,
    gold_label: '',
    consensus: '',
  }

  it('allows only unresolved transit subjects for player review', () => {
    expect(isReviewableTessSubject(baseSubject)).toBe(true)
    expect(isReviewableTessSubject({ ...baseSubject, subject_type: 'rv' })).toBe(false)
    expect(isReviewableTessSubject({ ...baseSubject, gold_label: 'planet' })).toBe(false)
    expect(isReviewableTessSubject({ ...baseSubject, gold_label: 'not_planet' })).toBe(false)
    expect(isReviewableTessSubject({ ...baseSubject, consensus: 'planet' })).toBe(false)
    expect(isReviewableTessSubject({ ...baseSubject, consensus: 'not_planet' })).toBe(false)
    expect(isReviewableTessSubject({ ...baseSubject, tfopwg_disp: 'KP' })).toBe(false)
    expect(isReviewableTessSubject({ ...baseSubject, tfopwg_disp: 'CP' })).toBe(false)
    expect(isReviewableTessSubject({ ...baseSubject, tfopwg_disp: 'FP' })).toBe(false)
  })

  it('maps live subject records into TESS candidates with lightcurve points', () => {
    const candidate = toTessCandidate(baseSubject)

    expect(candidate.id).toBe('pb-subject-1')
    expect(candidate.ticId).toBe('TIC 123456789')
    expect(candidate.toi).toBe('TOI 1234.01')
    expect(candidate.periodDays).toBe(2.4)
    expect(candidate.depthPpm).toBe(1200)
    expect(candidate.lightcurvePoints).toEqual([{ x: 0, y: 1 }, { x: 1, y: 0.998 }])
  })

  it('selects a stable daily subset of live TESS candidates', () => {
    const candidates = Array.from({ length: 6 }, (_, index) => toTessCandidate({
      ...baseSubject,
      id: `subject-${index}`,
      tic_id: `${123456780 + index}`,
      toi_id: `12${index}.01`,
    }))

    const dayOne = dailyTessCandidates(candidates, '2026-07-02', 1)
    const dayOneRepeat = dailyTessCandidates(candidates, '2026-07-02', 1)
    const dayTwo = dailyTessCandidates(candidates, '2026-07-03', 1)

    expect(dayOne).toHaveLength(1)
    expect(dayOne.map(candidate => candidate.id)).toEqual(dayOneRepeat.map(candidate => candidate.id))
    expect(dayOne.map(candidate => candidate.id)).not.toEqual(dayTwo.map(candidate => candidate.id))
  })

  it('scales the daily downlink by station or telescope level', () => {
    const candidates = Array.from({ length: 9 }, (_, index) => toTessCandidate({
      ...baseSubject,
      id: `scaled-subject-${index}`,
      tic_id: `${223456780 + index}`,
      toi_id: `22${index}.01`,
    }))

    expect(dailyTessCandidates(candidates, '2026-07-02', 1)).toHaveLength(1)
    expect(dailyTessCandidates(candidates, '2026-07-02', 3)).toHaveLength(3)
    expect(dailyTessCandidates(candidates, '2026-07-02', 5)).toHaveLength(5)
  })

  it('includes the satellite-pointing choice before filling the daily downlink', () => {
    const candidates = Array.from({ length: 5 }, (_, index) => toTessCandidate({
      ...baseSubject,
      id: `preferred-subject-${index}`,
      tic_id: `${323456780 + index}`,
      toi_id: `32${index}.01`,
    }))

    const daily = dailyTessCandidates(candidates, '2026-07-02', 3, 'preferred-subject-4')

    expect(daily).toHaveLength(3)
    expect(daily[0]?.id).toBe('preferred-subject-4')
    expect(new Set(daily.map(candidate => candidate.id))).toHaveProperty('size', 3)
  })

  it('converts planet classifications into star-map exoplanet targets with a real archetype and minerals', () => {
    const target = tessCandidateToExoplanetTarget(toTessCandidate(baseSubject))

    expect(target.id).toBe('exo-pb-subject-1')
    expect(target.type).toBe('exoplanet')
    expect(target.name).toBe('TOI 1234.01')
    expect(target.brief).toContain('star map')
    expect(target.archetype).toBeDefined()
    expect(target.minerals.length).toBeGreaterThan(0)
    for (const mineral of target.minerals) {
      expect(MINERAL_META[mineral]).toBeDefined()
    }
  })

  it('reads st_teff from the subject record and falls back to SUN_TEFF_K when absent', () => {
    expect(toTessCandidate({ ...baseSubject, st_teff: 9500 }).starTeffK).toBe(9500)
    expect(toTessCandidate(baseSubject).starTeffK).toBeUndefined()
    expect(tessCandidateToExoplanetTarget(toTessCandidate(baseSubject)).archetype)
      .toBe(archetypeForDiscovery(toTessCandidate(baseSubject).periodDays, SUN_TEFF_K))
  })

  it('prefers the player-measured period over the candidate\'s catalog period', () => {
    const candidate = toTessCandidate({ ...baseSubject, period_days: 2.4, st_teff: 9500 }) // hot host
    const shortMeasured = tessCandidateToExoplanetTarget(candidate, 3) // still close-in -> M
    const longMeasured = tessCandidateToExoplanetTarget(candidate, 300) // now long-period -> gas-giant
    expect(shortMeasured.archetype).toBe('M')
    expect(longMeasured.archetype).toBe('gas-giant')
  })
})

describe('archetypeForDiscovery', () => {
  it('maps close-in worlds to M around hot hosts and C around cool hosts', () => {
    expect(archetypeForDiscovery(2, 9500)).toBe('M')
    expect(archetypeForDiscovery(2, 4500)).toBe('C')
  })

  it('maps long-period worlds to gas-giant around hot hosts and icy around cool hosts', () => {
    expect(archetypeForDiscovery(400, 9500)).toBe('gas-giant')
    expect(archetypeForDiscovery(400, 4500)).toBe('icy')
  })

  it('maps mid-period worlds to S around hot hosts and icy around cool hosts', () => {
    expect(archetypeForDiscovery(50, 9500)).toBe('S')
    expect(archetypeForDiscovery(50, 4500)).toBe('icy')
  })
})

describe('spectralClassForTeff', () => {
  it('classifies real reference temperatures onto standard spectral boundaries', () => {
    expect(spectralClassForTeff(3000)).toBe('M') // red dwarf
    expect(spectralClassForTeff(SUN_TEFF_K)).toBe('G') // Sun
    expect(spectralClassForTeff(9500)).toBe('A') // Sirius-class
    expect(spectralClassForTeff(35000)).toBe('O') // blue giant
  })
})
