// Landnam game data — target biomes, habitability and divisions (SSL-317).
//
// Every target (planet, asteroid, exoplanet) is divided into biomes the way
// Sebastian Lague's procedural planet generator does it: a noise-driven
// elevation field on the sphere, a latitude-driven temperature band, and a
// per-body biome palette that maps (elevation, temperature) → biome. The
// same biome ids are registered into takeon (lib/takeon/sandbox.ts) so the
// sphere the player sees on approach uses the same vocabulary as the voxel
// field they land on.
//
// Biomes are deliberately loud — Starbound / Terraria / Minecraft loud —
// because a body should feel alive. Sterile biomes are mineral skins; latent
// biomes are where life *could* take hold (Mars's subsurface aquifers, a
// candidate exoplanet's tidal flats) and bloom into a living variant once
// the player has finished the tech tree and the SETI project (see the
// life-stage section). Bloomed biomes never appear before that.
//
// Each target is also cut into a fixed grid of *divisions* (latitude bands ×
// longitude sectors). Divisions are the ownership unit (see ownership.ts).

import type { Target } from './types'
import type { TargetArchetype } from './target-archetypes'

export type BiomeId =
  // takeon built-ins
  | 'dust-basin'
  | 'redrock-desert'
  | 'crater-highlands'
  | 'frozen-tundra'
  | 'grassland-plains'
  | 'temperate-forest'
  | 'icefield'
  | 'cryovolcanic'
  | 'carbonaceous-rubble'
  | 'metallic-regolith'
  | 'cloud-platform'
  // Landnam sterile skins
  | 'salt-flats'
  | 'obsidian-shelf'
  | 'lava-fields'
  | 'ash-plains'
  | 'sulfur-flats'
  | 'basalt-columns'
  | 'mesa-badlands'
  | 'iron-dunes'
  | 'glacier-shelf'
  | 'geyser-basin'
  | 'crystal-caverns'
  | 'methane-lakes'
  | 'storm-bands'
  // Landnam latent (life can take hold here)
  | 'aquifer-caverns'
  | 'lichen-steppe'
  | 'tidal-flats'
  | 'fungal-hollows'
  | 'thermal-springs'
  // Landnam living (bloomed, or native to earth-like worlds)
  | 'glow-caverns'
  | 'moss-meadow'
  | 'coral-shallows'
  | 'spore-forest'
  | 'lumen-marsh'
  | 'savanna'
  | 'jungle-canopy'
  | 'crimson-bloom'

/** 0 = sterile, 1 = life could take hold, 2 = living, 3 = dense biosphere. */
export type LifeCapacity = 0 | 1 | 2 | 3

export interface BiomeMeta {
  id: BiomeId
  label: string
  /** Sphere render colour (data-only palette, like MINERAL_META). */
  color: string
  /** Slightly darker shade for shadowed/low-elevation pixels. */
  shade: string
  help: string
  lifeCapacity: LifeCapacity
  /** Living biome this latent biome turns into once life blooms on the body. */
  bloomsInto?: BiomeId
  /** True for biomes that only exist underground (Mars-style subsurface life). */
  subsurface?: boolean
}

