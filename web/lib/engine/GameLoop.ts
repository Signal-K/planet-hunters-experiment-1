import type { Application } from 'pixi.js'
import type { Scene } from './Scene'

function pageHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden
}

export interface GameLoopOptions {
  fixedHz?: number
  maxCatchUpSeconds?: number
}

export class GameLoop {
  private scene: Scene
  private app: Application
  private fixedTimestep: number
  private maxCatchUp: number
  private accumulator = 0
  private lastTime = 0
  private rafId = 0
  private running = false
  private readonly onVisibilityChange: () => void

  constructor(scene: Scene, app: Application, opts: GameLoopOptions = {}) {
    this.scene = scene
    this.app = app
    this.fixedTimestep = 1 / (opts.fixedHz ?? 60)
    this.maxCatchUp = opts.maxCatchUpSeconds ?? 0.05
    this.tick = this.tick.bind(this)
    this.onVisibilityChange = () => {
      if (!this.running) return
      if (pageHidden()) {
        cancelAnimationFrame(this.rafId)
        this.rafId = 0
      } else if (this.rafId === 0) {
        this.lastTime = performance.now()
        this.accumulator = 0
        this.rafId = requestAnimationFrame(this.tick)
      }
    }
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.scene.start()
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange)
    }
    if (!pageHidden()) this.rafId = requestAnimationFrame(this.tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.rafId = 0
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
    }
  }

  private tick(timestamp: number): void {
    if (!this.running || pageHidden()) return
    const dt = Math.min((timestamp - this.lastTime) / 1000, this.maxCatchUp)
    this.lastTime = timestamp
    this.accumulator += dt

    while (this.accumulator >= this.fixedTimestep) {
      this.scene.update(this.fixedTimestep)
      this.accumulator -= this.fixedTimestep
    }

    this.app.renderer.render(this.app.stage)
    this.rafId = requestAnimationFrame(this.tick)
  }
}
