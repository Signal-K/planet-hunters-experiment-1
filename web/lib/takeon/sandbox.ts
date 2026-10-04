// Landnam ↔ takeon sandbox bridge (SSL-316, SSL-317).
//
// Registers Landnam's sandbox structures (road, factory, silo), its biome
// materials, and its 38-biome palette with the takeon engine, and builds a
// per-target body override so a visited world rolls Landnam biomes gated by
// the target's habitability + life stage.
//
// The engine is injected (`SandboxEngine`) rather than imported so this module
// stays off the main bundle — TakeOnMount passes the dynamically imported
// `@takeon/engine` namespace — and so unit tests can pass a fake registry.

import type { BodyDef, BodyKind, Material, MaterialDef, StructureDef, StructureType } from '@takeon/engine'
import type { Biome } from '@takeon/engine'
import {
  BIOME_META,
  biomeIdsForTarget,
  biomeProfileForTarget,
  LANDNAM_BIOME_IDS,
  SANDBOX_STRUCTURE_RECIPES,
  type BiomeId,
  type LifeStage,
  type SurfaceTarget,
} from '@/lib/data'

export interface SandboxEngine {
  CUSTOM_MATERIAL_BASE: number
  registerStructure(def: StructureDef): StructureType
  registerMaterial(def: MaterialDef): Material
  registerBiome(biome: Biome): Biome
  registerBodyKind(kind: BodyKind): BodyKind
  getBodyKind(id: string): BodyKind | undefined
  listBodyKinds(): BodyKind[]
  getBody(id: string): BodyDef | undefined
  cloneBody(def: BodyDef): BodyDef
}

/** takeon built-in material ids used as subsurface fill under Landnam biomes. */
const TAKEON_MATERIAL = { regolith: 1, rock: 2, basalt: 3, ice: 4 } as const

/** Landnam sandbox structures that takeon does not ship. */
export const LANDNAM_STRUCTURE_DEFS: readonly StructureDef[] = [
  {
    type: 'road',
    name: 'Road segment',
    cost: {},
    description: 'Packed surface strip. Guides the rover and marks a route between structures.',
    category: 'decorative',
  },
  {
    type: 'factory',
    name: 'Factory',
    cost: {},
    description: 'Turns refined goods into rocket components on site.',
    category: 'functional',
  },
  {
    type: 'silo',
    name: 'Storage silo',
    cost: {},
    description: 'Holds raw ore until a cargo ferry collects it.',
    category: 'functional',
  },
]

/** Which takeon cargo resource a Landnam biome's surface voxel yields when drilled. */
const BIOME_YIELD: Partial<Record<BiomeId, { resource: string; amount: number }>> = {
  'salt-flats': { resource: 'silica', amount: 1 },
  'obsidian-shelf': { resource: 'stone', amount: 1 },
  'lava-fields': { resource: 'sulfur', amount: 1 },
  'ash-plains': { resource: 'sulfur', amount: 1 },
  'sulfur-flats': { resource: 'sulfur', amount: 2 },
  'basalt-columns': { resource: 'stone', amount: 2 },
  'mesa-badlands': { resource: 'iron', amount: 1 },
  'iron-dunes': { resource: 'iron', amount: 2 },
  'glacier-shelf': { resource: 'ice', amount: 2 },
  'geyser-basin': { resource: 'water', amount: 1 },
  'crystal-caverns': { resource: 'crystal', amount: 1 },
  'methane-lakes': { resource: 'ice', amount: 1 },
  'storm-bands': { resource: 'regolith', amount: 1 },
  'aquifer-caverns': { resource: 'water', amount: 2 },
  'tidal-flats': { resource: 'silica', amount: 1 },
  'thermal-springs': { resource: 'copper', amount: 1 },
  'glow-caverns': { resource: 'crystal', amount: 1 },
  'coral-shallows': { resource: 'silica', amount: 1 },
}

