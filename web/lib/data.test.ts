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
  STRUCTURES,
  TARGETS,
  PARTS,
  CONTRACTOR_SLOTS,
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
  getShipInteriorLayout,
  hasShipCustomizer,
  SKILL_NODES,
  getLaserChargeCap,
  REFINERY_RECIPES,
  refundCustomizerPart,
  selectedCustomizerPartIds,
  structureUnlocked,
  travelDurationMs,
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
  it('slots SR1 rooms into the cutaway container bounds', () => {
    const layout = getShipInteriorLayout('sr1')
    expect(layout?.containerSrc).toBe('/game/assets/ships/containers/sr1_cutaway.png')
    expect(layout?.slots.map(slot => slot.kind).sort()).toEqual(['booster', 'cockpit', 'engine', 'payload'])
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
    expect(CUSTOMIZER_BUILD_SEQUENCE.map(kind => CUSTOMIZER_PARTS.filter(part => part.kind === kind).length)).toEqual([2, 2, 2, 2])
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

  it('seeds the three Sprint 5 Free Ops contractors at L1', () => {
    const l1Contractors = CONTRACTOR_SLOTS.filter(c => c.unlockTier === 1)
    expect(l1Contractors.map(c => c.name)).toEqual([
      'Helios Propulsion Depot',
      'Arcturus Battery Systems',
      'Ferrum Orbital Construction',
    ])
    expect(l1Contractors.map(c => c.mineralPreferences)).toEqual([
      ['hydrogen'],
      ['cobalt', 'copper'],
      ['aluminium', 'copper'],
    ])
  })

  it('includes the Sprint 5 mineral taxonomy without dropping onboarding minerals', () => {
    expect(Object.keys(MINERAL_META)).toEqual(expect.arrayContaining([
      'gold', 'uranium', 'cobalt', 'copper', 'aluminium', 'hydrogen',
      'iron', 'silicon', 'carbon', 'ice', 'nickel',
    ]))
  })

  it('defines six refined mineral recipes at the locked multipliers', () => {
    const byInput = Object.fromEntries(REFINERY_RECIPES.map(recipe => [recipe.input.mineral, recipe]))
    const expected = {
      gold: 2.2,
      uranium: 2.5,
      cobalt: 1.9,
      copper: 1.7,
      aluminium: 1.6,
      hydrogen: 2.0,
    }
    for (const [mineral, multiplier] of Object.entries(expected)) {
      expect(byInput[mineral]?.output.name).toBe(`Refined ${MINERAL_META[mineral].name}`)
      expect(byInput[mineral]?.output.price).toBeCloseTo(MINERAL_META[mineral].price * multiplier)
    }
  })

  it('defines mission-triggered refinery structure seed data with Francs and material costs', () => {
    const refinery = STRUCTURES.find(structure => structure.id === 'refinery')
    expect(refinery).toMatchObject({
      kind: 'refinery',
      cost: 800_000_000,
      costMaterials: { aluminium: 20, copper: 10 },
      unlockTrigger: 'contractor-mission-trigger',
    })
    expect(refinery && structureUnlocked(refinery, { refineryUnlocked: false })).toBe(false)
    expect(refinery && structureUnlocked(refinery, { refineryUnlocked: true })).toBe(true)
    expect(refinery && canAffordStructure(refinery, {
      francs: 800_000_000,
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
      const contractor = CONTRACTOR_SLOTS.find(c => c.id === m.contractor)
      return contractor && contractor.unlockTier <= m.sequence
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

  it('generates 0-2 Free Ops missions per starting contractor after M3', () => {
    const missions = generateFreeOpsMissions()
    const startingContractorIds = CONTRACTOR_SLOTS.filter(c => c.unlockTier === 1).map(c => c.id)
    expect(new Set(missions.map(m => m.contractor))).toEqual(new Set(startingContractorIds))
    for (const contractorId of startingContractorIds) {
      const offers = missions.filter(m => m.contractor === contractorId)
      expect(offers.length).toBeGreaterThanOrEqual(0)
      expect(offers.length).toBeLessThanOrEqual(2)
    }
    expect(missions.every(m => m.sequence === FREE_OPS_START_MISSIONS_DONE + 1)).toBe(true)
    expect(missions.every(m => compatibleTargetsFor(m, TARGETS).length > 0)).toBe(true)
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

  it('TARGET_STRUCTURES covers all three contractor archetypes', () => {
    const roles = TARGET_STRUCTURES.map(s => s.contractorRole)
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

  it('defines a scan-station structure with free cost and freeOperations unlock', () => {
    const scanner = STRUCTURES.find(s => s.id === 'scan-station')
    expect(scanner).toBeDefined()
    expect(scanner?.cost).toBe(0)
    expect(scanner && structureUnlocked(scanner, { freeOperations: false })).toBe(false)
    expect(scanner && structureUnlocked(scanner, { freeOperations: true })).toBe(true)
  })

  it('scan-station is not unlocked for launchpad-only context', () => {
    const scanner = STRUCTURES.find(s => s.id === 'scan-station')
    expect(scanner && structureUnlocked(scanner, { placed: ['launchpad'] })).toBe(false)
  })
})
