import { CARGO_BONUS_RATE, SCAN_CONTRACT_FEE } from './economy'
import type { ClientSlot, MineralMeta, Mission, MissionTemplate, MissionConstructionPlan } from './types'
import { normalizeMissionPayout } from './payouts'

export const FREE_OPS_START_MISSIONS_DONE = 3
export const ONBOARDING_SEQUENCE_COUNT = 2
export const OFFLINE_MISSION_COUNT = 12

export interface MissionComplexity {
  sequence: number
  templateId: string
  mineralCount: number
  amountBias: number
  clientOffset: number
  mineralOffset?: number
}

export interface MissionGeneratorInput {
  clients: ClientSlot[]
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
  client_role: string
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
  construction_structure_kind?: string
  construction_required_materials?: Record<string, number>
  construction_placement_mode?: string
  construction_build_time_ms?: number
}

export interface PocketBaseMissionSeed {
  slug: string
  title: string
  brief: string
  client_slug: string
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

const FUEL_DEPOT_CONSTRUCTION: MissionConstructionPlan = {
  structureKind: 'fuel-depot',
  requiredMaterials: { hydrogen: 8, aluminium: 6 },
  placementMode: 'confirm',
  buildTimeMs: 20 * 60 * 1000,
} satisfies MissionConstructionPlan

const BATTERY_STATION_CONSTRUCTION: MissionConstructionPlan = {
  structureKind: 'battery-station',
  requiredMaterials: { cobalt: 6, nickel: 4, copper: 4 },
  placementMode: 'confirm',
  buildTimeMs: 25 * 60 * 1000,
} satisfies MissionConstructionPlan

const FABRICATION_PAD_CONSTRUCTION: MissionConstructionPlan = {
  structureKind: 'fabrication-pad',
  requiredMaterials: { iron: 12, silicon: 6, aluminium: 4 },
  placementMode: 'confirm',
  buildTimeMs: 35 * 60 * 1000,
} satisfies MissionConstructionPlan

export const DEFAULT_MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'starter-bulk', tag: 'STARTER', difficulty: 'L1', mineralKeys: ['platinum', 'palladium'], cargoRange: [4, 8], drillTierMin: 1, orbitMax: 4, payoutMultiplier: 1.0, clientRole: 'starter', payoutFormula: 'contract fee + cargo value bonus' },
  { id: 'volatile-bulk', tag: 'BULK',    difficulty: 'L2', mineralKeys: ['palladium', 'platinum', 'iridium'], cargoRange: [4, 8], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.35, clientRole: 'bulk', payoutFormula: 'contract fee + cargo value bonus' },
  { id: 'metal-prospect', tag: 'PROSPECT', difficulty: 'L2', mineralKeys: ['iridium', 'rhodium', 'gold'], cargoRange: [3, 6], drillTierMin: 2, orbitMax: 5, payoutMultiplier: 2.25, clientRole: 'prospect', payoutFormula: 'contract fee + cargo value bonus' },
  { id: 'command-reserve', tag: 'COMMAND', difficulty: 'L3', mineralKeys: ['rhodium', 'rare', 'iridium'], cargoRange: [2, 4], drillTierMin: 2, orbitMax: 6, payoutMultiplier: 3.5, clientRole: 'command', payoutFormula: 'contract fee + cargo value bonus' },
  { id: 'freeops-delivery', tag: 'DELIVERY', difficulty: 'L1', mineralKeys: ['hydrogen', 'cobalt', 'copper', 'aluminium'], cargoRange: [4, 10], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.25, clientRole: 'starter', payoutFormula: 'contract fee + cargo value bonus' },
  { id: 'freeops-mining-survey', tag: 'SURVEY', difficulty: 'L1', mineralKeys: ['cobalt', 'copper', 'aluminium', 'gold'], cargoRange: [3, 7], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.55, clientRole: 'prospect', payoutFormula: 'contract fee + cargo value bonus' },
  { id: 'freeops-bulk-run', tag: 'BULK', difficulty: 'L1', mineralKeys: ['hydrogen', 'aluminium', 'copper'], cargoRange: [8, 16], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.15, clientRole: 'bulk', payoutFormula: 'contract fee + cargo value bonus' },
  { id: 'freeops-station-scan', tag: 'SCAN', difficulty: 'L1', mineralKeys: ['cobalt', 'copper', 'aluminium', 'gold'], cargoRange: [0, 0], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 0.85, clientRole: 'prospect', payoutFormula: 'scan fee + mapped deposit bonus', survey: SCANNING_STATION_SURVEY },
  { id: 'freeops-rover-landing', tag: 'ROVER', difficulty: 'L1', mineralKeys: ['cobalt', 'copper', 'aluminium', 'hydrogen'], cargoRange: [2, 5], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.7, clientRole: 'starter', payoutFormula: 'contract fee + cargo value bonus + landing bonus', survey: STARTER_ROVER_SURVEY },
  { id: 'construct-fuel-depot', tag: 'CONSTRUCT', difficulty: 'L2', mineralKeys: ['hydrogen', 'aluminium', 'copper'], cargoRange: [8, 14], drillTierMin: 1, orbitMax: 5, payoutMultiplier: 2.8, clientRole: 'prospect', payoutFormula: 'structure value * 2 + delivery bonus', construction: FUEL_DEPOT_CONSTRUCTION },
  { id: 'construct-battery-station', tag: 'CONSTRUCT', difficulty: 'L2', mineralKeys: ['cobalt', 'nickel', 'copper', 'gold'], cargoRange: [8, 14], drillTierMin: 2, orbitMax: 6, payoutMultiplier: 3.2, clientRole: 'command', payoutFormula: 'structure value * 2 + delivery bonus', construction: BATTERY_STATION_CONSTRUCTION },
  { id: 'construct-fabrication-pad', tag: 'CONSTRUCT', difficulty: 'L3', mineralKeys: ['iron', 'silicon', 'aluminium', 'carbon'], cargoRange: [10, 18], drillTierMin: 2, orbitMax: 6, payoutMultiplier: 3.6, clientRole: 'bulk', payoutFormula: 'structure value * 2 + delivery bonus', construction: FABRICATION_PAD_CONSTRUCTION },
]

