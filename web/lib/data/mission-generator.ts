import type { ContractorSlot, MineralMeta, Mission, MissionTemplate } from './types'

export const FREE_OPS_START_MISSIONS_DONE = 3
export const ONBOARDING_SEQUENCE_COUNT = 2
export const OFFLINE_MISSION_COUNT = 12

export interface MissionComplexity {
  sequence: number
  templateId: string
  mineralCount: number
  amountBias: number
  contractorOffset: number
}

export interface MissionGeneratorInput {
  contractors: ContractorSlot[]
  minerals: Record<string, MineralMeta>
  templates?: MissionTemplate[]
  complexityBands?: MissionComplexity[]
}

export interface PocketBaseMissionTemplateSeed {
  slug: string
  tag: string
  difficulty: string
  mineral_keys: string[]
  cargo_min: number
  cargo_max: number
  drill_tier_min: number
  orbit_max: number
  payout_multiplier: number
  contractor_role: string
  payout_formula: string
  scan_required?: boolean
  scan_count?: number
  scan_source?: string
  deposits_to_map?: number
  reveals_minerals?: boolean
  reveals_landmarks?: string[]
  unlocks_landing?: boolean
  on_world_vehicle?: string
  on_world_any_target?: boolean
}

export interface PocketBaseMissionSeed {
  slug: string
  title: string
  brief: string
  contractor_slug: string
  tag: string
  difficulty: string
  locked: boolean
  sequence: number
  unlock_at: string
  requires_minerals: Record<string, number>
  requires_cargo_min: number
  requires_drill_tier: number
  requires_max_orbit: number
  payout_francs: number
  payout_affinity: number
}

const SCANNING_STATION_SURVEY = {
  scanRequired: true,
  scanCount: 3,
  scanSource: 'station',
  depositsToMap: 2,
  revealsMinerals: true,
  revealsLandmarks: ['crater field', 'high-albedo ridge'],
  unlocksLanding: true,
} satisfies MissionTemplate['survey']

const STARTER_ROVER_SURVEY = {
  scanRequired: true,
  scanCount: 1,
  scanSource: 'rover',
  depositsToMap: 1,
  revealsMinerals: true,
  revealsLandmarks: ['surface deposit'],
  unlocksLanding: true,
  onWorldVehicle: 'starter-rover',
  anyTargetType: true,
} satisfies MissionTemplate['survey']

export const DEFAULT_MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'starter-bulk', tag: 'STARTER', difficulty: 'L1', mineralKeys: ['iron', 'silicon', 'carbon'], cargoRange: [4, 8], drillTierMin: 1, orbitMax: 4, payoutMultiplier: 1.0, contractorRole: 'starter', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'volatile-bulk', tag: 'BULK', difficulty: 'L2', mineralKeys: ['ice', 'carbon', 'silicon'], cargoRange: [8, 14], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.35, contractorRole: 'bulk', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'metal-prospect', tag: 'PROSPECT', difficulty: 'L2', mineralKeys: ['nickel', 'cobalt', 'gold'], cargoRange: [3, 8], drillTierMin: 2, orbitMax: 5, payoutMultiplier: 2.25, contractorRole: 'prospect', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'command-reserve', tag: 'COMMAND', difficulty: 'L3', mineralKeys: ['gold', 'rare', 'cobalt'], cargoRange: [3, 6], drillTierMin: 2, orbitMax: 6, payoutMultiplier: 3.5, contractorRole: 'command', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'freeops-delivery', tag: 'DELIVERY', difficulty: 'L1', mineralKeys: ['hydrogen', 'cobalt', 'copper', 'aluminium'], cargoRange: [4, 10], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.25, contractorRole: 'starter', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'freeops-mining-survey', tag: 'SURVEY', difficulty: 'L1', mineralKeys: ['cobalt', 'copper', 'aluminium', 'gold'], cargoRange: [3, 7], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.55, contractorRole: 'prospect', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'freeops-bulk-run', tag: 'BULK', difficulty: 'L1', mineralKeys: ['hydrogen', 'aluminium', 'copper'], cargoRange: [8, 16], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.15, contractorRole: 'bulk', payoutFormula: 'mineral price * amount * 1500 * multiplier' },
  { id: 'freeops-station-scan', tag: 'SCAN', difficulty: 'L1', mineralKeys: ['cobalt', 'copper', 'aluminium', 'gold'], cargoRange: [0, 0], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 0.85, contractorRole: 'prospect', payoutFormula: 'scan fee + mapped deposit bonus', survey: SCANNING_STATION_SURVEY },
  { id: 'freeops-rover-landing', tag: 'ROVER', difficulty: 'L1', mineralKeys: ['cobalt', 'copper', 'aluminium', 'hydrogen'], cargoRange: [2, 5], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.7, contractorRole: 'starter', payoutFormula: 'mineral price * amount * 1500 * multiplier + landing bonus', survey: STARTER_ROVER_SURVEY },
]

export const DEFAULT_COMPLEXITY_BANDS: MissionComplexity[] = [
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
  copper: 'Copper',
  aluminium: 'Aluminium',
  hydrogen: 'Hydrogen',
  uranium: 'Uranium',
  gold: 'Gold',
  rare: 'Xenon',
}