export const BIOME_META: Record<BiomeId, BiomeMeta> = {
  // ── takeon built-ins ──
  'dust-basin': { id: 'dust-basin', label: 'Dust basin', color: '#a8a39a', shade: '#7f7b74', help: 'Fine wind-blown dust filling low ground.', lifeCapacity: 0 },
  'redrock-desert': { id: 'redrock-desert', label: 'Redrock desert', color: '#c1683f', shade: '#8d4a2c', help: 'Oxidised regolith and drifted dust.', lifeCapacity: 0 },
  'crater-highlands': { id: 'crater-highlands', label: 'Crater highlands', color: '#8d8a86', shade: '#5e5c59', help: 'Older, impact-churned rubble.', lifeCapacity: 0 },
  'frozen-tundra': { id: 'frozen-tundra', label: 'Frozen tundra', color: '#d9e3ea', shade: '#9fb0bc', help: 'Snow-crusted ground over frozen regolith.', lifeCapacity: 1, bloomsInto: 'moss-meadow' },
  'grassland-plains': { id: 'grassland-plains', label: 'Grassland plains', color: '#7db35a', shade: '#557d3c', help: 'Open temperate ground cover.', lifeCapacity: 2 },
  'temperate-forest': { id: 'temperate-forest', label: 'Temperate forest', color: '#4f8a46', shade: '#33602d', help: 'Mixed canopy broken by exposed rock.', lifeCapacity: 3 },
  'icefield': { id: 'icefield', label: 'Icefield', color: '#cfe9f4', shade: '#8fbdd0', help: 'Solid ice sheet, cracked and wind-scoured.', lifeCapacity: 0 },
  'cryovolcanic': { id: 'cryovolcanic', label: 'Cryovolcanic', color: '#b8c9c0', shade: '#7d9489', help: 'Ice fractured by sulfur-stained vents.', lifeCapacity: 1, bloomsInto: 'lumen-marsh' },
  'carbonaceous-rubble': { id: 'carbonaceous-rubble', label: 'Carbonaceous rubble', color: '#4a4b50', shade: '#2d2e32', help: 'Dark, volatile-rich rubble pile.', lifeCapacity: 0 },
  'metallic-regolith': { id: 'metallic-regolith', label: 'Metallic regolith', color: '#9aa3b4', shade: '#66707f', help: 'Rubble with a nickel-iron sheen.', lifeCapacity: 0 },
  'cloud-platform': { id: 'cloud-platform', label: 'Cloud platform', color: '#8a92b8', shade: '#5a6285', help: 'Storm-grey cloud-top platform.', lifeCapacity: 0 },

  // ── sterile skins ──
  'salt-flats': { id: 'salt-flats', label: 'Salt flats', color: '#f1e4e8', shade: '#c9a9b6', help: 'Blinding pink-white evaporite crust where an ocean used to be.', lifeCapacity: 0 },
  'obsidian-shelf': { id: 'obsidian-shelf', label: 'Obsidian shelf', color: '#2b2438', shade: '#151021', help: 'Glassy black volcanic plate, shot through with violet fractures.', lifeCapacity: 0 },
  'lava-fields': { id: 'lava-fields', label: 'Lava fields', color: '#ff6a2a', shade: '#8c2a10', help: 'Fresh basalt flows with glowing channels still open.', lifeCapacity: 0 },
  'ash-plains': { id: 'ash-plains', label: 'Ash plains', color: '#6f6b70', shade: '#454247', help: 'Metres of fine grey ashfall, soft underfoot.', lifeCapacity: 0 },
  'sulfur-flats': { id: 'sulfur-flats', label: 'Sulfur flats', color: '#e8d24a', shade: '#a99424', help: 'Vivid yellow sulfur crust around dead fumaroles.', lifeCapacity: 0 },
  'basalt-columns': { id: 'basalt-columns', label: 'Basalt columns', color: '#3f4a5c', shade: '#26303f', help: 'Hexagonal columnar basalt stepping down into the dark.', lifeCapacity: 0 },
  'mesa-badlands': { id: 'mesa-badlands', label: 'Mesa badlands', color: '#d98a4a', shade: '#8f4b7a', help: 'Banded orange and purple clay, cut into flat-topped mesas.', lifeCapacity: 0 },
  'iron-dunes': { id: 'iron-dunes', label: 'Iron dunes', color: '#b8442e', shade: '#7a2b1c', help: 'Rust-red hematite sand heaped into long dunes.', lifeCapacity: 0 },
  'glacier-shelf': { id: 'glacier-shelf', label: 'Glacier shelf', color: '#7fc3e6', shade: '#3f7ea3', help: 'Deep blue glacial ice, calving into crevasse fields.', lifeCapacity: 0 },
  'geyser-basin': { id: 'geyser-basin', label: 'Geyser basin', color: '#5fd3c8', shade: '#2d8a86', help: 'Turquoise mineral pools and steaming vent cones.', lifeCapacity: 1, bloomsInto: 'lumen-marsh' },
  'crystal-caverns': { id: 'crystal-caverns', label: 'Crystal caverns', color: '#a878e8', shade: '#5e3f9c', help: 'Violet quartz spires growing out of collapsed cave roofs.', lifeCapacity: 0 },
  'methane-lakes': { id: 'methane-lakes', label: 'Methane lakes', color: '#c9903a', shade: '#7a5320', help: 'Amber hydrocarbon lakes under an orange haze.', lifeCapacity: 0 },
  'storm-bands': { id: 'storm-bands', label: 'Storm bands', color: '#d9a869', shade: '#8a5a3a', help: 'Cream and ochre cloud bands whipped into vortices.', lifeCapacity: 0 },

  // ── latent (life could take hold) ──
  'aquifer-caverns': { id: 'aquifer-caverns', label: 'Aquifer caverns', color: '#3a5f8a', shade: '#1f3552', help: 'Subsurface caverns with briny liquid water. Shielded from radiation; life could take hold here.', lifeCapacity: 1, bloomsInto: 'glow-caverns', subsurface: true },
  'lichen-steppe': { id: 'lichen-steppe', label: 'Lichen steppe', color: '#9aa76a', shade: '#66713f', help: 'Cold flat ground with a thin crust of lichen-like growth.', lifeCapacity: 1, bloomsInto: 'moss-meadow' },
  'tidal-flats': { id: 'tidal-flats', label: 'Tidal flats', color: '#6ea6a0', shade: '#3f6f6a', help: 'Shallow, warm, mineral-rich water over dark mud. Prime ground for life.', lifeCapacity: 1, bloomsInto: 'coral-shallows' },
  'fungal-hollows': { id: 'fungal-hollows', label: 'Fungal hollows', color: '#8a6aa3', shade: '#55406b', help: 'Damp, sheltered hollows with a mauve mycelial mat.', lifeCapacity: 1, bloomsInto: 'spore-forest' },
  'thermal-springs': { id: 'thermal-springs', label: 'Thermal springs', color: '#5ac1a8', shade: '#2f7a69', help: 'Warm mineral springs; the first place chemistry becomes biology.', lifeCapacity: 1, bloomsInto: 'lumen-marsh' },

  // ── living ──
  'glow-caverns': { id: 'glow-caverns', label: 'Glow caverns', color: '#3fd6e8', shade: '#1b7d8c', help: 'Bioluminescent cavern mats lighting the aquifers cyan.', lifeCapacity: 2, subsurface: true },
  'moss-meadow': { id: 'moss-meadow', label: 'Moss meadow', color: '#8fd35a', shade: '#578a33', help: 'Bright moss carpets and low cushion plants.', lifeCapacity: 2 },
  'coral-shallows': { id: 'coral-shallows', label: 'Coral shallows', color: '#ff8fa6', shade: '#3ca8b5', help: 'Pink reef structures in turquoise shallows.', lifeCapacity: 3 },
  'spore-forest': { id: 'spore-forest', label: 'Spore forest', color: '#c56ee0', shade: '#6f3a85', help: 'Towering violet fungal caps drifting spores into the air.', lifeCapacity: 3 },
  'lumen-marsh': { id: 'lumen-marsh', label: 'Lumen marsh', color: '#7cf0c4', shade: '#2f9a78', help: 'Glowing wetland of reeds and drifting light.', lifeCapacity: 3 },
  'savanna': { id: 'savanna', label: 'Savanna', color: '#d4b85a', shade: '#8e7a2e', help: 'Golden grassland dotted with broad trees.', lifeCapacity: 2 },
  'jungle-canopy': { id: 'jungle-canopy', label: 'Jungle canopy', color: '#1f8a4c', shade: '#0f4f2c', help: 'Dense, humid rainforest canopy.', lifeCapacity: 3 },
  'crimson-bloom': { id: 'crimson-bloom', label: 'Crimson bloom', color: '#e0405a', shade: '#8a1f33', help: 'Red-pigmented alien vegetation adapted to a dim host star.', lifeCapacity: 3 },
}

