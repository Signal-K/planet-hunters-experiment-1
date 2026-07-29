// The component registry — one declared list of every component type a scene
// may contain, replacing the previous arrangement where each wirer hardcoded
// its own `if (cd.type === 'ShapeRenderer')` check and two component types
// (`BuildPlot`, `CelestialBody`) existed only as bare strings in scene JSON
// with no class, no wirer and no declaration anywhere in code.
//
// Two consequences of that gap, both real and both fixed by registering:
//   1. Nothing could enumerate what a scene is allowed to contain, so tooling
//      (and this file's own inspector output) had to guess.
//   2. Marker data was read as `entity.components.find(c => c.type === 'BuildPlot')?.index as number`
//      in four places — an unchecked cast in a strict-mode codebase.

import type { Container } from 'pixi.js'
import type { Component, ComponentData, EntityData } from './types'
import type { Scene } from './Scene'
import { ShapeRenderer, type ShapeRendererData } from './components/ShapeRenderer'
import { SpriteRenderer } from './components/SpriteRenderer'

/**
 * What a component *is*, structurally:
 *  - `renderer`  draws something; instantiated at wire time against a Pixi container.
 *  - `controller` owns behaviour and per-frame update; instantiated by the screen
 *    that hosts it, because controllers need runtime wiring (callbacks, game state).
 *  - `marker`     pure data on an entity, read by the host screen. No class, by design.
 */
export type ComponentCategory = 'renderer' | 'controller' | 'marker'

export interface ComponentDescriptor {
  type: string
  category: ComponentCategory
  description: string
  /** Field names carried in the scene JSON beyond `type`. Documentation and inspector fodder. */
  fields: readonly string[]
  /**
   * Builds the live component. Present only for `renderer` types — controllers
   * are constructed by their host screen with runtime dependencies, and markers
   * have no instance at all.
   */
  create?: (data: ComponentData, container: Container) => Component
}

export const COMPONENT_REGISTRY: readonly ComponentDescriptor[] = [
  {
    type: 'ShapeRenderer',
    category: 'renderer',
    description: 'Flat-colour primitive: circle, rect, poly or diamond. The cel-shaded faceted look is built from these.',
    fields: ['shape', 'width', 'height', 'color'],
    create: (data, container) => ShapeRenderer.fromData(data as unknown as ShapeRendererData, container),
  },
  {
    type: 'SpriteRenderer',
    category: 'renderer',
    description: 'Textured quad resolved through AssetManager. Falls back to a magenta placeholder rather than rendering nothing.',
    fields: ['asset', 'width', 'height'],
  },
  {
    type: 'MiningController',
    category: 'controller',
    description: 'Drives the mining run: ore spawning, scrolling terrain, laser fire, collection.',
    fields: [],
  },
  {
    type: 'ConstructionController',
    category: 'controller',
    description: 'Drives on-target construction: pads, placement validity, build progress.',
    fields: ['pads'],
  },
  {
    type: 'BuildPlot',
    category: 'marker',
    description: 'A placement slot at Earth Base. The host screen reads the index to map a plot to a placed structure.',
    fields: ['index'],
  },
  {
    type: 'CelestialBody',
    category: 'marker',
    description: 'A body on the target-picker map. The host screen joins the id to the TARGETS catalog for its real data.',
    fields: ['radius', 'color', 'orbit'],
  },
]

const BY_TYPE = new Map(COMPONENT_REGISTRY.map(d => [d.type, d]))

export function componentDescriptor(type: string): ComponentDescriptor | undefined {
  return BY_TYPE.get(type)
}

/** Component types present in a scene that the registry does not know about. */
export function unknownComponentTypes(entities: readonly EntityData[]): string[] {
  const seen = new Set<string>()
  const walk = (list: readonly EntityData[]) => {
    for (const e of list) {
      for (const c of e.components) if (!BY_TYPE.has(c.type)) seen.add(c.type)
      if (e.children?.length) walk(e.children)
    }
  }
  walk(entities)
  return [...seen]
}

/**
 * Typed read of a marker component's data. Replaces the
 * `.find(c => c.type === 'BuildPlot')?.index as number` pattern — the caller
 * names the field's type once, at the read, instead of casting blind.
 */
export function readComponent(entity: EntityData, type: string): ComponentData | undefined {
  return entity.components.find(c => c.type === type)
}

export function readComponentNumber(entity: EntityData, type: string, field: string, fallback: number): number {
  const value = readComponent(entity, type)?.[field]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function readComponentString(entity: EntityData, type: string, field: string, fallback: string): string {
  const value = readComponent(entity, type)?.[field]
  return typeof value === 'string' ? value : fallback
}

/**
 * Wire every renderer in a loaded scene, driven by the registry rather than by
 * one hardcoded function per component type. Controllers and markers are
 * skipped — see `ComponentCategory`.
 */
export function wireSceneRenderers(container: Container, entityData: readonly EntityData[], scene: Scene): void {
  for (const e of entityData) {
    const obj = scene.find(e.id)
    if (!obj) continue
    for (const cd of e.components) {
      const descriptor = BY_TYPE.get(cd.type)
      if (!descriptor?.create) continue
      obj.addComponent(descriptor.create(cd, container))
    }
  }
}

// Re-exported so a screen wiring sprites can reach the sprite path without
// importing from two places. SpriteRenderer needs a resolved texture rather
// than raw scene data, which is why it has no `create` above.
export { SpriteRenderer }
