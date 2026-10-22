import declarations from './authored-scenes.json'
import type { MechanicContract } from '../authoring/docs'

export interface SceneRect { x: number; y: number; w: number; h: number }
export interface SceneInsets { top: number; right: number; bottom: number; left: number }

export interface AuthoredSceneObject {
  id: string
  kind: string
  parent?: string
  slot?: string
  rect?: SceneRect
  space?: 'safe-area' | 'parent'
  layout?: 'host' | 'shared'
  mechanics?: string[]
  action?: 'choose-mission'
  prefab?: string
  asset?: string
  nativeAsset?: string
  components?: string[]
  label?: string
  status?: 'implemented' | 'proposed'
}

export interface AuthoredScene {
  id: string
  type: string
  route: string
  surface: 'canvas' | 'dom'
  runtime?: { web?: string[]; native?: string[]; engine?: string[] }
  objects: AuthoredSceneObject[]
}

export interface ResolvedSceneObject extends AuthoredSceneObject {
  frame: SceneRect
  layer: string
  depth: number
}

interface AuthoredSceneFile {
  version: number
  coordinateSpace: string
  slots: Record<string, SceneRect & { layer: string }>
  scenes: AuthoredScene[]
  mechanics: MechanicContract[]
}

const file = declarations as AuthoredSceneFile

export const authoredSceneFile = file
export const authoredScene = (id: string): AuthoredScene | undefined => file.scenes.find(scene => scene.id === id)

/**
 * Resolves the shared, normalized scene graph into platform points. Web and native
 * use the same rules: an explicit rect wins, then a named slot, then the parent's
 * frame, then the complete safe area. Renderers only paint the resulting list.
 */
export function resolveScene(
  scene: AuthoredScene,
  width: number,
  height: number,
  insets: Partial<SceneInsets> = {},
): ResolvedSceneObject[] {
  const safe = {
    x: insets.left ?? 0,
    y: insets.top ?? 0,
    w: width - (insets.left ?? 0) - (insets.right ?? 0),
    h: height - (insets.top ?? 0) - (insets.bottom ?? 0),
  }
  const pixels = (rect: SceneRect, bounds = safe): SceneRect => ({
    x: bounds.x + rect.x * bounds.w,
    y: bounds.y + rect.y * bounds.h,
    w: rect.w * bounds.w,
    h: rect.h * bounds.h,
  })
  const resolved = new Map<string, ResolvedSceneObject>()
  const pending = [...scene.objects]
  while (pending.length) {
    const before = pending.length
    for (let i = pending.length - 1; i >= 0; i--) {
      const object = pending[i]
      const parent = object.parent ? resolved.get(object.parent) : undefined
      if (object.parent && !parent) continue
      const slot = object.slot ? file.slots[object.slot] : undefined
      const frame = object.rect ? pixels(object.rect, object.space === 'parent' ? parent?.frame : safe) : slot ? pixels(slot) : parent?.frame ?? safe
      resolved.set(object.id, {
        ...object,
        frame,
        layer: slot?.layer ?? parent?.layer ?? 'world',
        depth: parent ? parent.depth + 1 : 0,
      })
      pending.splice(i, 1)
    }
    if (pending.length === before) throw new Error(`Scene ${scene.id} contains an unresolved object hierarchy`)
  }
  return scene.objects.map(object => resolved.get(object.id)!)
}

/** A prefab is a named subtree, resolved in its host's local bounds, not the screen's. */
export function resolvePrefab(scene: AuthoredScene, rootId: string, width: number, height: number): ResolvedSceneObject[] {
  const root = scene.objects.find(object => object.id === rootId)
  if (!root) throw new Error(`Scene ${scene.id} has no prefab root ${rootId}`)
  const ids = new Set([rootId])
  let count = 0
  while (count !== ids.size) {
    count = ids.size
    for (const object of scene.objects) if (object.parent && ids.has(object.parent)) ids.add(object.id)
  }
  return resolveScene({ ...scene, objects: scene.objects.filter(object => ids.has(object.id)).map(object =>
    object.id === rootId ? { ...object, parent: undefined, slot: undefined, rect: { x: 0, y: 0, w: 1, h: 1 } } : object,
  ) }, width, height)
}