export const BIOME_IDS = Object.keys(BIOME_META) as BiomeId[]
export const TAKEON_BUILTIN_BIOME_IDS: readonly BiomeId[] = [
  'dust-basin', 'redrock-desert', 'crater-highlands', 'frozen-tundra', 'grassland-plains', 'temperate-forest',
  'icefield', 'cryovolcanic', 'carbonaceous-rubble', 'metallic-regolith', 'cloud-platform',
]
export const LANDNAM_BIOME_IDS: readonly BiomeId[] = BIOME_IDS.filter(id => !TAKEON_BUILTIN_BIOME_IDS.includes(id))

/** takeon body kind ids (world/kinds.js). */
export type TakeonBodyKind =
  | 'rocky-planet'
  | 'earth-like'
  | 'gaseous'
  | 'rocky-moon'
  | 'ice-moon'
  | 'c-type-asteroid'
  | 'm-type-asteroid'
  | 's-type-asteroid'

export interface BiomeBand {
  /** Upper bound of the normalised temperature (0 = coldest pole, 1 = hottest equator) for this band. */
  maxTemp: number
  /** Biome used at low elevation / high elevation within the band. */
  low: BiomeId
  high: BiomeId
}

export interface BiomeProfile {
  id: string
  label: string
  kind: TakeonBodyKind
  /** Mean surface temperature in °C, passed to takeon's body climate. */
  temperature: number
  tempVariance: number
  /** Latitude bands, coldest first. */
  bands: readonly BiomeBand[]
  /** Elevation threshold separating low/high biome within a band. */
  ridge: number
  /** Noise roughness (octave gain); asteroids are lumpier than planets. */
  roughness: number
  /** Biome that lines the body underground (voxel field subsurface). */
  subsurfaceBiome?: BiomeId
}

const ROCKY_PLANET: BiomeProfile = {
  id: 'rocky-planet', label: 'Rocky world', kind: 'rocky-planet',
  temperature: -60, tempVariance: 0.5, ridge: 0.56, roughness: 0.5,
  bands: [
    { maxTemp: 0.22, low: 'frozen-tundra', high: 'glacier-shelf' },
    { maxTemp: 0.55, low: 'dust-basin', high: 'crater-highlands' },
    { maxTemp: 1, low: 'redrock-desert', high: 'mesa-badlands' },
  ],
}

const MARS: BiomeProfile = {
  id: 'mars', label: 'Cold desert world', kind: 'rocky-planet',
  temperature: -60, tempVariance: 0.5, ridge: 0.58, roughness: 0.5,
  subsurfaceBiome: 'aquifer-caverns',
  bands: [
    { maxTemp: 0.2, low: 'frozen-tundra', high: 'glacier-shelf' },
    { maxTemp: 0.5, low: 'iron-dunes', high: 'crater-highlands' },
    { maxTemp: 0.8, low: 'redrock-desert', high: 'mesa-badlands' },
    { maxTemp: 1, low: 'iron-dunes', high: 'basalt-columns' },
  ],
}

const HOT_ROCKY_PLANET: BiomeProfile = {
  id: 'hot-rocky', label: 'Scorched world', kind: 'rocky-planet',
  temperature: 160, tempVariance: 0.4, ridge: 0.55, roughness: 0.55,
  bands: [
    { maxTemp: 0.18, low: 'ash-plains', high: 'crater-highlands' },
    { maxTemp: 0.6, low: 'redrock-desert', high: 'obsidian-shelf' },
    { maxTemp: 1, low: 'lava-fields', high: 'sulfur-flats' },
  ],
}

