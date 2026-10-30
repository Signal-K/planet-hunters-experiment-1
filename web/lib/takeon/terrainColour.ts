// Terrain colour engine for the Takeon surface (Liam, 2026-10-30: "everything looks icy").
//
// Replaces the SSL-501 blueprint reskin, which pushed every material onto one ice ramp.
// A body's look now comes from what it is made of (its biome profile: carbonaceous,
// stony, metallic, oxidised desert, sulfur volcanic, ice…) and its likely conditions:
// how cold it is (volatiles frost the ground), how hot (scorched and darkened), and how
// much air it has (an airless body has a black sky, a thin one a dusty sky, a thick one
// a hazy sky the colour of its clouds).
//
// Pure functions; the engine namespace is injected so this stays off the main bundle.

import { biomeProfileForTarget, type BiomeId, type SurfaceTarget } from '@/lib/data'

export type Ramp = readonly [top: string, side: string, shade: string]
export type Atmosphere = 'none' | 'thin' | 'thick'

export interface TerrainLook {
  /** Profile the look was built from (biome profile id). */
  profileId: string
  atmosphere: Atmosphere
  /** Loose surface: regolith, dust, sand. */
  ground: Ramp
  /** Bedrock: rock and basalt. */
  rock: Ramp
  sky: string
  skyNight: string
  /** Multiplier the engine applies to every terrain colour (frost, scorch). */
  tint: [number, number, number]
}

interface Composition {
  ground: string
  rock: string
  atmosphere: Atmosphere
  /** Daytime sky when the body has air; airless bodies get a black sky. */
  sky?: string
  /** Water or other ices near the surface, which frost over when cold. */
  volatiles?: boolean
}

/** What each biome profile is made of. Real bodies with their own profile come first. */
const COMPOSITION: Record<string, Composition> = {
  // Solar system bodies (PROFILE_BY_TARGET overrides).
  mars: { ground: '#b0603a', rock: '#7c4632', atmosphere: 'thin', sky: '#c49a72' },
  venus: { ground: '#8c6a44', rock: '#5c4636', atmosphere: 'thick', sky: '#d5ad62' },
  io: { ground: '#cdb84e', rock: '#8a6e36', atmosphere: 'none' },
  ceres: { ground: '#4d4945', rock: '#383532', atmosphere: 'none', volatiles: true },
  // Archetype profiles.
  'hot-rocky': { ground: '#7a726b', rock: '#57514c', atmosphere: 'none' },
  'rocky-planet': { ground: '#8a7967', rock: '#675b4f', atmosphere: 'thin', sky: '#a99a88' },
  volcanic: { ground: '#4a3e39', rock: '#2f2826', atmosphere: 'thick', sky: '#a8826a' },
  desert: { ground: '#c39560', rock: '#946c48', atmosphere: 'thin', sky: '#d4b48a' },
  'earth-like': { ground: '#86704f', rock: '#6a5f53', atmosphere: 'thick', sky: '#79acd8' },
  candidate: { ground: '#86704f', rock: '#6a5f53', atmosphere: 'thick', sky: '#79acd8' },
  'red-dwarf-candidate': { ground: '#7d5d48', rock: '#5c4a40', atmosphere: 'thick', sky: '#c4876a' },
  ocean: { ground: '#7a7266', rock: '#5a5650', atmosphere: 'thick', sky: '#6fa6d6' },
  'gas-giant': { ground: '#c4ab84', rock: '#977f60', atmosphere: 'thick', sky: '#d2bb94', volatiles: true },
  'rocky-moon': { ground: '#8e8b87', rock: '#686664', atmosphere: 'none' },
  'ice-moon': { ground: '#d3e2e8', rock: '#a08a74', atmosphere: 'none', volatiles: true },
  crystal: { ground: '#b5bfd6', rock: '#4d5068', atmosphere: 'none', volatiles: true },
  'titan-like': { ground: '#86663c', rock: '#5c4a32', atmosphere: 'thick', sky: '#c88d3c', volatiles: true },
  'c-type': { ground: '#3b3530', rock: '#2b2825', atmosphere: 'none', volatiles: true },
  'm-type': { ground: '#8b8c90', rock: '#67686d', atmosphere: 'none' },
  's-type': { ground: '#9a8770', rock: '#76695a', atmosphere: 'none' },
}