/** Gameplay-scaled °C windows so a biome only rolls where it makes sense. */
const BIOME_CLIMATE: Partial<Record<BiomeId, { min: number; max: number }>> = {
  'glacier-shelf': { min: -250, max: -30 },
  'methane-lakes': { min: -250, max: -120 },
  'frozen-tundra': { min: -120, max: 0 },
  'lava-fields': { min: 120, max: 600 },
  'ash-plains': { min: 60, max: 600 },
  'sulfur-flats': { min: 40, max: 600 },
  'obsidian-shelf': { min: 20, max: 600 },
  'storm-bands': { min: -200, max: 200 },
  'lichen-steppe': { min: -60, max: 30 },
  'moss-meadow': { min: -20, max: 40 },
  'savanna': { min: 10, max: 60 },
  'jungle-canopy': { min: 15, max: 50 },
  'coral-shallows': { min: 5, max: 45 },
  'tidal-flats': { min: -10, max: 50 },
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const n = Number.parseInt(value.length === 3 ? value.split('').map(c => c + c).join('') : value, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex).map(c => Math.round(c * factor))
  return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`
}

/** Stable custom material id for a Landnam biome (ids ≥ CUSTOM_MATERIAL_BASE). */
export function materialIdForBiome(biome: BiomeId, base: number): number {
  const index = LANDNAM_BIOME_IDS.indexOf(biome)
  if (index < 0) throw new Error(`${biome} is a takeon built-in biome; it has no Landnam material`)
  return base + index
}

export function materialDefForBiome(biome: BiomeId, base: number): MaterialDef {
  const meta = BIOME_META[biome]
  const yields = BIOME_YIELD[biome]
  return {
    id: materialIdForBiome(biome, base),
    name: meta.label,
    hardness: meta.lifeCapacity >= 2 ? 1 : 2,
    yields: yields ? { resource: yields.resource, amount: yields.amount } : null,
    colors: [meta.color, meta.shade, darken(meta.shade, 0.8)],
    jitter: meta.lifeCapacity >= 2 ? 0.16 : 0.1,
  }
}

export function biomeDefForBiome(biome: BiomeId, base: number): Biome {
  const meta = BIOME_META[biome]
  const surface = materialIdForBiome(biome, base)
  const [r, g, b] = hexToRgb(meta.color)
  const subsurface = meta.subsurface
    ? [TAKEON_MATERIAL.rock, TAKEON_MATERIAL.basalt]
    : meta.lifeCapacity >= 1
      ? [surface, TAKEON_MATERIAL.regolith]
      : biome === 'glacier-shelf' || biome === 'methane-lakes'
        ? [TAKEON_MATERIAL.ice, TAKEON_MATERIAL.rock]
        : [TAKEON_MATERIAL.rock]
  return {
    id: biome,
    label: meta.label,
    help: meta.help,
    surface: [surface],
    subsurface,
    climate: BIOME_CLIMATE[biome],
    // Tint is a multiplier on the body palette; keep it mild so biomes read
    // through the body's own identity rather than replacing it.
    tint: [0.7 + (r / 255) * 0.6, 0.7 + (g / 255) * 0.6, 0.7 + (b / 255) * 0.6],
  }
}

let registered: WeakSet<SandboxEngine> = new WeakSet()

/**
 * Register Landnam's structures, materials and biomes with the engine. Safe
 * to call repeatedly; each engine namespace is registered once per session.
 * Built-in structure costs are cleared because Landnam charges francs and
 * stash minerals itself (see `craftingAffordability`).
 */
export function registerLandnamSandbox(engine: SandboxEngine): void {
  if (registered.has(engine)) return
  registered.add(engine)
  for (const def of LANDNAM_STRUCTURE_DEFS) engine.registerStructure(def)
  for (const recipe of SANDBOX_STRUCTURE_RECIPES) {
    if (!recipe.takeonType || LANDNAM_STRUCTURE_DEFS.some(d => d.type === recipe.takeonType)) continue
    engine.registerStructure({
      type: recipe.takeonType,
      name: recipe.name,
      cost: {},
      description: recipe.description,
      category: recipe.decorative ? 'decorative' : 'functional',
    })
  }
  for (const biome of LANDNAM_BIOME_IDS) {
    engine.registerMaterial(materialDefForBiome(biome, engine.CUSTOM_MATERIAL_BASE))
    engine.registerBiome(biomeDefForBiome(biome, engine.CUSTOM_MATERIAL_BASE))
  }
}

/** Test hook: forget which engines were registered. */
export function resetLandnamSandboxRegistry(): void {
  registered = new WeakSet()
}

export function landnamBodyKindId(target: Pick<SurfaceTarget, 'id'>, lifeStage: LifeStage): string {
  return `landnam:${target.id}:${lifeStage}`
}

/**
 * Build the body takeon should mount for a Landnam target: the base takeon
 * body (for its size/terrain shape) with biome chunking on, the target's
 * climate, and a body kind whose allow-list is exactly the biomes the target
 * can show at its current life stage.
 */
export function buildLandnamBody(
  engine: SandboxEngine,
  baseBodyId: string,
  target: SurfaceTarget,
  lifeStage: LifeStage = 'dormant',
): BodyDef {
  registerLandnamSandbox(engine)
  const base = engine.getBody(baseBodyId)
  if (!base) throw new Error(`Unknown Takeon body: ${baseBodyId}`)
  const profile = biomeProfileForTarget(target)
  const allowedBiomes = biomeIdsForTarget(target, lifeStage)
  const kindId = landnamBodyKindId(target, lifeStage)
  const parentKind = engine.getBodyKind(base.kind ?? '') ?? engine.listBodyKinds()[0]
  engine.registerBodyKind({
    ...parentKind,
    id: kindId,
    label: profile.label,
    help: `Landnam biome set for ${target.id} (${lifeStage}).`,
    allowedBiomes,
  })
  const body = engine.cloneBody(base)
  body.id = `${baseBodyId}--${target.id}`
  body.kind = kindId
  body.terrain = { ...body.terrain, biomes: true }
  body.climate = { temperature: profile.temperature, tempVariance: profile.tempVariance }
  return body
}

/** Human copy for the build banner: what the rover is about to place. */
export function placementHint(type: StructureType | null): string {
  if (!type) return 'Select a structure, then tap BUILD to place it on the tile the rover faces.'
  const def = LANDNAM_STRUCTURE_DEFS.find(d => d.type === type)
  const recipe = SANDBOX_STRUCTURE_RECIPES.find(r => r.takeonType === type)
  const name = def?.name ?? recipe?.name ?? type
  return `Placing ${name} on the tile the rover faces. Drive to line it up, then tap BUILD.`
}