const VOLCANIC_WORLD: BiomeProfile = {
  id: 'volcanic', label: 'Volcanic world', kind: 'rocky-planet',
  temperature: 90, tempVariance: 0.5, ridge: 0.5, roughness: 0.6,
  bands: [
    { maxTemp: 0.3, low: 'ash-plains', high: 'basalt-columns' },
    { maxTemp: 0.7, low: 'obsidian-shelf', high: 'sulfur-flats' },
    { maxTemp: 1, low: 'lava-fields', high: 'obsidian-shelf' },
  ],
}

const DESERT_WORLD: BiomeProfile = {
  id: 'desert', label: 'Desert world', kind: 'rocky-planet',
  temperature: 30, tempVariance: 0.6, ridge: 0.55, roughness: 0.5,
  bands: [
    { maxTemp: 0.25, low: 'salt-flats', high: 'crater-highlands' },
    { maxTemp: 0.6, low: 'iron-dunes', high: 'mesa-badlands' },
    { maxTemp: 1, low: 'salt-flats', high: 'mesa-badlands' },
  ],
}

const EARTH_LIKE: BiomeProfile = {
  id: 'earth-like', label: 'Temperate world', kind: 'earth-like',
  temperature: 14, tempVariance: 0.6, ridge: 0.6, roughness: 0.45,
  subsurfaceBiome: 'aquifer-caverns',
  bands: [
    { maxTemp: 0.2, low: 'frozen-tundra', high: 'glacier-shelf' },
    { maxTemp: 0.45, low: 'temperate-forest', high: 'frozen-tundra' },
    { maxTemp: 0.7, low: 'grassland-plains', high: 'temperate-forest' },
    { maxTemp: 0.88, low: 'savanna', high: 'jungle-canopy' },
    { maxTemp: 1, low: 'coral-shallows', high: 'jungle-canopy' },
  ],
}

/** Candidate exoplanet: right size and temperature, life not yet started. */
const CANDIDATE_WORLD: BiomeProfile = {
  id: 'candidate', label: 'Habitable candidate', kind: 'earth-like',
  temperature: 8, tempVariance: 0.6, ridge: 0.58, roughness: 0.45,
  subsurfaceBiome: 'aquifer-caverns',
  bands: [
    { maxTemp: 0.2, low: 'frozen-tundra', high: 'glacier-shelf' },
    { maxTemp: 0.45, low: 'lichen-steppe', high: 'frozen-tundra' },
    { maxTemp: 0.7, low: 'tidal-flats', high: 'lichen-steppe' },
    { maxTemp: 0.88, low: 'fungal-hollows', high: 'geyser-basin' },
    { maxTemp: 1, low: 'tidal-flats', high: 'mesa-badlands' },
  ],
}

/** Candidate around a dim red dwarf: cold, tidally-locked feel, red-shifted palette once it blooms. */
const RED_DWARF_CANDIDATE: BiomeProfile = {
  id: 'red-dwarf-candidate', label: 'Dim-star candidate', kind: 'earth-like',
  temperature: -5, tempVariance: 0.4, ridge: 0.55, roughness: 0.5,
  subsurfaceBiome: 'aquifer-caverns',
  bands: [
    { maxTemp: 0.35, low: 'glacier-shelf', high: 'frozen-tundra' },
    { maxTemp: 0.7, low: 'lichen-steppe', high: 'basalt-columns' },
    { maxTemp: 1, low: 'thermal-springs', high: 'fungal-hollows' },
  ],
}

const OCEAN_WORLD: BiomeProfile = {
  id: 'ocean', label: 'Ocean world', kind: 'earth-like',
  temperature: 12, tempVariance: 0.4, ridge: 0.66, roughness: 0.4,
  bands: [
    { maxTemp: 0.25, low: 'glacier-shelf', high: 'icefield' },
    { maxTemp: 0.7, low: 'tidal-flats', high: 'salt-flats' },
    { maxTemp: 1, low: 'tidal-flats', high: 'geyser-basin' },
  ],
}

const GAS_GIANT: BiomeProfile = {
  id: 'gas-giant', label: 'Gas giant', kind: 'gaseous',
  temperature: -140, tempVariance: 0.3, ridge: 0.5, roughness: 0.2,
  bands: [
    { maxTemp: 0.4, low: 'cloud-platform', high: 'storm-bands' },
    { maxTemp: 1, low: 'storm-bands', high: 'cloud-platform' },
  ],
}

const ROCKY_MOON: BiomeProfile = {
  id: 'rocky-moon', label: 'Rocky moon', kind: 'rocky-moon',
  temperature: -50, tempVariance: 0.7, ridge: 0.55, roughness: 0.55,
  bands: [
    { maxTemp: 0.3, low: 'dust-basin', high: 'crater-highlands' },
    { maxTemp: 1, low: 'crater-highlands', high: 'metallic-regolith' },
  ],
}

