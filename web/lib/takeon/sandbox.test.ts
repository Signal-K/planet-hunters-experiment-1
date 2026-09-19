import { describe, expect, it } from 'vitest'
import type { BodyDef, BodyKind } from '@takeon/engine'
import { BIOME_META, LANDNAM_BIOME_IDS, SANDBOX_STRUCTURE_RECIPES } from '@/lib/data'
import {
  biomeDefForBiome,
  buildLandnamBody,
  LANDNAM_STRUCTURE_DEFS,
  materialDefForBiome,
  materialIdForBiome,
  placementHint,
  registerLandnamSandbox,
  resetLandnamSandboxRegistry,
  type SandboxEngine,
} from './sandbox'

function fakeEngine() {
  const structures: string[] = []
  const materials: number[] = []
  const biomes: string[] = []
  const kinds = new Map<string, BodyKind>()
  const rocky: BodyKind = { id: 'rocky-planet', label: 'Rocky', help: '', defaults: {} as BodyKind['defaults'] }
  kinds.set(rocky.id, rocky)
  const mars = {
    id: 'mars', name: 'Mars', kind: 'rocky-planet', size: 64, height: 12,
    terrain: { seed: 1 }, palette: {},
  } as unknown as BodyDef
  const engine: SandboxEngine = {
    CUSTOM_MATERIAL_BASE: 64,
    registerStructure: def => { structures.push(def.type); return def.type },
    registerMaterial: def => { materials.push(def.id); return def.id },
    registerBiome: biome => { biomes.push(biome.id); return biome },
    registerBodyKind: kind => { kinds.set(kind.id, kind); return kind },
    getBodyKind: id => kinds.get(id),
    listBodyKinds: () => [...kinds.values()],
    getBody: id => (id === 'mars' ? mars : undefined),
    cloneBody: def => JSON.parse(JSON.stringify(def)) as BodyDef,
  }
  return { engine, structures, materials, biomes, kinds }
}

describe('sandbox registration', () => {
  it('registers every Landnam biome as a custom material + biome, once per engine', () => {
    resetLandnamSandboxRegistry()
    const { engine, materials, biomes, structures } = fakeEngine()
    registerLandnamSandbox(engine)
    registerLandnamSandbox(engine)
    expect(materials).toHaveLength(LANDNAM_BIOME_IDS.length)
    expect(biomes).toEqual([...LANDNAM_BIOME_IDS])
    expect(materials.every(id => id >= 64)).toBe(true)
    expect(structures).toContain('road')
    expect(structures).toContain('factory')
    expect(structures).toContain('silo')
  })

  it('custom material ids are stable and unique', () => {
    const ids = LANDNAM_BIOME_IDS.map(b => materialIdForBiome(b, 64))
    expect(new Set(ids).size).toBe(ids.length)
    expect(() => materialIdForBiome('dust-basin', 64)).toThrow()
  })

  it('material colours come from BIOME_META and living biomes are softer', () => {
    const moss = materialDefForBiome('moss-meadow', 64)
    expect(moss.colors[0]).toBe(BIOME_META['moss-meadow'].color)
    expect(moss.hardness).toBe(1)
    const lava = materialDefForBiome('lava-fields', 64)
    expect(lava.yields?.resource).toBe('sulfur')
  })

  it('subsurface biomes sit on rock and cold biomes on ice', () => {
    expect(biomeDefForBiome('aquifer-caverns', 64).subsurface).toEqual([2, 3])
    expect(biomeDefForBiome('glacier-shelf', 64).subsurface?.[0]).toBe(4)
    expect(biomeDefForBiome('lava-fields', 64).climate?.min).toBeGreaterThan(100)
  })

  it('every sandbox recipe with a takeon type is registered', () => {
    resetLandnamSandboxRegistry()
    const { engine, structures } = fakeEngine()
    registerLandnamSandbox(engine)
    for (const recipe of SANDBOX_STRUCTURE_RECIPES) {
      if (recipe.takeonType) expect(structures).toContain(recipe.takeonType)
    }
    expect(LANDNAM_STRUCTURE_DEFS.find(d => d.type === 'road')?.category).toBe('decorative')
  })
})

describe('body override', () => {
  it('turns on biome chunking, applies the target climate, and gates biomes by life stage', () => {
    resetLandnamSandboxRegistry()
    const { engine, kinds } = fakeEngine()
    const candidate = { id: 'exo-1', type: 'exoplanet' as const, archetype: 'S' as const, planetRadiusEarth: 1.1, periodDays: 37, starTeffK: 3480 }
    const dormant = buildLandnamBody(engine, 'mars', candidate, 'dormant')
    expect(dormant.terrain.biomes).toBe(true)
    expect(dormant.climate?.temperature).toBeTypeOf('number')
    const dormantKind = kinds.get(dormant.kind!)!
    expect(dormantKind.allowedBiomes?.some(b => BIOME_META[b as keyof typeof BIOME_META]?.lifeCapacity >= 2)).toBe(false)
    const thriving = buildLandnamBody(engine, 'mars', candidate, 'thriving')
    const thrivingKind = kinds.get(thriving.kind!)!
    expect(thrivingKind.allowedBiomes?.some(b => BIOME_META[b as keyof typeof BIOME_META]?.lifeCapacity >= 2)).toBe(true)
    expect(thriving.id).not.toBe('mars')
  })

  it('throws on an unknown base body', () => {
    const { engine } = fakeEngine()
    expect(() => buildLandnamBody(engine, 'nope', { id: 'mars', type: 'planet' })).toThrow(/Unknown/)
  })
})

describe('placement hint', () => {
  it('names the structure being placed', () => {
    expect(placementHint(null)).toMatch(/Select a structure/)
    expect(placementHint('road')).toMatch(/Road segment/)
    expect(placementHint('beacon')).toMatch(/Beacon/i)
  })
})