const FALLBACK: Composition = COMPOSITION['rocky-planet']
const AIRLESS_SKY = '#0b0e1a'
const AIRLESS_NIGHT = '#05070f'
const FROST = '#dfeaf0'
const SCORCH = '#3a2420'

/** Natural colours (top, shade) for every Landnam biome's surface voxel. */
export const NATURAL_BIOME_COLOUR: Record<BiomeId, readonly [string, string]> = {
  'dust-basin': ['#a49c90', '#7b766e'],
  'redrock-desert': ['#b5653a', '#83472b'],
  'crater-highlands': ['#8d8a86', '#5e5c59'],
  'frozen-tundra': ['#d4dde2', '#9fb0bc'],
  'grassland-plains': ['#7da35a', '#55713c'],
  'temperate-forest': ['#4f7d46', '#33552d'],
  icefield: ['#cfe6f0', '#8fbdd0'],
  cryovolcanic: ['#c9c6a8', '#8f8c70'],
  'carbonaceous-rubble': ['#4a443e', '#2e2a27'],
  'metallic-regolith': ['#9aa0aa', '#686e78'],
  'cloud-platform': ['#c9b896', '#97866a'],
  'salt-flats': ['#ece2df', '#c4aeb0'],
  'obsidian-shelf': ['#2b2438', '#151021'],
  'lava-fields': ['#3b2c28', '#1f1614'],
  'ash-plains': ['#6f6b70', '#454247'],
  'sulfur-flats': ['#d9c24a', '#a08c2a'],
  'basalt-columns': ['#3f4651', '#262c34'],
  'mesa-badlands': ['#b97a52', '#865438'],
  'iron-dunes': ['#b0482f', '#7a2e1f'],
  'glacier-shelf': ['#7fc3e6', '#3f7ea3'],
  'geyser-basin': ['#5fc3b6', '#2d8079'],
  'crystal-caverns': ['#9a8ccc', '#5d5390'],
  'methane-lakes': ['#4f4128', '#2e2616'],
  'storm-bands': ['#d1b688', '#9a7f58'],
  'aquifer-caverns': ['#3a5f8a', '#1f3552'],
  'lichen-steppe': ['#9aa26a', '#666d3f'],
  'tidal-flats': ['#6e9a92', '#3f655f'],
  'fungal-hollows': ['#8a6aa3', '#55406b'],
  'thermal-springs': ['#5ab3a0', '#2f7064'],
  'glow-caverns': ['#3fd6e8', '#1b7d8c'],
  'moss-meadow': ['#86c25a', '#557d33'],
  'coral-shallows': ['#e88b9c', '#3ca8b5'],
  'spore-forest': ['#8a6ac0', '#55407a'],
  'lumen-marsh': ['#7ce0bc', '#2f9070'],
  savanna: ['#c4a45a', '#8a7038'],
  'jungle-canopy': ['#2a7a48', '#164a2c'],
  'crimson-bloom': ['#c8405a', '#7a1f33'],
}

/** Ores and special materials keep their own mineral colour on every body. */
const MINERAL_RAMP: Record<string, Ramp> = {
  'Water ice': ['#cfe8f2', '#94c4da', '#6a9fba'],
  'Iron ore': ['#a8543a', '#7c3b28', '#58291d'],
  'Copper ore': ['#4fa08c', '#367563', '#255246'],
  'Titanium ore': ['#c4c8d0', '#9298a3', '#686e79'],
  Crystal: ['#a594de', '#7565b0', '#4f4380'],
  'Sulfur deposit': ['#dcc64e', '#a8922e', '#7a6820'],
  Snow: ['#eef3f6', '#c6d4dc', '#9fb2bf'],
  Grass: ['#6f9a50', '#4c6e36', '#344d26'],
}