const ICE_MOON: BiomeProfile = {
  id: 'ice-moon', label: 'Ice world', kind: 'ice-moon',
  temperature: -160, tempVariance: 0.2, ridge: 0.58, roughness: 0.4,
  subsurfaceBiome: 'aquifer-caverns',
  bands: [
    { maxTemp: 0.5, low: 'icefield', high: 'glacier-shelf' },
    { maxTemp: 1, low: 'icefield', high: 'cryovolcanic' },
  ],
}

const CRYSTAL_WORLD: BiomeProfile = {
  id: 'crystal', label: 'Crystal world', kind: 'ice-moon',
  temperature: -120, tempVariance: 0.3, ridge: 0.52, roughness: 0.6,
  bands: [
    { maxTemp: 0.4, low: 'glacier-shelf', high: 'crystal-caverns' },
    { maxTemp: 1, low: 'crystal-caverns', high: 'basalt-columns' },
  ],
}

const TITAN_LIKE: BiomeProfile = {
  id: 'titan-like', label: 'Hydrocarbon world', kind: 'ice-moon',
  temperature: -180, tempVariance: 0.2, ridge: 0.55, roughness: 0.4,
  bands: [
    { maxTemp: 0.5, low: 'methane-lakes', high: 'icefield' },
    { maxTemp: 1, low: 'methane-lakes', high: 'iron-dunes' },
  ],
}

const C_TYPE: BiomeProfile = {
  id: 'c-type', label: 'Carbonaceous asteroid', kind: 'c-type-asteroid',
  temperature: -100, tempVariance: 0.1, ridge: 0.5, roughness: 0.7,
  bands: [
    { maxTemp: 0.35, low: 'icefield', high: 'carbonaceous-rubble' },
    { maxTemp: 1, low: 'carbonaceous-rubble', high: 'carbonaceous-rubble' },
  ],
}

const M_TYPE: BiomeProfile = {
  id: 'm-type', label: 'Metallic asteroid', kind: 'm-type-asteroid',
  temperature: -80, tempVariance: 0.1, ridge: 0.5, roughness: 0.7,
  bands: [{ maxTemp: 1, low: 'metallic-regolith', high: 'metallic-regolith' }],
}

const S_TYPE: BiomeProfile = {
  id: 's-type', label: 'Stony asteroid', kind: 's-type-asteroid',
  temperature: -90, tempVariance: 0.1, ridge: 0.52, roughness: 0.7,
  bands: [
    { maxTemp: 0.4, low: 'carbonaceous-rubble', high: 'metallic-regolith' },
    { maxTemp: 1, low: 'metallic-regolith', high: 'carbonaceous-rubble' },
  ],
}

export const BIOME_PROFILES: readonly BiomeProfile[] = [
  ROCKY_PLANET, MARS, HOT_ROCKY_PLANET, VOLCANIC_WORLD, DESERT_WORLD, EARTH_LIKE, CANDIDATE_WORLD,
  RED_DWARF_CANDIDATE, OCEAN_WORLD, GAS_GIANT, ROCKY_MOON, ICE_MOON, CRYSTAL_WORLD, TITAN_LIKE, C_TYPE, M_TYPE, S_TYPE,
]

/** Per-target overrides for real bodies whose character the archetype alone does not capture. */
const PROFILE_BY_TARGET: Record<string, BiomeProfile> = {
  mercury: HOT_ROCKY_PLANET,
  venus: { ...VOLCANIC_WORLD, id: 'venus', label: 'Runaway greenhouse', temperature: 460 },
  mars: MARS,
  moon: ROCKY_MOON,
  europa: ICE_MOON,
  ceres: { ...C_TYPE, id: 'ceres', label: 'Dwarf planet', roughness: 0.45, bands: [
    { maxTemp: 0.4, low: 'icefield', high: 'carbonaceous-rubble' },
    { maxTemp: 1, low: 'carbonaceous-rubble', high: 'salt-flats' },
  ] },
  jupiter: GAS_GIANT,
  io: { ...ROCKY_MOON, id: 'io', label: 'Volcanic moon', bands: [
    { maxTemp: 0.5, low: 'sulfur-flats', high: 'crater-highlands' },
    { maxTemp: 1, low: 'lava-fields', high: 'sulfur-flats' },
  ] },
}

function profileForArchetype(archetype: TargetArchetype | undefined, type: Target['type']): BiomeProfile {
  switch (archetype) {
    case 'C': return C_TYPE
    case 'M': return M_TYPE
    case 'icy': return ICE_MOON
    case 'S': return type === 'asteroid' ? S_TYPE : ROCKY_PLANET
    case 'gas-giant': return GAS_GIANT
    default: return type === 'asteroid' ? S_TYPE : ROCKY_PLANET
  }
}

// ── Habitability ───────────────────────────────────────────────────────────

export type Habitability = 'sterile' | 'subsurface' | 'candidate' | 'living'

export interface HabitabilityReport {
  habitability: Habitability
  /** Estimated equilibrium temperature in Kelvin (exoplanets only). */
  equilibriumTempK?: number
  /** Plain-language fictional terrain constraints life must satisfy on this body. */
  constraints: string[]
}

export const HABITABILITY_LABELS: Record<Habitability, string> = {
  sterile: 'Sterile',
  subsurface: 'Subsurface habitable',
  candidate: 'Habitable candidate',
  living: 'Living world',
}

