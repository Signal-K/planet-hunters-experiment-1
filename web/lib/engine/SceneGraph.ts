import declarations from './authored-scenes.json'

export interface SceneRect { x: number; y: number; w: number; h: number }
export interface SceneInsets { top: number; right: number; bottom: number; left: number }

export interface AuthoredSceneObject {
  id: string
  kind: string
  parent?: string
  slot?: string
  rect?: SceneRect
  prefab?: string
  asset?: string
  components?: string[]
  label?: string
  status?: 'implemented' | 'proposed'
}

export interface AuthoredScene {
  id: string
  type: string
  route: string
  surface: 'canvas' | 'dom'
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
  const pixels = (rect: SceneRect): SceneRect => ({
    x: safe.x + rect.x * safe.w,
    y: safe.y + rect.y * safe.h,
    w: rect.w * safe.w,
    h: rect.h * safe.h,
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
      const frame = object.rect ? pixels(object.rect) : slot ? pixels(slot) : parent?.frame ?? safe
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
