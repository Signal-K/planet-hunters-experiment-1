// Landnam game data — rocket parts

import type { Part, Mission, Target, RocketConfig, BuildCheck } from './types'
import { effectiveCargoCapacity, effectiveMaxOrbit } from './skills'

export const PARTS: { chassis: Part[]; propulsion: Part[]; drill: Part[] } = {
  chassis: [
    { id: 'hull-mk1', name: 'Hull MK1', tier: 1, locked: false, img: '/parts/starter_rocket_t1.png', mass: 2, cargo: 6 },
    { id: 'hull-mk2', name: 'Prospector Unibody Frame', tier: 2, locked: false, img: '/parts/reinforced_hull_t2.png', mass: 3, cargo: 10, missionsRequired: 1 },
    { id: 'hull-cargo', name: 'Cargo Bay T1', tier: 1, locked: false, img: '/parts/cargo_bay_t1.png', mass: 2, cargo: 14, missionsRequired: 1 },
    { id: 'hull-mk3', name: 'Hull MK3 – Heavy Frame', tier: 3, locked: true, img: '/parts/hull_mk3_heavy_t3.png', mass: 4, cargo: 18, missionsRequired: 2 },
    { id: 'hull-hauler', name: 'Bulk Hauler Chassis', tier: 3, locked: true, img: '/parts/bulk_hauler_t3.png', mass: 3, cargo: 24, missionsRequired: 2 },
  ],
  propulsion: [
    { id: 'ion-a1', name: 'Ion Drive A1', tier: 1, locked: false, img: '/parts/basic_thruster_t1.png', power: 40, max_orbit: 5 },
    { id: 'fusion-b2', name: 'Fusion Drive B2', tier: 2, locked: false, img: '/parts/fusion_drive_t2.png', power: 80, max_orbit: 7, missionsRequired: 1 },
    { id: 'ion-a3', name: 'Ion Drive A3', tier: 3, locked: true, img: '/parts/ion_drive_t3.png', power: 120, max_orbit: 9, missionsRequired: 2 },
  ],
  drill: [
    { id: 'hand-drill', name: 'Hand Drill', tier: 1, locked: false, img: '/parts/mining_drill_t1.png', rate: 1 },
    { id: 'laser-t2', name: 'Laser T2', tier: 2, locked: false, img: '/parts/laser_drill_t2.png', rate: 2, missionsRequired: 1 },
    { id: 'plasma-t3', name: 'Plasma T3', tier: 3, locked: true, img: '/parts/plasma_drill_t3.png', rate: 4, missionsRequired: 2 },
    // Cargo missions occupy the drill slot, but use the cargo-bay art. The
    // old drill-hand.png path never existed and silently rendered a broken
    // image in the Hangar/customiser.
    { id: 'cargo-module-t1', name: 'Cargo Module T1', tier: 1, locked: false, img: '/parts/cargo_bay_t1.png', rate: 0, missionsRequired: 2 },
  ],
}

export function suggestBuild(opts: {
  mission: Mission | null
  target: Target | null
  missionsDone: number
  launchpadUpgraded?: boolean
  parts?: typeof PARTS
  unlockedSkillNodes?: string[]
  // For two-leg "mine then deliver" missions — ensures the suggested
  // propulsion also reaches the delivery leg, not just the pickup target.
  deliveryTarget?: Target | null
}): RocketConfig {
  const { mission, target, parts = PARTS } = opts
  const infrastructureOrbitBonus = mission?.jointProject?.infrastructureOrbitBonus ?? 0
  const orbit = Math.max(
    0,
    Math.max(target?.orbit ?? 4, opts.deliveryTarget?.orbit ?? 0) - infrastructureOrbitBonus,
  )
  const drillTier = mission?.requires.drill_tier ?? 1
  const cargoMin = mission?.requires.cargo_min ?? 6
  const effectiveMissionsDone = opts.launchpadUpgraded ? Math.max(opts.missionsDone, 1) : opts.missionsDone

  const available = (p: Part) => {
    if (p.locked) return false
    if (p.missionsRequired && effectiveMissionsDone < p.missionsRequired) return false
    return true
  }
  const bestAvail = <T extends Part>(arr: T[]) => [...arr].reverse().find(p => available(p)) ?? arr[0]
  const prop = parts.propulsion.find(p => available(p) && effectiveMaxOrbit(p, opts.unlockedSkillNodes) >= orbit)
    ?? bestAvail(parts.propulsion)
  const drill = parts.drill.find(p => available(p) && (p.tier ?? 0) >= drillTier)
    ?? bestAvail(parts.drill)
  const chassis = parts.chassis.find(p => available(p) && effectiveCargoCapacity(p, opts.unlockedSkillNodes) >= cargoMin)
    ?? bestAvail(parts.chassis)

  return { chassis: chassis.id, propulsion: prop.id, drill: drill.id }
}

export function validateBuild(opts: {
  mission: Mission
  target: Target
  rocket: RocketConfig
  parts?: typeof PARTS
  unlockedSkillNodes?: string[]
}): BuildCheck {
  const { mission, target, rocket, parts = PARTS } = opts
  const chassis = parts.chassis.find(p => p.id === rocket.chassis) ?? parts.chassis[0]
  const propulsion = parts.propulsion.find(p => p.id === rocket.propulsion) ?? parts.propulsion[0]
  const drill = parts.drill.find(p => p.id === rocket.drill) ?? parts.drill[0]

  const problems: string[] = []
  const maxOrbit = effectiveMaxOrbit(propulsion, opts.unlockedSkillNodes)
  const infrastructureOrbitBonus = mission.jointProject?.infrastructureOrbitBonus ?? 0
  const requiredOrbit = Math.max(0, target.orbit - infrastructureOrbitBonus)
  if (maxOrbit < requiredOrbit) {
    problems.push(`Propulsion can only reach Orbit ${maxOrbit}, mission needs Orbit ${requiredOrbit}`)
  }
  const cargoCapacity = effectiveCargoCapacity(chassis, opts.unlockedSkillNodes)
  if (cargoCapacity < mission.requires.cargo_min) {
    problems.push(`Chassis cargo (${cargoCapacity}U) below mission minimum (${mission.requires.cargo_min}U)`)
  }
  // cargo-module-t1 is a valid drill-slot occupant (rate === 0 is intentional for cargo missions)
  if (drill.id !== 'cargo-module-t1' && (drill.tier ?? 0) < mission.requires.drill_tier) {
    problems.push(`Drill T${drill.tier} below mission requirement T${mission.requires.drill_tier}`)
  }

  return { chassis, propulsion, drill, ok: problems.length === 0, problems }
}