/** Which stock Takeon materials are loose ground and which are bedrock. */
const GROUND_MATERIALS = new Set(['Regolith', 'Fine dust', 'Sand', 'Silica sand'])
const ROCK_MATERIALS = new Set(['Rock', 'Basalt'])

export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const k = Math.min(1, Math.max(0, t))
  const c = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, '0')
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`
}

function ramp(top: string): Ramp {
  return [top, mixHex(top, '#000000', 0.25), mixHex(top, '#000000', 0.45)]
}

/** How much cold volatiles frost the ground: none above -120 °C, up to 30% by -200 °C. */
export function frostAmount(temperature: number, volatiles: boolean): number {
  if (!volatiles) return 0
  return Math.min(0.3, Math.max(0, (-120 - temperature) / 80) * 0.3)
}

/** How much heat scorches the ground: none below 150 °C, up to 25% by 450 °C. */
export function scorchAmount(temperature: number): number {
  return Math.min(0.25, Math.max(0, (temperature - 150) / 300) * 0.25)
}

/** The look of a Landnam target's surface, from its composition and probable conditions. */
export function terrainLookForTarget(target: SurfaceTarget): TerrainLook {
  const profile = biomeProfileForTarget(target)
  const comp = COMPOSITION[profile.id] ?? FALLBACK
  const frost = frostAmount(profile.temperature, !!comp.volatiles)
  const scorch = scorchAmount(profile.temperature)
  const condition = (hex: string) => mixHex(mixHex(hex, FROST, frost), SCORCH, scorch)
  const ground = condition(comp.ground)
  const rock = condition(comp.rock)
  const sky = comp.atmosphere === 'none' ? AIRLESS_SKY : comp.sky ?? mixHex(ground, '#9fb6cc', 0.5)
  const skyNight = comp.atmosphere === 'none' ? AIRLESS_NIGHT : mixHex(sky, '#05070f', 0.82)
  // The engine tint nudges biome surfaces toward the same conditions; keep it mild.
  const tint: [number, number, number] = [
    1 + frost * 0.1 + scorch * 0.06,
    1 + frost * 0.12 - scorch * 0.08,
    1 + frost * 0.18 - scorch * 0.14,
  ]
  return { profileId: profile.id, atmosphere: comp.atmosphere, ground: ramp(ground), rock: ramp(rock), sky, skyNight, tint }
}

/** The look used when a field mounts with no Landnam target (stock Takeon body). */
export const DEFAULT_TERRAIN_LOOK: TerrainLook = {
  profileId: 'rocky-planet',
  atmosphere: 'thin',
  ground: ramp(FALLBACK.ground),
  rock: ramp(FALLBACK.rock),
  sky: FALLBACK.sky ?? '#a99a88',
  skyNight: mixHex(FALLBACK.sky ?? '#a99a88', '#05070f', 0.82),
  tint: [1, 1, 1],
}

export interface ColourableEngine {
  MATERIALS?: Record<number, { name: string; colors: string[] }>
}

const stockColours = new WeakMap<object, Map<number, string[]>>()

/**
 * Paint Takeon's stock materials for this body. The engine's material table is
 * shared, so the stock colours are kept on first use and every mount repaints
 * from them; biome materials (registered by Landnam) are left alone.
 */
export function applyTerrainLook(engine: ColourableEngine, look: TerrainLook): void {
  const materials = engine.MATERIALS
  if (!materials) return
  let stock = stockColours.get(materials)
  if (!stock) {
    stock = new Map(Object.entries(materials).map(([id, m]) => [Number(id), [...m.colors]]))
    stockColours.set(materials, stock)
  }
  for (const [id, m] of Object.entries(materials)) {
    const original = stock.get(Number(id))
    if (!original || m.name === 'Air') continue
    const mineral = MINERAL_RAMP[m.name]
    if (mineral) m.colors = [...mineral]
    else if (GROUND_MATERIALS.has(m.name)) m.colors = [...look.ground]
    else if (ROCK_MATERIALS.has(m.name)) m.colors = m.name === 'Basalt' ? look.rock.map(c => mixHex(c, '#000000', 0.18)) : [...look.rock]
  }
}
