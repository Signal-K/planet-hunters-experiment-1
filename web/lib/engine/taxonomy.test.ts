// Structural tests over the entity taxonomy. These are the guards that stop the
// registry, the prefabs, the scene catalog and the actor catalog drifting apart
// again — each one failed as a real defect before these files existed.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  COMPONENT_REGISTRY,
  componentDescriptor,
  readComponentNumber,
  readComponentString,
  unknownComponentTypes,
} from './registry'
import { PREFABS, buildPlotEntities, getPrefab, instantiate, prefabsWithUnregisteredComponents } from './prefabs'
import { SCENES, KNOWN_SCENE_FILES, orphanedSceneFiles, getScene } from '@/lib/data/scenes'
import { ACTOR_ARCHETYPES, actorCanOccupy, archetypeHasCondition, archetypesAtLocation, getActorArchetype } from '@/lib/data/actors'
import type { EntityData, SceneData } from './types'

function loadSceneFile(publicPath: string): SceneData {
  return JSON.parse(readFileSync(join(process.cwd(), 'public', publicPath), 'utf8')) as SceneData
}

describe('component registry', () => {
  it('has no duplicate type names', () => {
    const types = COMPONENT_REGISTRY.map(d => d.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('gives every renderer a factory and no marker one', () => {
    for (const d of COMPONENT_REGISTRY) {
      if (d.category === 'marker') expect(d.create).toBeUndefined()
    }
  })

  it('knows every component type used by every scene file on disk', () => {
    for (const file of KNOWN_SCENE_FILES) {
      expect({ file, unknown: unknownComponentTypes(loadSceneFile(file).entities) }).toEqual({ file, unknown: [] })
    }
  })

  it('reads marker fields without an unchecked cast, and falls back on garbage', () => {
    const entity: EntityData = {
      id: 'plot-2', name: 'Plot 2',
      transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      components: [{ type: 'BuildPlot', index: 2 }],
    }
    expect(readComponentNumber(entity, 'BuildPlot', 'index', -1)).toBe(2)
    expect(readComponentNumber(entity, 'BuildPlot', 'missing', -1)).toBe(-1)
    expect(readComponentNumber(entity, 'NotPresent', 'index', -1)).toBe(-1)
    expect(readComponentString(entity, 'BuildPlot', 'index', 'fallback')).toBe('fallback')
  })
})

describe('prefabs', () => {
  it('only references registered component types', () => {
    expect(prefabsWithUnregisteredComponents()).toEqual([])
  })

  it('has no duplicate ids', () => {
    expect(new Set(PREFABS.map(p => p.id)).size).toBe(PREFABS.length)
  })

  it('does not mutate the prefab when instantiating with overrides', () => {
    const prefab = getPrefab('build-plot')!
    instantiate(prefab, { id: 'plot-9', overrides: { BuildPlot: { index: 9 } } })
    expect(prefab.components[0].index).toBe(0)
  })

  it('applies per-instance overrides', () => {
    const entity = instantiate(getPrefab('build-plot')!, { id: 'plot-3', position: { x: 5, y: 6 }, overrides: { BuildPlot: { index: 3 } } })
    expect(readComponentNumber(entity, 'BuildPlot', 'index', -1)).toBe(3)
    expect(entity.transform.position).toEqual({ x: 5, y: 6 })
  })

  it('reproduces the hub scene\'s build plots exactly', () => {
    // The prefab is only worth having if it is byte-for-byte the thing the four
    // hand-written copies produce. If the hub scene moves a plot, this fails.
    expect(buildPlotEntities()).toEqual(loadSceneFile('/game/scenes/hub.scene.json').entities)
  })
})

describe('scene catalog', () => {
  it('has no duplicate ids', () => {
    expect(new Set(SCENES.map(s => s.id)).size).toBe(SCENES.length)
  })

  it('gives every canvas scene a scene file and every DOM screen none', () => {
    for (const s of SCENES) {
      if (s.surface === 'canvas') expect(s.sceneFile, s.id).toBeDefined()
      else expect(s.sceneFile, s.id).toBeUndefined()
    }
  })

  it('points every canvas scene at a file that exists', () => {
    for (const s of SCENES) {
      if (s.sceneFile) expect(() => loadSceneFile(s.sceneFile!), s.id).not.toThrow()
    }
  })

  it('declares the component types its scene file actually contains', () => {
    for (const s of SCENES) {
      if (!s.sceneFile) continue
      const actual = new Set(loadSceneFile(s.sceneFile).entities.flatMap(e => e.components.map(c => c.type)))
      expect({ id: s.id, types: [...actual].sort() }).toEqual({ id: s.id, types: [...s.entityTypes].sort() })
    }
  })

  // Documents the two orphans rather than pretending they aren't there. When
  // they're deleted or adopted, update this expectation in the same change.
  it('has exactly the two known orphaned scene files', () => {
    expect(orphanedSceneFiles().sort()).toEqual([
      '/game/scenes/build-place.scene.json',
      '/game/scenes/mining-test.scene.json',
    ])
  })
})

describe('actor archetypes', () => {
  it('covers every crew class exactly once', () => {
    expect(ACTOR_ARCHETYPES.map(a => a.id).sort()).toEqual(['astronaut', 'drone', 'rover'])
  })

  it('lets an astronaut reach a target surface, and keeps a rover off Earth Base', () => {
    expect(actorCanOccupy('astronaut', 'target-surface')).toBe(true)
    expect(actorCanOccupy('astronaut', 'earth-base')).toBe(true)
    // A deployed rover stays where it landed — that is what roverDeployments means.
    expect(actorCanOccupy('rover', 'earth-base')).toBe(false)
  })

  it('gives a condition track to people only', () => {
    expect(archetypeHasCondition('astronaut')).toBe(true)
    expect(archetypeHasCondition('rover')).toBe(false)
    expect(archetypeHasCondition('drone')).toBe(false)
  })

  it('resolves who can appear in the mining run', () => {
    const location = getScene('mining')!.location
    expect(archetypesAtLocation(location).map(a => a.id).sort()).toEqual(['astronaut', 'drone', 'rover'])
  })

  it('only opens specialisation branches the archetype plausibly works in', () => {
    expect(getActorArchetype('rover')!.specialisations).not.toContain('range')
  })

  it('only charges upkeep for people', () => {
    for (const a of ACTOR_ARCHETYPES) expect({ id: a.id, upkeep: a.hasUpkeep }).toEqual({ id: a.id, upkeep: a.isPerson })
  })
})
