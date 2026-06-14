import { Graphics } from 'pixi.js'
import type { Application } from 'pixi.js'
import { Scene } from './Scene'
import { GameLoop, type GameLoopOptions } from './GameLoop'
import type { SceneData, EntityData } from './types'

export type TransitionType = 'fade' | 'cut'

/** Optional per-scene lifecycle hooks, fired by SceneManager during a transition. */
export interface SceneLifecycle {
  /** Called after the new scene's GameObjects are wired but before the fade-in completes. */
  onEnter?(scene: Scene, entityData: EntityData[]): void
  /** Called on the outgoing scene before it is destroyed. */
  onExit?(scene: Scene): void
}

/** Wires runtime components (sprite/shape renderers, scripts, input) onto a freshly loaded scene. */
export type SceneWirer = (app: Application, entityData: EntityData[], scene: Scene) => void | Promise<void>

export interface SceneManagerOptions {
  app: Application
  /** Logical scene name -> scene JSON path, e.g. `{ mining: '/game/scenes/mining.scene.json' }`. */
  registry: Record<string, string>
  /** Attaches components to a loaded scene's GameObjects. */
  wire?: SceneWirer
  loop?: GameLoopOptions
  /** Fade transition duration in seconds. Default 0.3. */
  transitionDuration?: number
  /** Overridable for testing; defaults to `Scene.load` (fetch). */
  fetchScene?: (url: string) => Promise<SceneData>
}

/**
 * Owns the active scene + GameLoop and handles load/unload between scenes with
 * a configurable transition (fade or cut). Scene names are resolved through a
 * registry mapping logical names to JSON file paths, validated before load.
 */
export class SceneManager {
  readonly app: Application
  private registry: Record<string, string>
  private wire?: SceneWirer
  private loopOpts?: GameLoopOptions
  private transitionDuration: number
  private fetchScene: (url: string) => Promise<SceneData>
  private hooks = new Map<string, SceneLifecycle>()
  private overlay: Graphics
  private overlayAttached = false
  private transitioning = false

  current: Scene | null = null
  currentEntityData: EntityData[] = []
  currentName: string | null = null
  loop: GameLoop | null = null

  constructor(opts: SceneManagerOptions) {
    this.app = opts.app
    this.registry = { ...opts.registry }
    this.wire = opts.wire
    this.loopOpts = opts.loop
    this.transitionDuration = opts.transitionDuration ?? 0.3
    this.fetchScene = opts.fetchScene ?? Scene.load
    this.overlay = new Graphics()
    this.overlay.alpha = 0
  }

  /** Add or replace a registry entry mapping a logical scene name to a JSON path. */
  register(name: string, path: string): void {
    this.registry[name] = path
  }

  /** Register lifecycle hooks (onEnter/onExit) for a logical scene name. */
  registerLifecycle(name: string, hooks: SceneLifecycle): void {
    this.hooks.set(name, hooks)
  }

  /** Whether `name` has a registered scene path. */
  has(name: string): boolean {
    return name in this.registry
  }

  /**
   * Unloads the current scene (if any) and loads `name`, running a transition
   * animation. Throws if `name` is not in the registry.
   */
  async load(name: string, opts: { transition?: TransitionType } = {}): Promise<Scene> {
    const path = this.registry[name]
    if (!path) {
      throw new Error(`SceneManager: no scene registered for "${name}"`)
    }
    if (this.transitioning) {
      throw new Error('SceneManager: a transition is already in progress')
    }
    const transition = opts.transition ?? 'fade'
    this.transitioning = true

    try {
      if (transition === 'fade') {
        await this.fadeTo(1)
      }

      if (this.current) {
        const exitHooks = this.currentName ? this.hooks.get(this.currentName) : undefined
        exitHooks?.onExit?.(this.current)
        this.loop?.stop()
        this.current.destroy()
      }

      const data = await this.fetchScene(path)
      const { scene, entityData } = Scene.fromData(data)
      if (this.wire) await this.wire(this.app, entityData, scene)

      this.current = scene
      this.currentEntityData = entityData
      this.currentName = name

      this.loop = new GameLoop(scene, this.app, this.loopOpts)
      this.loop.start()

      this.hooks.get(name)?.onEnter?.(scene, entityData)

      if (transition === 'fade') {
        await this.fadeTo(0)
      } else {
        this.overlay.alpha = 0
      }

      return scene
    } finally {
      this.transitioning = false
    }
  }

  /** Stops the loop and destroys the active scene. */
  destroy(): void {
    this.loop?.stop()
    this.current?.destroy()
    this.current = null
    this.currentName = null
    this.loop = null
  }

  private ensureOverlay(): void {
    if (this.overlayAttached) return
    const width = this.app.screen?.width ?? this.app.renderer?.width ?? 0
    const height = this.app.screen?.height ?? this.app.renderer?.height ?? 0
    this.overlay.rect(0, 0, width, height).fill(0x000000)
    this.app.stage.addChild(this.overlay)
    this.overlayAttached = true
  }

  private fadeTo(target: number): Promise<void> {
    this.ensureOverlay()
    const start = this.overlay.alpha
    const duration = this.transitionDuration

    if (duration <= 0 || start === target) {
      this.overlay.alpha = target
      this.app.renderer.render(this.app.stage)
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      const startTime = performance.now()
      const step = (): void => {
        const elapsed = (performance.now() - startTime) / 1000
        const t = Math.min(elapsed / duration, 1)
        this.overlay.alpha = start + (target - start) * t
        this.app.renderer.render(this.app.stage)
        if (t < 1) {
          requestAnimationFrame(step)
        } else {
          resolve()
        }
      }
      requestAnimationFrame(step)
    })
  }
}
