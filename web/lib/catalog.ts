import { pbLandnam } from './pb-landnam'
import type { Target, Mission, Part, MineralMeta, Contractor } from './data'
import { TARGETS, MISSIONS, PARTS, MINERAL_META, CONTRACTORS } from './data'

export interface Catalog {
  targets: Target[]
  missions: Mission[]
  parts: { chassis: Part[]; propulsion: Part[]; drill: Part[] }
  minerals: Record<string, MineralMeta>
  contractors: Record<string, Contractor>
}

export const STATIC_CATALOG: Catalog = {
  targets: TARGETS,
  missions: MISSIONS,
  parts: PARTS,
  minerals: MINERAL_META,
  contractors: CONTRACTORS,
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
    requiresClassification: r.requires_classification ?? false,
    unlockAt: r.unlock_at || undefined,
    requires: {
      minerals,
      cargo_min: r.requires_cargo_min ?? 0,
      drill_tier: r.requires_drill_tier ?? 1,
      max_orbit: r.requires_max_orbit ?? 5,
    },
    payout: {
      francs: r.payout_francs ?? 0,
      xp: r.payout_xp ?? 0,
      affinity: r.payout_affinity ?? 0,
    },
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
    rate: r.drill_rate || undefined,
    levelRequired: r.level_required || undefined,
  }
}

export async function fetchCatalog(): Promise<Catalog> {
  const [locations, minerals, contractors, parts, missions] = await Promise.all([
    pbLandnam.collection('locations').getFullList({ sort: 'orbit,name' }),
    pbLandnam.collection('minerals').getFullList(),
    pbLandnam.collection('contractors').getFullList({ sort: 'unlock_tier' }),
    pbLandnam.collection('rocket_parts').getFullList({ sort: 'part_type,tier' }),
    pbLandnam.collection('missions_catalog').getFullList({ sort: 'sequence' }),
  ])

  return {
    targets: locations.map(toTarget),
    missions: missions.map(toMission),
    parts: {
      chassis:    parts.filter(p => p.part_type === 'chassis').map(toPart),
      propulsion: parts.filter(p => p.part_type === 'propulsion').map(toPart),
      drill:      parts.filter(p => p.part_type === 'drill').map(toPart),
    },
    minerals: Object.fromEntries(
      minerals.map(r => [r.slug, { name: r.name, sym: r.sym, color: r.color, price: r.base_price, rarity: r.rarity ?? 'common', constructionUse: r.construction_use ?? '', laserAccess: r.laser_access ?? 1 }])
    ),
    contractors: Object.fromEntries(
      contractors.map(r => [r.slug, { id: r.slug, name: r.name, color: r.color, initial: r.initial }])
    ),
  }
}
