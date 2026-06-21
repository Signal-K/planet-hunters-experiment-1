// Landnam game data — generated mission fallback

import type { Mission, MissionTemplate } from './types'
import { CONTRACTOR_SLOTS, contractorPayoutMultiplier } from './contractors'
import { MINERAL_META } from './minerals'

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'starter-bulk', tag: 'STARTER', difficulty: 'L1', mineralKeys: ['iron', 'silicon', 'carbon'], cargoRange: [4, 8], drillTierMin: 1, orbitMax: 4, payoutMultiplier: 1.0, contractorRole: 'starter', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'volatile-bulk', tag: 'BULK', difficulty: 'L2', mineralKeys: ['ice', 'carbon', 'silicon'], cargoRange: [8, 14], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.35, contractorRole: 'bulk', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'metal-prospect', tag: 'PROSPECT', difficulty: 'L2', mineralKeys: ['nickel', 'cobalt', 'gold'], cargoRange: [3, 8], drillTierMin: 2, orbitMax: 5, payoutMultiplier: 2.25, contractorRole: 'prospect', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'command-reserve', tag: 'COMMAND', difficulty: 'L3', mineralKeys: ['gold', 'rare', 'cobalt'], cargoRange: [3, 6], drillTierMin: 2, orbitMax: 6, payoutMultiplier: 3.5, contractorRole: 'command', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
]

const ONBOARDING_SEQUENCE_COUNT = 2
export const OFFLINE_MISSION_COUNT = 12

interface MissionComplexity {
  sequence: number
  templateId: string
  mineralCount: number
  amountBias: number
  contractorOffset: number
}

const COMPLEXITY_BANDS: MissionComplexity[] = [
  { sequence: 1, templateId: 'starter-bulk', mineralCount: 1, amountBias: 0, contractorOffset: 0 },
  { sequence: 1, templateId: 'starter-bulk', mineralCount: 1, amountBias: 1, contractorOffset: 1 },
  { sequence: 1, templateId: 'volatile-bulk', mineralCount: 1, amountBias: 0, contractorOffset: 2 },
  { sequence: 2, templateId: 'starter-bulk', mineralCount: 1, amountBias: 2, contractorOffset: 3 },
  { sequence: 2, templateId: 'volatile-bulk', mineralCount: 1, amountBias: 2, contractorOffset: 4 },
  { sequence: 2, templateId: 'metal-prospect', mineralCount: 1, amountBias: 0, contractorOffset: 5 },
  { sequence: 3, templateId: 'volatile-bulk', mineralCount: 2, amountBias: 1, contractorOffset: 6 },
  { sequence: 3, templateId: 'metal-prospect', mineralCount: 2, amountBias: 1, contractorOffset: 7 },
  { sequence: 3, templateId: 'command-reserve', mineralCount: 1, amountBias: 0, contractorOffset: 8 },
  { sequence: 4, templateId: 'metal-prospect', mineralCount: 2, amountBias: 2, contractorOffset: 9 },
  { sequence: 4, templateId: 'command-reserve', mineralCount: 2, amountBias: 1, contractorOffset: 0 },
  { sequence: 4, templateId: 'command-reserve', mineralCount: 3, amountBias: 2, contractorOffset: 1 },
]

const MINERAL_LABELS: Record<string, string> = {
  iron: 'Iron',
  silicon: 'Silicon',
  carbon: 'Carbon',
  ice: 'Volatile',
  nickel: 'Nickel',
  cobalt: 'Cobalt',
  gold: 'Gold',
  rare: 'Xenon',
}

function selectMinerals(template: MissionTemplate, preferences: string[], index: number, count: number): string[] {
  const preferred = template.mineralKeys.filter(mineral => preferences.includes(mineral))
  const remaining = template.mineralKeys.filter(mineral => !preferences.includes(mineral))
  const candidates = [...preferred, ...remaining]
  return Array.from({ length: count }, (_, offset) => candidates[(index + offset) % candidates.length])
}

function amountFor(template: MissionTemplate, sequence: number, amountBias: number, mineralIndex: number): number {
  const [min, max] = template.cargoRange
  const span = max - min + 1
  const raw = min + ((sequence + amountBias + mineralIndex * 2) % span)
  return Math.min(max, raw + Math.max(0, sequence - ONBOARDING_SEQUENCE_COUNT))
}

