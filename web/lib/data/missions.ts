// Landnam game data — missions

import type { Mission, MissionTemplate } from './types'

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'starter-bulk', tag: 'STARTER', difficulty: 'L1', mineralKeys: ['iron', 'silicon', 'carbon'], cargoRange: [4, 8], drillTierMin: 1, orbitMax: 4, payoutMultiplier: 1.0, contractorRole: 'starter', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'volatile-bulk', tag: 'BULK', difficulty: 'L2', mineralKeys: ['ice', 'carbon', 'silicon'], cargoRange: [8, 14], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.35, contractorRole: 'bulk', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'metal-prospect', tag: 'PROSPECT', difficulty: 'L2', mineralKeys: ['nickel', 'cobalt', 'gold'], cargoRange: [3, 8], drillTierMin: 2, orbitMax: 5, payoutMultiplier: 2.25, contractorRole: 'prospect', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'command-reserve', tag: 'COMMAND', difficulty: 'L3', mineralKeys: ['gold', 'rare', 'cobalt'], cargoRange: [3, 6], drillTierMin: 2, orbitMax: 6, payoutMultiplier: 3.5, contractorRole: 'command', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
]

const SEED_MINERAL_PRICES: Record<string, number> = {
  iron: 120,
  silicon: 180,
  carbon: 60,
  ice: 90,
  nickel: 150,
  cobalt: 450,
  gold: 800,
  rare: 2000,
}

interface ResourceMissionSeed {
  id: string
  title: string
  brief: string
  contractor: string
  template: string
  sequence: number
  minerals: Record<string, number>
  locked: boolean
  unlockAt?: string
  affinity: number
}

const RESOURCE_MISSION_SEEDS: ResourceMissionSeed[] = [
  { id: 'm1-iron', title: 'Iron Reserve Order', brief: 'Contractor Slot 03A needs a starter iron shipment from a reachable asteroid.', contractor: 'contractor-03a', template: 'starter-bulk', sequence: 1, minerals: { iron: 6 }, locked: false, affinity: 10 },
  { id: 'm2-silicon', title: 'Silicon Bulk Order', brief: 'Contractor Slot 03B needs raw silicon for electronics-grade supply contracts.', contractor: 'contractor-03b', template: 'volatile-bulk', sequence: 2, minerals: { silicon: 8 }, locked: false, unlockAt: 'Complete M1', affinity: 8 },
  { id: 'm3-nickel-cobalt', title: 'Nickel-Cobalt Assay', brief: 'Contractor Slot 04A wants battery metals from confirmed belt targets only.', contractor: 'contractor-04a', template: 'metal-prospect', sequence: 3, minerals: { nickel: 4, cobalt: 2 }, locked: true, unlockAt: 'Complete M2', affinity: 15 },
  { id: 'm4-gold-reserve', title: 'Gold Reserve Run', brief: 'Contractor Slot 04B has a premium gold order from the main belt.', contractor: 'contractor-04b', template: 'command-reserve', sequence: 4, minerals: { gold: 4 }, locked: true, unlockAt: 'Complete M3', affinity: 20 },
]

function buildResourceMission(seed: ResourceMissionSeed): Mission {
  const template = MISSION_TEMPLATES.find(t => t.id === seed.template) ?? MISSION_TEMPLATES[0]
  const cargoMin = Object.values(seed.minerals).reduce((sum, amount) => sum + amount, 0)
  const francs = Object.entries(seed.minerals).reduce(
    (sum, [mineral, amount]) => sum + (SEED_MINERAL_PRICES[mineral] ?? 0) * amount * 1500 * template.payoutMultiplier,
    0
  )

  return {
    id: seed.id,
    title: seed.title,
    brief: seed.brief,
    contractor: seed.contractor,
    tag: template.tag,
    difficulty: template.difficulty,
    locked: seed.locked,
    sequence: seed.sequence,
    unlockAt: seed.unlockAt,
    requires: {
      minerals: seed.minerals,
      cargo_min: cargoMin,
      drill_tier: template.drillTierMin,
      max_orbit: template.orbitMax,
    },
    payout: { francs, affinity: seed.affinity },
  }
}

export const MISSIONS: Mission[] = RESOURCE_MISSION_SEEDS.map(buildResourceMission)