/** Sun-normalised equilibrium temperature from period + host Teff. A heuristic, not astrophysics. */
export function estimateEquilibriumTempK(periodDays: number, starTeffK: number): number {
  const teffRatio = starTeffK / 5772
  const starRadius = Math.pow(teffRatio, 0.8)           // main-sequence R ∝ Teff^0.8
  const starMass = Math.pow(teffRatio, 1.1)             // rough M–Teff relation
  const luminosity = starRadius * starRadius * Math.pow(teffRatio, 4)
  const aAu = Math.pow(periodDays / 365.25, 2 / 3) * Math.cbrt(starMass)
  return 278 * Math.pow(luminosity, 0.25) / Math.sqrt(Math.max(0.01, aAu))
}

/** Radius in Earth radii and equilibrium temperature bounds for a rocky, temperate candidate. */
export const HABITABLE_RADIUS_EARTH = { min: 0.5, max: 1.8 }
export const HABITABLE_TEMP_K = { min: 195, max: 335 }

const SUBSURFACE_HABITABLE_TARGETS = new Set(['mars', 'europa', 'ceres'])

export function habitabilityForTarget(target: Pick<Target, 'id' | 'type' | 'archetype' | 'planetRadiusEarth' | 'periodDays' | 'starTeffK'>): HabitabilityReport {
  if (target.type === 'exoplanet') {
    if (target.archetype === 'gas-giant') {
      return { habitability: 'sterile', constraints: ['No solid surface. Cloud platforms only.'] }
    }
    const radius = target.planetRadiusEarth
    const period = target.periodDays
    const teff = target.starTeffK
    if (radius == null || period == null || teff == null) {
      return { habitability: 'sterile', constraints: ['Insufficient transit data to assess habitability.'] }
    }
    const equilibriumTempK = estimateEquilibriumTempK(period, teff)
    const rockySize = radius >= HABITABLE_RADIUS_EARTH.min && radius <= HABITABLE_RADIUS_EARTH.max
    const temperate = equilibriumTempK >= HABITABLE_TEMP_K.min && equilibriumTempK <= HABITABLE_TEMP_K.max
    if (rockySize && temperate) {
      const dimHost = teff < 3700
      return {
        habitability: 'candidate',
        equilibriumTempK,
        constraints: [
          'Liquid water only in tidal flats and thermal springs.',
          dimHost ? 'Dim host star: life needs the warm sub-stellar band.' : 'Temperate mid-latitude band only.',
          'Aquifer caverns shield early life from stellar flux.',
          'Blooms only after the SETI programme and full tech tree.',
        ],
      }
    }
    const constraints: string[] = []
    if (!rockySize) constraints.push(radius > HABITABLE_RADIUS_EARTH.max ? 'Too massive: thick envelope, no stable surface.' : 'Too small to hold an atmosphere.')
    if (!temperate) constraints.push(equilibriumTempK > HABITABLE_TEMP_K.max ? 'Equilibrium temperature too hot for liquid water.' : 'Equilibrium temperature too cold for liquid water.')
    return { habitability: 'sterile', equilibriumTempK, constraints }
  }
  if (SUBSURFACE_HABITABLE_TARGETS.has(target.id)) {
    return {
      habitability: 'subsurface',
      constraints: [
        'Surface is sterile: radiation and near-vacuum.',
        'Life is limited to aquifer caverns underground.',
        'Needs a drill rig and a sealed habitat to seed.',
        'Blooms only after the SETI programme and full tech tree.',
      ],
    }
  }
  return { habitability: 'sterile', constraints: ['No liquid water, no shielding, no biosphere.'] }
}

/** Exoplanets discovered by TESS: profile picked from habitability first, then a seeded roll for flavour. */
function profileForExoplanet(target: Pick<Target, 'id' | 'type' | 'archetype' | 'planetRadiusEarth' | 'periodDays' | 'starTeffK'>): BiomeProfile {
  const seed = stableSeed(target.id)
  const roll = (seed % 1000) / 1000
  const report = habitabilityForTarget(target)
  if (report.habitability === 'candidate') {
    if ((target.starTeffK ?? 5772) < 3700) return RED_DWARF_CANDIDATE
    return roll < 0.3 ? OCEAN_WORLD : CANDIDATE_WORLD
  }
  if (target.archetype === 'gas-giant') return GAS_GIANT
  const hot = (report.equilibriumTempK ?? 250) > HABITABLE_TEMP_K.max
  const cold = (report.equilibriumTempK ?? 250) < HABITABLE_TEMP_K.min
  if (hot) return roll < 0.5 ? HOT_ROCKY_PLANET : VOLCANIC_WORLD
  if (cold) {
    if (roll < 0.35) return ICE_MOON
    if (roll < 0.65) return CRYSTAL_WORLD
    return TITAN_LIKE
  }
  return roll < 0.5 ? DESERT_WORLD : ROCKY_PLANET
}

export function biomeProfileForTarget(target: Pick<Target, 'id' | 'type' | 'archetype' | 'planetRadiusEarth' | 'periodDays' | 'starTeffK'>): BiomeProfile {
  const override = PROFILE_BY_TARGET[target.id]
  if (override) return override
  if (target.type === 'exoplanet') return profileForExoplanet(target)
  return profileForArchetype(target.archetype, target.type)
}