export function generateMissions(count = OFFLINE_MISSION_COUNT): Mission[] {
  return COMPLEXITY_BANDS.slice(0, count).map((band, index) => {
    const template = MISSION_TEMPLATES.find(t => t.id === band.templateId) ?? MISSION_TEMPLATES[0]
    const unlockedContractors = CONTRACTOR_SLOTS.filter(c => c.unlockTier <= band.sequence)
    const contractorPool = unlockedContractors.filter(c => c.uiRole === template.contractorRole)
    const fallbackPool = contractorPool.length > 0 ? contractorPool : unlockedContractors
    const contractor = fallbackPool[band.contractorOffset % fallbackPool.length] ?? CONTRACTOR_SLOTS[0]
    const minerals = Object.fromEntries(
      selectMinerals(template, contractor.mineralPreferences, index, band.mineralCount).map((mineral, mineralIndex) => [
        mineral,
        amountFor(template, band.sequence, band.amountBias, mineralIndex),
      ])
    )
    const cargoMin = Object.values(minerals).reduce((sum, amount) => sum + amount, 0)
    const mineralNames = Object.keys(minerals).map(mineral => MINERAL_LABELS[mineral] ?? MINERAL_META[mineral]?.name ?? mineral)
    const primary = mineralNames.join(' + ')
    const francs = Object.entries(minerals).reduce(
      (sum, [mineral, amount]) => sum + (MINERAL_META[mineral]?.price ?? 0) * amount * 1500 * template.payoutMultiplier * contractorPayoutMultiplier(contractor),
      0
    )

    return {
      id: `generated-s${band.sequence}-${template.id}-${index + 1}`,
      title: `${primary} ${template.tag.toLowerCase().replace('-', ' ')} order`,
      brief: `${contractor.name} needs ${primary.toLowerCase()} for ${contractor.projectType.toLowerCase()}. Preferred cargo earns a contractor premium; affinity improves future payouts.`,
      contractor: contractor.id,
      tag: template.tag,
      difficulty: template.difficulty,
      locked: false,
      sequence: band.sequence,
      unlockAt: band.sequence > 1 ? `Complete ${band.sequence - 1} contract${band.sequence > 2 ? 's' : ''}` : undefined,
      requires: {
        minerals,
        cargo_min: cargoMin,
        drill_tier: template.drillTierMin,
        max_orbit: template.orbitMax,
      },
      payout: {
        francs: Math.round(francs),
        affinity: Math.max(4, Math.round(6 + band.sequence * 2 + cargoMin / 3)),
      },
    }
  })
}

export const AUTHORED_MISSIONS: Mission[] = [
  {
    id: 'lnm_m3_ore_delivery',
    title: 'Lutetia Survey Drop',
    brief: 'Kepler Materials needs a survey rover delivered to 21 Lutetia. Swap your mining laser for the Cargo Module, fly out, and collect a small ore sample on the way home.',
    contractor: 'kepler-materials',
    tag: 'DELIVERY',
    difficulty: 'L2',
    locked: false,
    sequence: 3,
    unlockAt: 'Complete 2 contracts',
    targetId: 'lutetia',
    payload: { type: 'rover', name: 'KI Survey Rover Mk1', cargoCost: 3 },
    requires: {
      minerals: { nickel: 2 },
      cargo_min: 4,
      drill_tier: 1,
      max_orbit: 7,
    },
    payout: {
      francs: 800_000,
      affinity: 18,
    },
  },
]

export const MISSIONS: Mission[] = [...generateMissions(), ...AUTHORED_MISSIONS]

// Baseline cost of assembling the starter SR1 rocket (hull-mk1 + ion-a1 + hand-drill).
// Used as the reference point for onboarding payout floors.
export const STARTER_ROCKET_COST = 500_000

/**
 * Ensures the first mission pays generously (floor at 1.5× rocket cost) and
 * early follow-up missions nudge toward a normal economy (1.15× target).
 *
 * @param rawNet - the raw payout before calibration
 * @param missionsDone - missions completed before this one
 */
export function calibrateOnboardingPayout(rawNet: number, missionsDone: number): number {
  if (missionsDone === 0) {
    return Math.max(rawNet, Math.round(STARTER_ROCKET_COST * 1.5))
  }
  if (missionsDone === 1) {
    const target = Math.round(STARTER_ROCKET_COST * 1.15)
    // Nudge toward target: average rawNet with the target floor rather than hard-snapping.
    return Math.max(rawNet, Math.round((rawNet + target) / 2))
  }
  return rawNet
}
