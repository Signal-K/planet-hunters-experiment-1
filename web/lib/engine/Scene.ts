import { GameObject, Transform } from './GameObject'
import type { SceneData, EntityData } from './types'

export class Scene {
  name: string
  roots: GameObject[] = []

  constructor(name: string) {
    this.name = name
  }

  add(obj: GameObject): void {
    this.roots.push(obj)
  }

  remove(id: string): void {
    this.roots = this.roots.filter(o => o.id !== id)
  }

  find(id: string): GameObject | null {
    const search = (objs: GameObject[]): GameObject | null => {
      for (const o of objs) {
        if (o.id === id) return o
        const found = search(o.children)
        if (found) return found
      }
      return null
    }
    return search(this.roots)
  }

  start(): void {
    for (const root of this.roots) root.start()
  }

  update(dt: number): void {
    for (const root of this.roots) root.update(dt)
  }

  destroy(): void {
    for (const root of this.roots) root.destroy()
    this.roots = []
  }

  /** Load from scene JSON (static import or fetch result). Components are wired by the runtime after load. */
  static fromData(data: SceneData): { scene: Scene; entityData: EntityData[] } {
    const scene = new Scene(data.name)
    const entityData: EntityData[] = []

    const build = (entities: EntityData[], parent: GameObject | null) => {
      for (const e of entities) {
        entityData.push(e)
        const obj = new GameObject(e.id, e.name, new Transform(e.transform))
        if (parent) parent.addChild(obj)
        else scene.add(obj)
        if (e.children?.length) build(e.children, obj)
      }
    }
    build(data.entities, null)
    return { scene, entityData }
  }

  private static cache = new Map<string, Promise<SceneData>>()

  /** Fetches scene JSON, memoized by `url` so repeated/prefetched loads share one request. */
  static load(url: string): Promise<SceneData> {
    let cached = Scene.cache.get(url)
    if (!cached) {
      cached = (async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Scene load failed: ${url} (${res.status})`)
        return res.json() as Promise<SceneData>
      })()
      // Don't cache failures — a transient fetch error shouldn't poison future loads.
      cached.catch(() => Scene.cache.delete(url))
      Scene.cache.set(url, cached)
    }
    return cached
  }
}
