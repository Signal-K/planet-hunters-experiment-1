import { pbLandnam } from './pb-landnam'
import type { Target, Mission, Part, MineralMeta, Client, StructureBlueprint } from './data'
import { TARGETS, MISSIONS, AUTHORED_MISSIONS, M3_SEQUENCE, PARTS, MINERAL_META, CLIENTS, CLIENT_SLOTS, STRUCTURES, toClient as slotToClient, generateFreeOpsMissions, generateMissions, generateSelfDirectedMiningPool } from './data'
import { normalizeMissionPayout } from './data/payouts'

export interface Catalog {
  targets: Target[]
  missions: Mission[]
  parts: { chassis: Part[]; propulsion: Part[]; drill: Part[] }
  minerals: Record<string, MineralMeta>
  clients: Record<string, Client>
  structures: StructureBlueprint[]
}

export const STATIC_CATALOG: Catalog = {
  targets: TARGETS,
  missions: MISSIONS,
  parts: PARTS,
  minerals: MINERAL_META,
  clients: CLIENTS,
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
  if (r.slug === 'lnm_m3_ore_delivery' || r.slug === 'm3-nickel-cobalt' || r.slug === 'm3-gold' || r.slug === 'lnm_m3_custom_mining') {
    return AUTHORED_MISSIONS.find(m => m.sequence === M3_SEQUENCE) ?? AUTHORED_MISSIONS[0]
  }
  const minerals = typeof r.requires_minerals === 'object' && !Array.isArray(r.requires_minerals)
    ? r.requires_minerals
    : JSON.parse(r.requires_minerals || '{}')
  const fallbackClient = r.client_slug ? CLIENTS[r.client_slug] : undefined
  const rawBrief = r.brief ?? ''
  const brief = fallbackClient && /^(?:Client|Contractor) Slot\s+/i.test(rawBrief)
    ? rawBrief.replace(/(?:Client|Contractor) Slot\s+\d+[A-Z]?/i, fallbackClient.name)
    : rawBrief
  return {
    id: r.slug,
    title: r.title,
    brief,
    client: r.client_slug,
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
      francs: typeof r.sequence === 'number' && !!r.client_slug
        ? normalizeMissionPayout(r.payout_francs ?? 0, r.sequence)
        : (r.payout_francs ?? 0),
      affinity: r.payout_affinity ?? 0,
    },
  }
}