function payoutMultiplier(contractor: ContractorSlot): number {
  return 1 + contractor.payoutPremium
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

export function generateMissionsFromRules(input: MissionGeneratorInput, count = OFFLINE_MISSION_COUNT): Mission[] {
  const templates = input.templates ?? DEFAULT_MISSION_TEMPLATES
  const bands = input.complexityBands ?? DEFAULT_COMPLEXITY_BANDS

  return bands.slice(0, count).map((band, index) => {
    const template = templates.find(t => t.id === band.templateId) ?? templates[0]
    const unlockedContractors = input.contractors.filter(c => c.unlockTier <= band.sequence)
    const contractorPool = unlockedContractors.filter(c => c.uiRole === template.contractorRole)
    const fallbackPool = contractorPool.length > 0 ? contractorPool : unlockedContractors
    const contractor = fallbackPool[band.contractorOffset % fallbackPool.length] ?? input.contractors[0]
    const minerals = Object.fromEntries(
      selectMinerals(template, contractor.mineralPreferences, index, band.mineralCount).map((mineral, mineralIndex) => [
        mineral,
        amountFor(template, band.sequence, band.amountBias, mineralIndex),
      ])
    )
    const cargoMin = Object.values(minerals).reduce((sum, amount) => sum + amount, 0)
    const mineralNames = Object.keys(minerals).map(mineral => MINERAL_LABELS[mineral] ?? input.minerals[mineral]?.name ?? mineral)
    const primary = mineralNames.join(' + ')
    const francs = Object.entries(minerals).reduce(
      (sum, [mineral, amount]) => sum + (input.minerals[mineral]?.price ?? 0) * amount * 1500 * template.payoutMultiplier * payoutMultiplier(contractor),
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
      survey: template.survey,
    }
  })
}

export function generateFreeOpsMissionsFromRules(input: MissionGeneratorInput): Mission[] {
  const templates = input.templates ?? DEFAULT_MISSION_TEMPLATES
  const freeOpsContractors = input.contractors.filter(c => c.unlockTier <= 1).slice(0, 3)
  const freeOpsTemplates = templates.filter(t => t.id.startsWith('freeops-'))

  return freeOpsContractors.flatMap((contractor, contractorIndex) => {
    const matchingTemplates = freeOpsTemplates
      .filter(template => template.contractorRole === contractor.uiRole)
      .slice(0, 2)

    return matchingTemplates.map((template, templateIndex) => {
      const mineral = template.mineralKeys.find(key => contractor.mineralPreferences.includes(key))
        ?? template.mineralKeys[(contractorIndex + templateIndex) % template.mineralKeys.length]
      const scanOnly = template.cargoRange[0] === 0 && template.cargoRange[1] === 0
      const amount = scanOnly ? 0 : template.cargoRange[0] + contractorIndex + templateIndex
      const mineralName = input.minerals[mineral]?.name ?? mineral
      const francs = scanOnly
        ? 250_000 * template.payoutMultiplier * payoutMultiplier(contractor)
        : (input.minerals[mineral]?.price ?? 0) * amount * 1500 * template.payoutMultiplier * payoutMultiplier(contractor)
      return {
        id: `freeops-${contractor.id}-${template.id}-${templateIndex + 1}`,
        title: scanOnly
          ? `${contractor.name} target mapping scan`
          : `${mineralName} ${template.tag.toLowerCase()} contract`,
        brief: scanOnly
          ? `${contractor.name} needs a reachable target mapped before landing crews commit. Run station scans to reveal minerals, deposits, and landmarks.`
          : `${contractor.name} needs ${amount} units of ${mineralName.toLowerCase()} delivered from a reachable asteroid. ${contractor.projectType}.`,
        contractor: contractor.id,
        tag: template.tag,
        difficulty: template.difficulty,
        locked: false,
        sequence: FREE_OPS_START_MISSIONS_DONE + 1,
        unlockAt: 'Complete M3',
        requires: {
          minerals: scanOnly ? {} : { [mineral]: amount },
          cargo_min: amount,
          drill_tier: template.drillTierMin,
          max_orbit: template.orbitMax,
        },
        payout: {
          francs: Math.round(francs),
          affinity: Math.max(5, Math.round(8 + amount / 2)),
        },
        survey: template.survey,
      } satisfies Mission
    })
  })
}

export function missionTemplatesToPocketBaseRows(templates = DEFAULT_MISSION_TEMPLATES): PocketBaseMissionTemplateSeed[] {
  return templates.map(template => ({
    slug: template.id,
    tag: template.tag,
    difficulty: template.difficulty,
    mineral_keys: template.mineralKeys,
    cargo_min: template.cargoRange[0],
    cargo_max: template.cargoRange[1],
    drill_tier_min: template.drillTierMin,
    orbit_max: template.orbitMax,
    payout_multiplier: template.payoutMultiplier,
    contractor_role: template.contractorRole,
    payout_formula: template.payoutFormula,
    scan_required: template.survey?.scanRequired,
    scan_count: template.survey?.scanCount,
    scan_source: template.survey?.scanSource,
    deposits_to_map: template.survey?.depositsToMap,
    reveals_minerals: template.survey?.revealsMinerals,
    reveals_landmarks: template.survey?.revealsLandmarks,
    unlocks_landing: template.survey?.unlocksLanding,
    on_world_vehicle: template.survey?.onWorldVehicle,
    on_world_any_target: template.survey?.anyTargetType,
  }))
}

export function missionsToPocketBaseRows(missions: Mission[]): PocketBaseMissionSeed[] {
  return missions.map(mission => ({
    slug: mission.id,
    title: mission.title,
    brief: mission.brief,
    contractor_slug: mission.contractor,
    tag: mission.tag,
    difficulty: mission.difficulty,
    locked: mission.locked,
    sequence: mission.sequence,
    unlock_at: mission.unlockAt ?? '',
    requires_minerals: mission.requires.minerals,
    requires_cargo_min: mission.requires.cargo_min,
    requires_drill_tier: mission.requires.drill_tier,
    requires_max_orbit: mission.requires.max_orbit,
    payout_francs: mission.payout.francs,
    payout_affinity: mission.payout.affinity,
  }))
}
