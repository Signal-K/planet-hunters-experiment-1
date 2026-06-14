import type { Application } from 'pixi.js'
import type { Scene } from './Scene'

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

  constructor(scene: Scene, app: Application, opts: GameLoopOptions = {}) {
    this.scene = scene
    this.app = app
    this.fixedTimestep = 1 / (opts.fixedHz ?? 60)
    this.maxCatchUp = opts.maxCatchUpSeconds ?? 0.05
    this.tick = this.tick.bind(this)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.scene.start()
    this.rafId = requestAnimationFrame(this.tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  private tick(timestamp: number): void {
    if (!this.running) return
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