// Applies the M3-sequence correction (PocketBase's seeded legacy M3 rows are
// always replaced by the curated transport-client AUTHORED_MISSIONS pair),
// then generalizes that same "authored content PocketBase doesn't seed must
// still reach the runtime catalog" pattern to every clientless authored
// mission. seedCatalog() (pocketbase/main.go) only ever seeds the two
// client-bearing onboarding rows (m1-iron, m2-silicon), so any AUTHORED_MISSIONS
// entry with no client — the academy intro, the self-directed mining intro,
// crewed prospecting, ... — is never present in PocketBase's response and
// would otherwise silently vanish whenever `missions` (the raw PB rows) is
// non-empty, which is always true in any real/dev environment. Union those
// back in here, deduped by id, so a real PB row (should one ever share an id)
// still wins.
export function withAuthoredExtras(missions: Mission[]): Mission[] {
  const correctedM3 = AUTHORED_MISSIONS.filter(m => m.sequence === M3_SEQUENCE)
  const correctedM3Ids = new Set(correctedM3.map(m => m.id))
  const withoutLegacyM3 = missions.filter(m =>
    m.id !== 'lnm_m3_ore_delivery' &&
    m.id !== 'm3-nickel-cobalt' &&
    m.id !== 'm3-gold' &&
    m.id !== 'lnm_m3_custom_mining' &&
    m.sequence !== M3_SEQUENCE &&
    !correctedM3Ids.has(m.id)
  )
  const merged = [...withoutLegacyM3, ...correctedM3]

  const mergedIds = new Set(merged.map(m => m.id))
  const clientlessExtras = AUTHORED_MISSIONS.filter(m => !m.client && !mergedIds.has(m.id))

  return [...merged, ...clientlessExtras].sort((a, b) => a.sequence - b.sequence)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toClient(r: any): Client {
  const fallback = CLIENT_SLOTS.find(c => c.id === r.slug)
  const rawName = typeof r.name === 'string' ? r.name.trim() : ''
  const hasPlaceholderName = /^(?:Client|Contractor) Slot\s+\d+[A-Z]?$/i.test(rawName)
  const mineralPreferences = Array.isArray(r.mineral_preferences)
    ? r.mineral_preferences
    : (r.mineral_preferences ? JSON.parse(r.mineral_preferences) : fallback?.mineralPreferences ?? [])
  return {
    ...(fallback ? slotToClient(fallback) : {
      id: r.slug,
      name: r.name,
      color: r.color ?? '#87CFFA',
      initial: r.initial ?? String(r.name ?? r.slug).slice(0, 2).toUpperCase(),
      unlockTier: r.unlock_tier ?? 1,
      projectType: r.project_type ?? 'General contracting',
      mineralPreferences,
      payoutPremium: 0.2,
      affinityBonusPerMission: 0.025,
      uiRole: 'starter',
      suppliesCrew: false,
    }),
    id: r.slug,
    name: (!hasPlaceholderName && rawName) ? rawName : (fallback?.name ?? rawName) || r.slug,
    color: r.color ?? fallback?.color ?? '#87CFFA',
    initial: r.initial ?? fallback?.initial ?? String(r.name ?? r.slug).slice(0, 2).toUpperCase(),
    unlockTier: r.unlock_tier ?? fallback?.unlockTier ?? 1,
    projectType: r.project_type ?? fallback?.projectType ?? 'General contracting',
    mineralPreferences,
    payoutPremium: r.payout_premium ?? fallback?.payoutPremium ?? 0.2,
    affinityBonusPerMission: r.affinity_bonus_per_mission ?? fallback?.affinityBonusPerMission ?? 0.025,
    uiRole: fallback?.uiRole ?? 'starter',
    suppliesCrew: r.supplies_crew ?? fallback?.suppliesCrew ?? false,
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
  // The `locations` collection is Landnam's authored solar-system catalog only.
  // Discovered exoplanet targets (now real, minable targets — see
  // tessCandidateToExoplanetTarget) are generated client-side from confirmed
  // TESS classifications, not seeded here, so filter out any stray tess-/koi-/
  // hd- prefixed rows defensively in case a stale PB row bleeds in.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isSolarTarget = (r: any) =>
    !String(r.slug ?? '').startsWith('tess-') && !String(r.slug ?? '').startsWith('koi-') && !String(r.slug ?? '').startsWith('hd-')

  const [locations, minerals, clients, parts, missions, structures] = await Promise.all([
    pbLandnam.collection('locations').getFullList({ sort: 'orbit,name' }),
    pbLandnam.collection('minerals').getFullList(),
    pbLandnam.collection('clients').getFullList({ sort: 'unlock_tier' }),
    pbLandnam.collection('rocket_parts').getFullList({ sort: 'part_type,tier' }),
    pbLandnam.collection('missions_catalog').getFullList({ sort: 'sequence' }),
    pbLandnam.collection('structure_blueprints').getFullList({ sort: 'slug' }),
  ])

  const generatedFallbackMissions = MISSIONS
  const catalogMissions = missions.length > 0 ? withAuthoredExtras(missions.map(toMission)) : []
  const catalogClients = Object.fromEntries(
    clients.map(r => [r.slug, toClient(r)])
  )
  // Always include generated onboarding + freeops missions — PocketBase only seeds authored missions.
  const baseMissions = catalogMissions.length > 0 ? catalogMissions : generatedFallbackMissions
  const generatedMissions = generateMissions()
  const freeOpsMissions = generateFreeOpsMissions()
  const selfDirectedPoolMissions = generateSelfDirectedMiningPool()
  const pbIds = new Set(baseMissions.map(m => m.id))
  const generatedToMerge = generatedMissions.filter(m => !pbIds.has(m.id))
  const freeOpsIds = new Set(freeOpsMissions.map(m => m.id))
  const selfDirectedIds = new Set(selfDirectedPoolMissions.map(m => m.id))
  const allMissions = [
    ...baseMissions.filter(m => !freeOpsIds.has(m.id) && !selfDirectedIds.has(m.id)),
    ...generatedToMerge.filter(m => !freeOpsIds.has(m.id) && !selfDirectedIds.has(m.id)),
    ...freeOpsMissions,
    ...selfDirectedPoolMissions,
  ]

  return {
    targets: locations.filter(isSolarTarget).map(toTarget),
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
    // Merge static CLIENTS first so clients not yet seeded in PocketBase
    // (e.g. newly added M3 authored-mission clients) still resolve.
    clients: { ...CLIENTS, ...catalogClients },
    structures: structures.length > 0 ? structures.map(toStructure) : STRUCTURES,
  }
}