// ── Life stage ─────────────────────────────────────────────────────────────

export type LifeStage = 'sterile' | 'dormant' | 'blooming' | 'thriving'

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  sterile: 'Sterile',
  dormant: 'Dormant',
  blooming: 'Blooming',
  thriving: 'Thriving',
}

/** Time after seeding before a body moves from blooming to thriving. */
export const LIFE_THRIVE_AFTER_MS = 45 * 60 * 1000

export interface BiosphereSeed {
  targetId: string
  seededAt: number
}

export interface LifeGate {
  /** All skill-tree nodes unlocked. */
  techTreeComplete: boolean
  /** SETI programme (Zooniverse) completed. */
  setiComplete: boolean
}

export function canSeedBiosphere(gate: LifeGate, habitability: Habitability): boolean {
  return gate.techTreeComplete && gate.setiComplete && (habitability === 'candidate' || habitability === 'subsurface')
}

export function lifeStageForTarget(
  target: Pick<Target, 'id' | 'type' | 'archetype' | 'planetRadiusEarth' | 'periodDays' | 'starTeffK'>,
  seed: BiosphereSeed | undefined,
  now = Date.now(),
): LifeStage {
  const { habitability } = habitabilityForTarget(target)
  if (habitability === 'sterile') return 'sterile'
  if (habitability === 'living') return 'thriving'
  if (!seed) return 'dormant'
  return now - seed.seededAt >= LIFE_THRIVE_AFTER_MS ? 'thriving' : 'blooming'
}

/** Resolve a latent biome to its living form for the given stage. Blooming only converts the warmer half of the band. */
export function bloomBiome(biome: BiomeId, stage: LifeStage, temperature: number): BiomeId {
  const meta = BIOME_META[biome]
  if (!meta.bloomsInto) return biome
  if (stage === 'thriving') return meta.bloomsInto
  if (stage === 'blooming' && temperature >= 0.45) return meta.bloomsInto
  return biome
}

// ── Noise ──────────────────────────────────────────────────────────────────

export function stableSeed(value: string): number {
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

function hash3(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647 ^ 1274126177) ^ seed
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Value noise on a 3D lattice, 0..1. */
function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const c000 = hash3(xi, yi, zi, seed), c100 = hash3(xi + 1, yi, zi, seed)
  const c010 = hash3(xi, yi + 1, zi, seed), c110 = hash3(xi + 1, yi + 1, zi, seed)
  const c001 = hash3(xi, yi, zi + 1, seed), c101 = hash3(xi + 1, yi, zi + 1, seed)
  const c011 = hash3(xi, yi + 1, zi + 1, seed), c111 = hash3(xi + 1, yi + 1, zi + 1, seed)
  const x00 = lerp(c000, c100, xf), x10 = lerp(c010, c110, xf)
  const x01 = lerp(c001, c101, xf), x11 = lerp(c011, c111, xf)
  const y0 = lerp(x00, x10, yf), y1 = lerp(x01, x11, yf)
  return lerp(y0, y1, zf)
}

/** Fractal Brownian motion over the unit sphere, 0..1. */
export function fbmOnSphere(px: number, py: number, pz: number, seed: number, roughness: number, octaves = 4): number {
  let amp = 1, freq = 2.2, sum = 0, norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise3(px * freq + 17.3, py * freq + 9.1, pz * freq + 4.7, seed + i * 101)
    norm += amp
    amp *= roughness
    freq *= 2.1
  }
  return sum / norm
}

// ── Sampling ───────────────────────────────────────────────────────────────

export interface SurfaceSample {
  biome: BiomeId
  /** 0..1 normalised elevation. */
  elevation: number
  /** 0..1 normalised temperature (poles → equator). */
  temperature: number
}

export type SurfaceTarget = Pick<Target, 'id' | 'type' | 'archetype' | 'planetRadiusEarth' | 'periodDays' | 'starTeffK'>

/**
 * Sample the biome at a unit-sphere point. `lat` in radians (-π/2..π/2),
 * `lon` in radians. Elevation comes from fbm; temperature from |lat| blended
 * with a little noise so bands are not perfectly straight. A `lifeStage`
 * swaps latent biomes for their bloomed forms.
 */
export function sampleSurface(target: SurfaceTarget, lat: number, lon: number, lifeStage: LifeStage = 'dormant'): SurfaceSample {
  const profile = biomeProfileForTarget(target)
  const seed = stableSeed(target.id)
  const cl = Math.cos(lat)
  const px = cl * Math.cos(lon), py = Math.sin(lat), pz = cl * Math.sin(lon)
  const elevation = fbmOnSphere(px, py, pz, seed, profile.roughness)
  const wobble = (fbmOnSphere(px, py, pz, seed + 7919, 0.5, 2) - 0.5) * 0.25
  const temperature = Math.min(1, Math.max(0, 1 - Math.abs(lat) / (Math.PI / 2) + wobble))
  const band = profile.bands.find(b => temperature <= b.maxTemp) ?? profile.bands[profile.bands.length - 1]
  const raw = elevation >= profile.ridge ? band.high : band.low
  const biome = bloomBiome(raw, lifeStage, temperature)
  return { biome, elevation, temperature }
}

