import { Container, Graphics } from 'pixi.js'
import { ScriptBehaviour } from '../components/ScriptBehaviour'
import type { RuntimeContext } from '../RuntimeContext'

export interface AcademyControllerOptions {
  container: Container
  worldWidth: number
  worldHeight: number
  getActiveTraining: () => number
  getFunded: () => boolean
}

/** Animated Earth-side academy yard: pool, centrifuge, and moving trainees. */
export class AcademyController extends ScriptBehaviour {
  private readonly opts: AcademyControllerOptions
  private readonly animation = new Graphics()
  private phase = 0

  constructor(context: RuntimeContext, opts: AcademyControllerOptions) {
    super(context)
    this.opts = opts
  }

  start(): void {
    const { container, worldWidth: w, worldHeight: h } = this.opts
    const g = new Graphics()
    g.rect(0, 0, w, h).fill(0xe9edf2)
    g.rect(0, h * .66, w, h * .34).fill(0xcfd5dc)
    for (let x = 0; x < w; x += 38) {
      g.moveTo(x, h * .66).lineTo(x, h).stroke({ color: 0xb7c0ca, width: 1, alpha: .55 })
    }

    // Training hall.
    g.roundRect(w * .06, h * .20, w * .42, h * .46, 8)
      .fill(0xf7f9fb)
      .stroke({ color: 0x7a8796, width: 2 })
    g.rect(w * .10, h * .28, w * .34, h * .08).fill(0x142437)
    for (let x = w * .13; x < w * .42; x += w * .08) {
      g.rect(x, h * .41, w * .045, h * .20).fill(0xd7dde4).stroke({ color: 0x7a8796, width: 1 })
    }

    // Neutral-buoyancy pool.
    g.roundRect(w * .56, h * .48, w * .36, h * .18, 10)
      .fill(0x73c8ea)
      .stroke({ color: 0x2687b3, width: 3 })
    for (let y = h * .51; y < h * .64; y += 12) {
      g.moveTo(w * .58, y).lineTo(w * .90, y).stroke({ color: 0xffffff, width: 1, alpha: .3 })
    }
    container.addChild(g, this.animation)
  }

  update(dt: number): void {
    this.phase += dt
    const { worldWidth: w, worldHeight: h } = this.opts
    const active = this.opts.getActiveTraining()
    const funded = this.opts.getFunded()
    const g = this.animation
    g.clear()

    // Centrifuge arm and capsule.
    const cx = w * .69
    const cy = h * .31
    g.circle(cx, cy, h * .09).stroke({ color: funded ? 0x2584bd : 0x9ca5af, width: 3, alpha: .8 })
    const angle = funded ? this.phase * (active > 0 ? 2.2 : .5) : 0
    const radius = h * .09
    const px = cx + Math.cos(angle) * radius
    const py = cy + Math.sin(angle) * radius
    g.moveTo(cx, cy).lineTo(px, py).stroke({ color: 0x34495e, width: 3 })
    g.roundRect(px - 9, py - 6, 18, 12, 3).fill({ color: funded ? 0x36aeea : 0xadb5bd })

    // Named-individual abstraction without portraits: simple suited figures.
    const people = Math.max(1, active)
    for (let i = 0; i < people; i++) {
      const walk = (this.phase * 12 + i * 42) % Math.max(80, w * .34)
      const x = w * .10 + walk
      const y = h * .75 + Math.sin(this.phase * 3 + i) * 2
      g.circle(x, y - 17, 4).fill({ color: 0x24364a })
      g.roundRect(x - 5, y - 13, 10, 15, 3).fill({ color: 0x4f9cf7 })
      g.moveTo(x - 3, y + 2).lineTo(x - 5, y + 10).stroke({ color: 0x24364a, width: 2 })
      g.moveTo(x + 3, y + 2).lineTo(x + 5, y + 10).stroke({ color: 0x24364a, width: 2 })
    }
  }
}
