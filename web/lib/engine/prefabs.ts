// Prefabs — reusable entity templates, the thing between a raw component and a
// placed scene entity.
//
// This exists because the same four Earth Base build plots were written out by
// hand in *four* places: `hub.scene.json`, `build-place.scene.json`, and
// literal `DEFAULT_PLOTS` arrays inside both `HubScreen.tsx` and
// `BuildPlaceScreen.tsx`. Four copies of one thing is four places to forget.
// A prefab is defined once and instantiated with a position.

import type { ComponentData, EntityData, Vector2 } from './types'
import { componentDescriptor } from './registry'

export type PrefabCategory = 'site' | 'body' | 'resource' | 'vehicle' | 'controller'

export interface Prefab {
  id: string
  name: string
  category: PrefabCategory
  description: string
  /** Component stack every instance carries. Instances may add or override fields. */
  components: readonly ComponentData[]
}

export const PREFABS: readonly Prefab[] = [
  {
    id: 'build-plot',
    name: 'Build Plot',
    category: 'site',
    description: 'A placement slot at Earth Base. Four sit in a row on the hub surface; each holds at most one structure.',
    components: [{ type: 'BuildPlot', index: 0 }],
  },
  {
    id: 'celestial-body',
    name: 'Celestial Body',
    category: 'body',
    description: 'A selectable body on the target-picker map. Joins to the TARGETS catalog by entity id for orbit, archetype and minerals.',
    components: [{ type: 'CelestialBody', radius: 12, color: '#9becff', orbit: 1 }],
  },
  {
    id: 'ore-node',
    name: 'Ore Node',
    category: 'resource',
    description: 'A minable deposit in the mining run. Spawned procedurally by MiningController rather than authored into a scene.',
    components: [{ type: 'SpriteRenderer', asset: 'ore', width: 24, height: 24 }],
  },
  {
    id: 'ship',
    name: 'Ship',
    category: 'vehicle',
    description: 'The player vessel sprite in the mining run. Visual only — the real rocket data lives in the rocket catalog.',
    components: [{ type: 'SpriteRenderer', asset: 'ship', width: 48, height: 48 }],
  },
  {
    id: 'mining-controller',
    name: 'Mining Controller',
    category: 'controller',
    description: 'Headless entity hosting MiningController. One per mining scene.',
    components: [{ type: 'MiningController' }],
  },
  {
    id: 'construction-controller',
    name: 'Construction Controller',
    category: 'controller',
    description: 'Headless entity hosting ConstructionController. One per on-target construction scene.',
    components: [{ type: 'ConstructionController' }],
  },
]

const BY_ID = new Map(PREFABS.map(p => [p.id, p]))

export function getPrefab(id: string): Prefab | undefined {
  return BY_ID.get(id)
}

export interface InstantiateOptions {
  id: string
  name?: string
  position?: Vector2
  rotation?: number
  scale?: Vector2
  /** Per-instance component field overrides, keyed by component type. */
  overrides?: Record<string, Record<string, unknown>>
}

/** Build a scene entity from a prefab. The prefab's own components are never mutated. */
export function instantiate(prefab: Prefab, opts: InstantiateOptions): EntityData {
  return {
    id: opts.id,
    name: opts.name ?? prefab.name,
    transform: {
      position: opts.position ?? { x: 0, y: 0 },
      rotation: opts.rotation ?? 0,
      scale: opts.scale ?? { x: 1, y: 1 },
    },
    components: prefab.components.map(c => ({ ...c, ...(opts.overrides?.[c.type] ?? {}) })),
  }
}

/**
 * The four Earth Base build plots, in index order. The single definition the
 * hub scene, the build-place screen and the hub screen should all read.
 */
export const BUILD_PLOT_POSITIONS: readonly Vector2[] = [
  { x: 60, y: 570 },
  { x: 154, y: 570 },
  { x: 248, y: 570 },
  { x: 342, y: 570 },
]

export function buildPlotEntities(): EntityData[] {
  const prefab = getPrefab('build-plot')
  if (!prefab) return []
  return BUILD_PLOT_POSITIONS.map((position, index) =>
    instantiate(prefab, {
      id: `plot-${index}`,
      name: `Plot ${index}`,
      position,
      overrides: { BuildPlot: { index } },
    }),
  )
}

/** Every component type a prefab references must be registered. Asserted in tests. */
export function prefabsWithUnregisteredComponents(): string[] {
  return PREFABS.filter(p => p.components.some(c => !componentDescriptor(c.type))).map(p => p.id)
}
