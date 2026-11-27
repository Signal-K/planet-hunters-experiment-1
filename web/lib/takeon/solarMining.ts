import type { BodyDef, MaterialDef } from '@takeon/engine'
import { MINERAL_META } from '@/lib/data/minerals'
import { mixHex } from './terrainColour'

// Append-only allocation in the host-material range below Takeon's biome
// palette. Exact Landnam resource keys avoid the old many-to-one crystal map.
const MINERALS = ['iron', 'silicon', 'ice', 'carbon', 'nickel', 'cobalt', 'copper', 'aluminium', 'hydrogen', 'uranium', 'platinum', 'palladium', 'iridium', 'rhodium', 'gold', 'rare'] as const
const BASE = 32
export const SOLAR_MINING_MATERIALS = Object.fromEntries(MINERALS.map((id, index) => [id, BASE + index])) as Record<typeof MINERALS[number], number>

export function solarMiningResource(mineral: string): string { return `landnam:${mineral}` }
export function mineralFromSolarResource(resource: string): string | null {
  if (!resource.startsWith('landnam:')) return null
  const id = resource.slice('landnam:'.length)
  return Object.hasOwn(SOLAR_MINING_MATERIALS, id) ? id : null
}

export function registerSolarMiningMaterials(register: (def: MaterialDef) => unknown): void {
  for (const mineral of MINERALS) {
    const meta = MINERAL_META[mineral]
    const colour = meta.color
    register({ id: SOLAR_MINING_MATERIALS[mineral], name: meta.name, hardness: meta.laserAccess * 2,
      yields: { resource: solarMiningResource(mineral), amount: 1 },
      colors: [colour, mixHex(colour, '#302719', 0.3), mixHex(colour, '#101018', 0.5)], jitter: 0.1 })
  }
}

/** The body's composition, not the current contract, determines its ore. */
export function solarMiningBody(body: BodyDef, minerals: readonly string[]): BodyDef {
  const available = [...new Set(minerals)].filter(id => Object.hasOwn(SOLAR_MINING_MATERIALS, id))
  if (!available.length) throw new Error('No supported minerals for this location')
  const weights: Record<number, number> = {}
  for (const id of available) weights[SOLAR_MINING_MATERIALS[id as keyof typeof SOLAR_MINING_MATERIALS]] = 1
  // Takeon's ore roll scales richness by 0.16. Fields are small play areas,
  // so a gameplay-scaled floor keeps contract minerals discoverable.
  return { ...body, terrain: { ...body.terrain, oreRichness: Math.max(body.terrain.oreRichness, 2), bands: [{ from: 0, to: 1, minerals: weights }] } }
}