export const DEFAULT_COMPLEXITY_BANDS: MissionComplexity[] = [
  { sequence: 1, templateId: 'starter-bulk', mineralCount: 1, amountBias: 0, clientOffset: 0 },
  // The tutorial is a decision between two clients, not a catalogue browse.
  // Give the second card a different client role so the requests genuinely
  // differ while the sequence payout floor keeps both offers close together.
  { sequence: 1, templateId: 'volatile-bulk', mineralCount: 1, amountBias: 1, clientOffset: 0, mineralOffset: 0 },
  { sequence: 2, templateId: 'starter-bulk', mineralCount: 1, amountBias: 2, clientOffset: 3 },
  // Both M2 choices still need more cargo than Explorer can carry, forcing
  // the Prospector purchase while keeping the choice client-led and legible.
  { sequence: 2, templateId: 'volatile-bulk', mineralCount: 1, amountBias: 2, clientOffset: 0, mineralOffset: 0 },
  { sequence: 3, templateId: 'volatile-bulk', mineralCount: 2, amountBias: 1, clientOffset: 6 },
  { sequence: 3, templateId: 'metal-prospect', mineralCount: 2, amountBias: 1, clientOffset: 7 },
  { sequence: 3, templateId: 'command-reserve', mineralCount: 1, amountBias: 0, clientOffset: 8 },
  { sequence: 4, templateId: 'metal-prospect', mineralCount: 2, amountBias: 2, clientOffset: 9 },
  { sequence: 4, templateId: 'command-reserve', mineralCount: 2, amountBias: 1, clientOffset: 0 },
  { sequence: 4, templateId: 'command-reserve', mineralCount: 3, amountBias: 2, clientOffset: 1 },
]

