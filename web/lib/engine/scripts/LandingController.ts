import { Container, Graphics } from 'pixi.js'
import { ScriptBehaviour } from '../components/ScriptBehaviour'
import type { RuntimeContext } from '../RuntimeContext'

const AMBER = 0xf5a623
const CYAN = 0x3fa9ff
const STEEL = 0x31445f
const DEEP = 0x07101c

export type LandingSequenceMode = 'descend' | 'ascend'

export interface LandingControllerOptions {
  container: Container
  worldWidth: number
  worldHeight: number
  getProgress: () => number
  mode: LandingSequenceMode
}

/**
 * Detach/descend or ascend/redock, visual-only — mirrors DeliveryController:
 * React owns the persisted wall-clock epoch and supplies progress, so
 * remounting Pixi cannot reset or complete the sequence.
 */
export class LandingController extends ScriptBehaviour {
  private readonly opts: LandingControllerOptions
  private readonly animated = new Graphics()
  private phase = 0

  constructor(context: RuntimeContext, opts: LandingControllerOptions) {
    super(context)
    this.opts = opts
  }

  start(): void {
    this.drawBackdrop()
    this.opts.container.addChild(this.animated)
  }

  update(dt: number): void {
    this.phase += dt
    this.drawSequence(Math.max(0, Math.min(1, this.opts.getProgress())))
  }

  destroy(): void {
    this.animated.destroy()
  }

  private drawBackdrop(): void {
    const { container, worldWidth: w, worldHeight: h, mode } = this.opts
    const g = new Graphics()

    const stars: Array<[number, number, number]> = [
      [.10, .10, 1], [.22, .18, .7], [.34, .08, .8], [.46, .22, .6],
      [.58, .12, .9], [.71, .20, .6], [.84, .07, .8], [.94, .16, 1],
    ]
    for (const [x, y, r] of stars) {
      g.circle(x * w, y * h, r).fill({ color: 0xd8e9ff, alpha: .35 })
    }

    // Orbit marker (ship silhouette) up top.
    const shipY = h * .12
    g.poly([
      w / 2 - 22, shipY + 8,
      w / 2 - 12, shipY - 8,
      w / 2 + 12, shipY - 8,
      w / 2 + 22, shipY + 8,
      w / 2, shipY + 14,
    ]).fill({ color: 0x14243a }).stroke({ color: CYAN, width: 2, alpha: .75 })
    g.circle(w / 2, shipY, 3).fill({ color: DEEP })

    // Surface band at the bottom.
    const groundY = h * .82
    g.rect(0, groundY, w, h - groundY).fill({ color: 0x1c1408 })
    g.rect(0, groundY, w, 3).fill({ color: STEEL })
    for (let x = 0; x < w; x += 40) {
      g.moveTo(x, groundY).lineTo(x - 16, h).stroke({ color: 0x2a1e0e, width: 1, alpha: .7 })
    }
    // Landing pad marker.
    g.circle(w / 2, groundY - 6, 20).stroke({ color: mode === 'descend' ? AMBER : CYAN, width: 2, alpha: .6 })

    // Vertical rail the lander travels along.
    g.moveTo(w / 2, shipY + 16).lineTo(w / 2, groundY - 6).stroke({ color: STEEL, width: 3 })

    container.addChild(g)
  }

  private drawSequence(progress: number): void {
    const { worldWidth: w, worldHeight: h, mode } = this.opts
    const g = this.animated
    g.clear()

    const railStart = h * .12 + 16
    const railEnd = h * .82 - 6
    const local = mode === 'descend' ? progress : 1 - progress
    const y = railStart + (railEnd - railStart) * local
    const bob = Math.sin(this.phase * 3) * 1.4

    // Lander craft: small triangular body + landing legs.
    g.poly([
      w / 2 - 10, y + 10 + bob,
      w / 2, y - 10 + bob,
      w / 2 + 10, y + 10 + bob,
    ]).fill({ color: 0x1e3550 }).stroke({ color: progress >= 1 ? 0x46d99a : AMBER, width: 2 })
    g.moveTo(w / 2 - 10, y + 10 + bob).lineTo(w / 2 - 15, y + 16 + bob).stroke({ color: STEEL, width: 2 })
    g.moveTo(w / 2 + 10, y + 10 + bob).lineTo(w / 2 + 15, y + 16 + bob).stroke({ color: STEEL, width: 2 })

    // Trailing burn/exhaust while in transit.
    if (progress < 1) {
      const flicker = .4 + Math.sin(this.phase * 8) * .25
      g.circle(w / 2, y + 14 + bob, 3).fill({ color: AMBER, alpha: flicker })
    }

    // Destination pulse once complete.
    if (progress >= 1) {
      const pulse = .5 + Math.sin(this.phase * 4) * .3
      const destY = mode === 'descend' ? railEnd : railStart
      g.circle(w / 2, destY, 6).fill({ color: 0x46d99a, alpha: pulse })
    }
  }
}
