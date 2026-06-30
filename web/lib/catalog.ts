import { pbLandnam } from './pb-landnam'
import type { Target, Mission, Part, MineralMeta, Contractor, StructureBlueprint } from './data'
import { TARGETS, MISSIONS, PARTS, MINERAL_META, CONTRACTORS, CONTRACTOR_SLOTS, STRUCTURES, toContractor as slotToContractor, generateFreeOpsMissions, generateMissions } from './data'

export interface Catalog {
  targets: Target[]
  missions: Mission[]
  parts: { chassis: Part[]; propulsion: Part[]; drill: Part[] }
  minerals: Record<string, MineralMeta>
  contractors: Record<string, Contractor>
  structures: StructureBlueprint[]
}

export const STATIC_CATALOG: Catalog = {
  targets: TARGETS,
  missions: MISSIONS,
  parts: PARTS,
  minerals: MINERAL_META,
  contractors: CONTRACTORS,
  structures: STRUCTURES,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTarget(r: any): Target {
  return {
    id: r.slug,
    name: r.name,
    type: r.body_type,
    orbit: r.orbit,
    difficulty: r.difficulty,
    brief: r.brief ?? '',
    minerals: Array.isArray(r.minerals) ? r.minerals : (r.minerals ? JSON.parse(r.minerals) : []),
    recommended: r.recommended ?? false,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toMission(r: any): Mission {
  const minerals = typeof r.requires_minerals === 'object' && !Array.isArray(r.requires_minerals)
    ? r.requires_minerals
    : JSON.parse(r.requires_minerals || '{}')
  return {
    id: r.slug,
    title: r.title,
    brief: r.brief ?? '',
    contractor: r.contractor_slug,
    tag: r.tag ?? '',
    difficulty: r.difficulty ?? 'L1',
    locked: r.locked ?? false,
    sequence: r.sequence,
    unlockAt: r.unlock_at || undefined,
    targetId: (r.getString?.('target_id') ?? r.target_id ?? '') || undefined,
    payload: (r.getString?.('payload_type') ?? r.payload_type ?? '')
      ? {
          type: (r.getString?.('payload_type') ?? r.payload_type) as 'rover',
          name: r.getString?.('payload_name') ?? r.payload_name ?? '',
          cargoCost: r.getFloat?.('payload_cargo_cost') ?? r.payload_cargo_cost ?? 0,
        }
      : undefined,
    requires: {
      minerals,
      cargo_min: r.requires_cargo_min ?? 0,
      drill_tier: r.requires_drill_tier ?? 1,
      max_orbit: r.requires_max_orbit ?? 5,
    },
    payout: {
      francs: r.payout_francs ?? 0,
      affinity: r.payout_affinity ?? 0,
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toContractor(r: any): Contractor {
  const fallback = CONTRACTOR_SLOTS.find(c => c.id === r.slug)
  const mineralPreferences = Array.isArray(r.mineral_preferences)
    ? r.mineral_preferences
    : (r.mineral_preferences ? JSON.parse(r.mineral_preferences) : fallback?.mineralPreferences ?? [])
  return {
    ...(fallback ? slotToContractor(fallback) : {
      id: r.slug,
      name: r.name,
      color: r.color ?? '#87CFFA',
      initial: r.initial ?? String(r.name ?? r.slug).slice(0, 2).toUpperCase(),
      unlockTier: r.unlock_tier ?? 1,
      projectType: r.project_type ?? 'General contracting',
      mineralPreferences,
      payoutPremium: 0.2,
      affinityBonusPerMission: 0.025,
    }),
    id: r.slug,
    name: r.name ?? fallback?.name ?? r.slug,
    color: r.color ?? fallback?.color ?? '#87CFFA',
    initial: r.initial ?? fallback?.initial ?? String(r.name ?? r.slug).slice(0, 2).toUpperCase(),
    unlockTier: r.unlock_tier ?? fallback?.unlockTier ?? 1,
    projectType: r.project_type ?? fallback?.projectType ?? 'General contracting',
    mineralPreferences,
    payoutPremium: r.payout_premium ?? fallback?.payoutPremium ?? 0.2,
    affinityBonusPerMission: r.affinity_bonus_per_mission ?? fallback?.affinityBonusPerMission ?? 0.025,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toPart(r: any): Part {
  return {
    id: r.slug,
    name: r.name,
    tier: r.tier,
    locked: r.tier > 2 ? (r.locked ?? false) : false,
    img: r.img ?? '',
    mass: r.mass || undefined,
    cargo: r.cargo_capacity || undefined,
    power: r.power || undefined,
    max_orbit: r.max_orbit || undefined,
    rate: r.drill_rate != null ? r.drill_rate : undefined,
    missionsRequired: r.missions_required || undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toStructure(r: any): StructureBlueprint {
  return {
    id: r.slug,
    name: r.name,
    kind: r.kind ?? r.slug,
    cost: r.cost_francs ?? 0,
    costMaterials: typeof r.cost_materials === 'object' && !Array.isArray(r.cost_materials)
      ? r.cost_materials
      : (r.cost_materials ? JSON.parse(r.cost_materials) : undefined),
    unlocksAt: r.unlocks_at ?? '',
    unlockTrigger: r.unlock_trigger_type || undefined,
    description: r.description ?? '',
  }
}

export async function fetchCatalog(): Promise<Catalog> {
  const [locations, minerals, contractors, parts, missions, structures] = await Promise.all([
    pbLandnam.collection('locations').getFullList({ sort: 'orbit,name' }),
    pbLandnam.collection('minerals').getFullList(),
    pbLandnam.collection('contractors').getFullList({ sort: 'unlock_tier' }),
    pbLandnam.collection('rocket_parts').getFullList({ sort: 'part_type,tier' }),
    pbLandnam.collection('missions_catalog').getFullList({ sort: 'sequence' }),
    pbLandnam.collection('structure_blueprints').getFullList({ sort: 'slug' }),
  ])

  const generatedFallbackMissions = MISSIONS
  const catalogMissions = missions.map(toMission)
  const catalogContractors = Object.fromEntries(
    contractors.map(r => [r.slug, toContractor(r)])
  )
  // Always include generated onboarding + freeops missions — PocketBase only seeds authored missions.
  const baseMissions = catalogMissions.length > 0 ? catalogMissions : generatedFallbackMissions
  const generatedMissions = generateMissions()
  const freeOpsMissions = generateFreeOpsMissions()
  const pbIds = new Set(baseMissions.map(m => m.id))
  const generatedToMerge = generatedMissions.filter(m => !pbIds.has(m.id))
  const freeOpsIds = new Set(freeOpsMissions.map(m => m.id))
  const allMissions = [
    ...baseMissions.filter(m => !freeOpsIds.has(m.id)),
    ...generatedToMerge.filter(m => !freeOpsIds.has(m.id)),
    ...freeOpsMissions,
  ]

  return {
    targets: locations.map(toTarget),
    missions: allMissions,
    parts: {
      chassis:    parts.filter(p => p.part_type === 'chassis').map(toPart),
      propulsion: parts.filter(p => p.part_type === 'propulsion').map(toPart),
      drill:      parts.filter(p => p.part_type === 'drill').map(toPart),
    },
    // Merge static MINERAL_META first so any key not yet seeded in PocketBase
    // still resolves (avoids crashes when missions reference new minerals).
    minerals: {
      ...MINERAL_META,
      ...Object.fromEntries(
        minerals.map(r => [r.slug, { name: r.name, sym: r.sym, color: r.color, price: r.base_price, rarity: r.rarity ?? 'common', constructionUse: r.construction_use ?? '', laserAccess: r.laser_access ?? 1 }])
      ),
    },
    contractors: Object.keys(catalogContractors).length > 0 ? catalogContractors : CONTRACTORS,
    structures: structures.length > 0 ? structures.map(toStructure) : STRUCTURES,
  }
}