/**
 * Keep the authored onboarding decision small even when a live catalog still
 * contains older/generated rows. Prefer two different clients, then choose
 * the closest payout pair so the player compares the request and destination
 * rather than hunting for the largest number.
 */
export function tutorialClientMissionOptions(missions: Mission[], sequence: number): Mission[] {
  const candidates = missions.filter(mission => mission.sequence === sequence && !!mission.client)
  if (candidates.length <= 2) return candidates

  let bestPair: [Mission, Mission] | undefined
  let bestScore = Number.POSITIVE_INFINITY
  for (let firstIndex = 0; firstIndex < candidates.length - 1; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
      const first = candidates[firstIndex]
      const second = candidates[secondIndex]
      if (first.client === second.client) continue
      const scale = Math.max(first.payout.francs, second.payout.francs, 1)
      const score = Math.abs(first.payout.francs - second.payout.francs) / scale
      if (score < bestScore) {
        bestScore = score
        bestPair = [first, second]
      }
    }
  }

  return bestPair ?? candidates.slice(0, 2)
}

const MINERAL_LABELS: Record<string, string> = {
  platinum:  'Platinum',
  palladium: 'Palladium',
  iridium:   'Iridium',
  rhodium:   'Rhodium',
  gold:      'Gold',
  rare:      'Xenon',
  iron:      'Iron',
  silicon:   'Silicon',
  carbon:    'Carbon',
  ice:       'Volatile',
  nickel:    'Nickel',
  cobalt:    'Cobalt',
  copper:    'Copper',
  aluminium: 'Aluminium',
  hydrogen:  'Hydrogen',
  uranium:   'Uranium',
}

function payoutMultiplier(client: ClientSlot): number {
  return 1 + client.payoutPremium
}

// CONSTRUCT missions build/deploy structures at the target itself — cargo
// never routes back to Earth, so Earth-abundant minerals (iron, carbon, ...)
// are fine there. Every other template implicitly returns cargo to Earth
// (no deliveryTargetId), so it makes no sense to request minerals Earth
// already has in abundance — filter those out, falling back to the full
// list only if that would leave nothing to mine.
export function deliveryEligibleMineralKeys(template: MissionTemplate, minerals: Record<string, MineralMeta>): string[] {
  if (template.tag === 'CONSTRUCT') return template.mineralKeys
  const filtered = template.mineralKeys.filter(key => !minerals[key]?.earthAbundant)
  return filtered.length > 0 ? filtered : template.mineralKeys
}

function selectMinerals(mineralKeys: string[], preferences: string[], index: number, count: number): string[] {
  const preferred = mineralKeys.filter(mineral => preferences.includes(mineral))
  const remaining = mineralKeys.filter(mineral => !preferences.includes(mineral))
  const candidates = [...preferred, ...remaining]
  return Array.from({ length: count }, (_, offset) => candidates[(index + offset) % candidates.length])
}

