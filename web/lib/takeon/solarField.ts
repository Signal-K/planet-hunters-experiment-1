import type { MaterialDef } from '@takeon/engine'
import { landingTerrain, type SolarLandingPreview } from './solarLandingPreview'
import { solarBiomeColour } from './solarBiomeColour'
import { mixHex, type Ramp } from './terrainColour'

// Append-only: ids are persisted in field snapshots and must fit in a byte.
const BODIES = ['mercury', 'venus', 'mars', 'eros', 'vesta', 'itokawa', 'ryugu', 'psyche', 'bennu', 'ceres', 'lutetia', 'europa'] as const
// New fields reuse a material slot: each engine instance has one body, and
// persisted solar snapshots carry their own palette. Existing IDs stay fixed.
const ADDITIONAL_BODIES = ['moon', 'phobos', 'deimos', 'io', 'ganymede', 'callisto', 'titan', 'enceladus', 'mimas', 'tethys', 'dione', 'rhea', 'iapetus', 'miranda', 'ariel', 'umbriel', 'titania', 'oberon', 'triton'] as const
export function supportsSolarField(bodyId: string): boolean { return BODIES.includes(bodyId as typeof BODIES[number]) || ADDITIONAL_BODIES.includes(bodyId as typeof ADDITIONAL_BODIES[number]) }
const GROUPS = ['regolith', 'ice', 'ice-ridges', 'tundra', 'ocean', 'grassland', 'drylands', 'methane-lakes', 'sulfur-plains', 'highlands', 'dark-regolith', 'volcanic-highlands'] as const
const BIOMES: Record<string, typeof GROUPS[number]> = {
  regolith: 'regolith', 'red-desert': 'regolith', dunes: 'regolith', 'metal-regolith': 'regolith',
  ice: 'ice', icefield: 'ice', 'ice-ridges': 'ice-ridges', tundra: 'tundra', ocean: 'ocean',
  grassland: 'grassland', drylands: 'drylands', 'methane-lakes': 'methane-lakes', 'sulfur-plains': 'sulfur-plains',
  highlands: 'highlands', 'crater-highlands': 'highlands', 'rubble-highlands': 'highlands', 'metal-ridges': 'highlands', 'volcanic-highlands': 'volcanic-highlands',
  'dark-regolith': 'dark-regolith',
}

/** Register stable per-body colours and map the sampled field to engine material ids. */
export function registerSolarFieldMaterials(bodyId: string, ground: Ramp, registerMaterial: (def: MaterialDef) => unknown) {
  const existing = BODIES.indexOf(bodyId as typeof BODIES[number])
  const body = existing >= 0 ? existing : ADDITIONAL_BODIES.includes(bodyId as typeof ADDITIONAL_BODIES[number]) ? 0 : -1
  if (body < 0) throw new Error(`No solar field material allocation for ${bodyId}`)
  const ids = Object.fromEntries(GROUPS.map((group, index) => [group, 110 + body * GROUPS.length + index])) as Record<typeof GROUPS[number], number>
  for (const group of GROUPS) {
    const colour = solarBiomeColour(group, ground)
    registerMaterial({ id: ids[group], name: `Solar ${bodyId} ${group}`, hardness: 2, yields: { resource: group === 'ice' || group === 'ice-ridges' ? 'ice' : 'regolith', amount: 1 }, colors: [colour, mixHex(colour, '#302719', 0.2), mixHex(colour, '#101018', 0.35)], jitter: 0.1 })
  }
  return ids
}

export function solarField(landing: SolarLandingPreview, ground: Ramp, registerMaterial: (def: MaterialDef) => unknown) {
  const ids = registerSolarFieldMaterials(landing.bodyId, ground, registerMaterial)
  return landingTerrain(landing, Object.fromEntries(Object.entries(BIOMES).map(([biome, group]) => [biome, ids[group]])))
}