/** Biome ids a body can show on its surface (plus subsurface), for takeon's allow-list and legends. */
export function biomeIdsForTarget(target: SurfaceTarget, lifeStage: LifeStage = 'dormant'): BiomeId[] {
  const profile = biomeProfileForTarget(target)
  const ids = new Set<BiomeId>()
  for (const band of profile.bands) {
    ids.add(bloomBiome(band.low, lifeStage, 1))
    ids.add(bloomBiome(band.high, lifeStage, 1))
    ids.add(bloomBiome(band.low, lifeStage, 0))
    ids.add(bloomBiome(band.high, lifeStage, 0))
  }
  if (profile.subsurfaceBiome) ids.add(bloomBiome(profile.subsurfaceBiome, lifeStage, 1))
  return [...ids]
}

// ── Divisions ──────────────────────────────────────────────────────────────

export const DIVISION_LAT_BANDS = 2
export const DIVISION_LON_SECTORS = 4

export interface TargetDivision {
  id: string
  targetId: string
  /** Human label such as "N-2". */
  label: string
  /** Latitude band index (0 = south) and longitude sector index. */
  band: number
  sector: number
  /** Bounds in radians. */
  latMin: number
  latMax: number
  lonMin: number
  lonMax: number
  dominantBiome: BiomeId
  /** Share of sampled points per biome, sorted by share desc. */
  biomeMix: Array<{ biome: BiomeId; share: number }>
  /** Highest life capacity of any biome in the division. */
  lifeCapacity: LifeCapacity
}

export function divisionId(targetId: string, band: number, sector: number): string {
  return `${targetId}:${band}-${sector}`
}

export function divisionLabel(band: number, sector: number): string {
  const hemi = band < DIVISION_LAT_BANDS / 2 ? 'S' : 'N'
  return `${hemi}-${sector + 1}`
}

/** Fixed division grid for a target with a sampled dominant biome per cell. */
export function divisionsForTarget(target: SurfaceTarget, samples = 6, lifeStage: LifeStage = 'dormant'): TargetDivision[] {
  const out: TargetDivision[] = []
  const latStep = Math.PI / DIVISION_LAT_BANDS
  const lonStep = (Math.PI * 2) / DIVISION_LON_SECTORS
  for (let band = 0; band < DIVISION_LAT_BANDS; band++) {
    for (let sector = 0; sector < DIVISION_LON_SECTORS; sector++) {
      const latMin = -Math.PI / 2 + band * latStep
      const latMax = latMin + latStep
      const lonMin = -Math.PI + sector * lonStep
      const lonMax = lonMin + lonStep
      const counts = new Map<BiomeId, number>()
      for (let i = 0; i < samples; i++) {
        for (let j = 0; j < samples; j++) {
          const lat = latMin + ((i + 0.5) / samples) * latStep
          const lon = lonMin + ((j + 0.5) / samples) * lonStep
          const s = sampleSurface(target, lat, lon, lifeStage)
          counts.set(s.biome, (counts.get(s.biome) ?? 0) + 1)
        }
      }
      const total = samples * samples
      const biomeMix = [...counts.entries()]
        .map(([biome, n]) => ({ biome, share: n / total }))
        .sort((a, b) => b.share - a.share)
      const lifeCapacity = biomeMix.reduce<LifeCapacity>((max, m) => {
        const cap = BIOME_META[m.biome].lifeCapacity
        return cap > max ? cap : max
      }, 0)
      out.push({
        id: divisionId(target.id, band, sector),
        targetId: target.id,
        label: divisionLabel(band, sector),
        band, sector, latMin, latMax, lonMin, lonMax,
        dominantBiome: biomeMix[0].biome,
        biomeMix,
        lifeCapacity,
      })
    }
  }
  return out
}

/** Which division a lat/lon point falls in. */
export function divisionAt(targetId: string, lat: number, lon: number): string {
  const band = Math.min(DIVISION_LAT_BANDS - 1, Math.max(0, Math.floor((lat + Math.PI / 2) / (Math.PI / DIVISION_LAT_BANDS))))
  const wrapped = ((lon + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  const sector = Math.min(DIVISION_LON_SECTORS - 1, Math.floor(wrapped / ((Math.PI * 2) / DIVISION_LON_SECTORS)))
  return divisionId(targetId, band, sector)
}

/**
 * Map a takeon field tile to a division. The field is a small patch of the
 * body's surface; we treat the field origin as sitting in the division the
 * player chose (or N-1 by default) so claims made on the field register
 * against a real division.
 */
export function divisionForFieldTile(targetId: string, tileX: number, tileY: number, homeDivision?: string): string {
  if (homeDivision) return homeDivision
  const sector = ((Math.floor(tileX / 64) % DIVISION_LON_SECTORS) + DIVISION_LON_SECTORS) % DIVISION_LON_SECTORS
  const band = tileY < 0 ? 0 : DIVISION_LAT_BANDS - 1
  return divisionId(targetId, band, sector)
}