// A template's drillTierMin is a flat floor, but the specific minerals a
// mission ends up requiring (selectMinerals can pick any exotic mineral out
// of a template's mineralKeys) may need a deeper laser reach than that floor
// — MiningController physically can't collect ore whose laserAccess tier
// exceeds the equipped drill (see LASER_DEPTH_BY_TIER in MiningController.ts),
// so a mission requiring e.g. iridium (laserAccess 2) with drill_tier stuck
// at a template's tier-1 floor would be unwinnable no matter what the player
// builds. Always raise the requirement to cover the actual selected minerals.
export function requiredDrillTier(mineralIds: string[], templateFloor: number, minerals: Record<string, MineralMeta>): number {
  return mineralIds.reduce((tier, id) => Math.max(tier, minerals[id]?.laserAccess ?? 1), templateFloor)
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
    const unlockedClients = input.clients.filter(c => c.unlockTier <= band.sequence)
    const clientPool = unlockedClients.filter(c => c.uiRole === template.clientRole)
    const fallbackPool = clientPool.length > 0 ? clientPool : unlockedClients
    const client = fallbackPool[band.clientOffset % fallbackPool.length] ?? input.clients[0]
    const eligibleMineralKeys = deliveryEligibleMineralKeys(template, input.minerals)
    const minerals = Object.fromEntries(
      selectMinerals(eligibleMineralKeys, client.mineralPreferences, band.mineralOffset ?? index, band.mineralCount).map((mineral, mineralIndex) => [
        mineral,
        amountFor(template, band.sequence, band.amountBias, mineralIndex),
      ])
    )
    const cargoMin = Object.values(minerals).reduce((sum, amount) => sum + amount, 0)
    const mineralNames = Object.keys(minerals).map(mineral => MINERAL_LABELS[mineral] ?? input.minerals[mineral]?.name ?? mineral)
    const primary = mineralNames.join(' + ')
    const francs = Object.entries(minerals).reduce(
      (sum, [mineral, amount]) => sum + (input.minerals[mineral]?.price ?? 0) * amount * CARGO_BONUS_RATE * template.payoutMultiplier * payoutMultiplier(client),
      0
    )
    const title = band.sequence === 1
      ? 'Baseline Extraction'
      : band.sequence === 2
        ? 'Heavy Haul'
        : `${primary} ${template.tag.toLowerCase().replace('-', ' ')} order`

    return {
      id: `generated-s${band.sequence}-${template.id}-${index + 1}`,
      title,
      brief: `${client.name} needs ${primary.toLowerCase()} for ${client.projectType.toLowerCase()}. Preferred cargo earns a client premium; affinity improves future payouts.`,
      client: client.id,
      tag: template.tag,
      difficulty: template.difficulty,
      locked: false,
      sequence: band.sequence,
      unlockAt: band.sequence > 1 ? `Complete ${band.sequence - 1} contract${band.sequence > 2 ? 's' : ''}` : undefined,
      requires: {
        minerals,
        cargo_min: cargoMin,
        drill_tier: requiredDrillTier(Object.keys(minerals), template.drillTierMin, input.minerals),
        max_orbit: template.orbitMax,
      },
      payout: {
        francs: normalizeMissionPayout(francs, band.sequence),
        affinity: Math.max(4, Math.round(6 + band.sequence * 2 + cargoMin / 3)),
      },
      survey: template.survey,
      construction: template.construction,
    }
  })
}

export function generateFreeOpsMissionsFromRules(input: MissionGeneratorInput): Mission[] {
  const templates = input.templates ?? DEFAULT_MISSION_TEMPLATES
  const freeOpsClients = input.clients.filter(c => c.unlockTier <= 1).slice(0, 3)
  const freeOpsTemplates = templates.filter(t => t.id.startsWith('freeops-'))

  return freeOpsClients.flatMap((client, clientIndex) => {
    const matchingTemplates = freeOpsTemplates
      .filter(template => template.clientRole === client.uiRole)
      .slice(0, 2)

    return matchingTemplates.map((template, templateIndex) => {
      const eligibleMineralKeys = deliveryEligibleMineralKeys(template, input.minerals)
      const mineral = eligibleMineralKeys.find(key => client.mineralPreferences.includes(key))
        ?? eligibleMineralKeys[(clientIndex + templateIndex) % eligibleMineralKeys.length]
      const scanOnly = template.cargoRange[0] === 0 && template.cargoRange[1] === 0
      const amount = scanOnly ? 0 : template.cargoRange[0] + clientIndex + templateIndex
      const mineralName = input.minerals[mineral]?.name ?? mineral
      const francs = scanOnly
        ? SCAN_CONTRACT_FEE * template.payoutMultiplier * payoutMultiplier(client)
        : (input.minerals[mineral]?.price ?? 0) * amount * CARGO_BONUS_RATE * template.payoutMultiplier * payoutMultiplier(client)
      return {
        id: `freeops-${client.id}-${template.id}-${templateIndex + 1}`,
        title: scanOnly
          ? `${client.name} target mapping scan`
          : `${mineralName} ${template.tag.toLowerCase()} contract`,
        brief: scanOnly
          ? `${client.name} needs a reachable target mapped before landing crews commit. Run station scans to reveal minerals, deposits, and landmarks.`
          : `${client.name} needs ${amount} units of ${mineralName.toLowerCase()} delivered from a reachable asteroid. ${client.projectType}.`,
        client: client.id,
        tag: template.tag,
        difficulty: template.difficulty,
        locked: false,
        sequence: FREE_OPS_START_MISSIONS_DONE + 1,
        unlockAt: 'Complete M3',
        requires: {
          minerals: scanOnly ? {} : { [mineral]: amount },
          cargo_min: amount,
          drill_tier: scanOnly ? template.drillTierMin : requiredDrillTier([mineral], template.drillTierMin, input.minerals),
          max_orbit: template.orbitMax,
        },
        payout: {
          francs: normalizeMissionPayout(francs, FREE_OPS_START_MISSIONS_DONE + 1),
          affinity: Math.max(5, Math.round(8 + amount / 2)),
        },
        survey: template.survey,
      } satisfies Mission
    })
  })
}

// Renewable self-directed mining pool: same freeops template pool, rotation
// cadence, and mineral-eligibility filtering as generateFreeOpsMissionsFromRules
// above, but with no client assigned at all (not even a starter-role client) —
// these are the player's own program, sold to market at plain price, so they
// must never carry a client premium or earn client affinity (see
// isOwnProgramMission in mission-primers.ts). Excludes scan-only templates
// (cargoRange [0, 0]) since a self-directed *mining* run always has cargo to sell.
export function generateSelfDirectedMiningPoolFromRules(input: MissionGeneratorInput): Mission[] {
  const templates = input.templates ?? DEFAULT_MISSION_TEMPLATES
  const freeOpsTemplates = templates.filter(t => t.id.startsWith('freeops-') && t.cargoRange[0] + t.cargoRange[1] > 0)

  return freeOpsTemplates.map((template, index) => {
    const eligibleMineralKeys = deliveryEligibleMineralKeys(template, input.minerals)
    const mineral = eligibleMineralKeys[index % eligibleMineralKeys.length]
    const amount = template.cargoRange[0] + index
    const mineralName = MINERAL_LABELS[mineral] ?? input.minerals[mineral]?.name ?? mineral
    const francs = (input.minerals[mineral]?.price ?? 0) * amount * CARGO_BONUS_RATE * template.payoutMultiplier

    return {
      id: `self-directed-${template.id}-${index + 1}`,
      title: `${mineralName} self-directed run`,
      brief: `No client, no daily limit. Mine ${amount} units of ${mineralName.toLowerCase()} and sell the haul yourself at market price.`,
      tag: 'FREE OPS',
      difficulty: template.difficulty,
      locked: false,
      sequence: FREE_OPS_START_MISSIONS_DONE + 1,
      unlockAt: 'Complete M3',
      requires: {
        minerals: { [mineral]: amount },
        cargo_min: amount,
        drill_tier: requiredDrillTier([mineral], template.drillTierMin, input.minerals),
        max_orbit: template.orbitMax,
      },
      payout: {
        francs: normalizeMissionPayout(francs, FREE_OPS_START_MISSIONS_DONE + 1),
        affinity: 0,
      },
      survey: template.survey,
    } satisfies Mission
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
    client_role: template.clientRole,
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
    construction_structure_kind: template.construction?.structureKind,
    construction_required_materials: template.construction?.requiredMaterials,
    construction_placement_mode: template.construction?.placementMode,
    construction_build_time_ms: template.construction?.buildTimeMs,
  }))
}

export function missionsToPocketBaseRows(missions: Mission[]): PocketBaseMissionSeed[] {
  return missions
    .filter((mission): mission is Mission & { client: string } => !!mission.client)
    .map(mission => ({
    slug: mission.id,
    title: mission.title,
    brief: mission.brief,
    client_slug: mission.client,
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
