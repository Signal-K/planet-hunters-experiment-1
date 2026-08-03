import { Container, Graphics } from 'pixi.js'
import { ScriptBehaviour } from '../components/ScriptBehaviour'
import type { RuntimeContext } from '../RuntimeContext'

const AMBER = 0xf5a623
const CYAN = 0x3fa9ff
const STEEL = 0x31445f
const DEEP = 0x07101c

export interface DeliveryControllerOptions {
  container: Container
  worldWidth: number
  worldHeight: number
  getProgress: () => number
  cargoUnits: number
}

/**
 * Physical cargo hand-off at the contract destination. The controller is
 * deliberately visual-only: React owns the persisted wall-clock epoch and
 * supplies progress, so remounting Pixi cannot reset or complete the unload.
 */
export class DeliveryController extends ScriptBehaviour {
  private readonly opts: DeliveryControllerOptions
  private readonly animated = new Graphics()
  private phase = 0

  constructor(context: RuntimeContext, opts: DeliveryControllerOptions) {
    super(context)
    this.opts = opts
  }

  start(): void {
    this.drawBackdrop()
    this.opts.container.addChild(this.animated)
  }

  update(dt: number): void {
    this.phase += dt
    this.drawTransfer(Math.max(0, Math.min(1, this.opts.getProgress())))
  }

  destroy(): void {
    this.animated.destroy()
  }

  private drawBackdrop(): void {
    const { container, worldWidth: w, worldHeight: h } = this.opts
    const g = new Graphics()

    const stars: Array<[number, number, number]> = [
      [.08, .08, 1], [.19, .16, .7], [.31, .07, .8], [.43, .20, .6],
      [.55, .10, .9], [.69, .18, .6], [.82, .06, .8], [.93, .14, 1],
      [.12, .32, .6], [.28, .27, .8], [.51, .34, .7], [.75, .30, .9],
    ]
    for (const [x, y, r] of stars) {
      g.circle(x * w, y * h, r).fill({ color: 0xd8e9ff, alpha: .35 })
    }

    const deckY = h * .69
    g.rect(0, deckY, w, h - deckY).fill({ color: 0x111a27 })
    g.rect(0, deckY, w, 3).fill({ color: STEEL })
    for (let x = 0; x < w; x += 44) {
      g.moveTo(x, deckY).lineTo(x - 18, h).stroke({ color: 0x1d2b3e, width: 1, alpha: .7 })
    }

    // Receiving depot and sealed cargo hatch.
    const depotX = w * .78
    g.roundRect(depotX - 42, deckY - 112, 84, 112, 4)
      .fill({ color: DEEP })
      .stroke({ color: CYAN, width: 2, alpha: .7 })
    g.rect(depotX - 29, deckY - 76, 58, 60)
      .fill({ color: 0x121d2c })
      .stroke({ color: STEEL, width: 2 })
    g.rect(depotX - 18, deckY - 99, 36, 7).fill({ color: AMBER, alpha: .8 })
    for (let y = deckY - 68; y < deckY - 20; y += 12) {
      g.moveTo(depotX - 23, y).lineTo(depotX + 23, y)
        .stroke({ color: 0x26374e, width: 1 })
    }

    // Ship body, firmly docked on the left side of the transfer rail.
    const shipX = w * .23
    const shipY = deckY - 56
    g.poly([
      shipX - 66, shipY + 18,
      shipX - 42, shipY - 18,
      shipX + 35, shipY - 18,
      shipX + 62, shipY,
      shipX + 35, shipY + 18,
    ]).fill({ color: 0x14243a }).stroke({ color: CYAN, width: 2, alpha: .75 })
    g.poly([
      shipX - 44, shipY - 18,
      shipX - 24, shipY - 41,
      shipX + 9, shipY - 18,
    ]).fill({ color: 0x1e3550 }).stroke({ color: 0x7dd2ff, width: 1 })
    g.rect(shipX + 20, shipY - 11, 20, 22)
      .fill({ color: 0x07101c })
      .stroke({ color: AMBER, width: 2, alpha: .8 })
    g.circle(shipX - 38, shipY + 23, 8).fill({ color: 0x05090f }).stroke({ color: STEEL, width: 2 })
    g.circle(shipX + 34, shipY + 23, 8).fill({ color: 0x05090f }).stroke({ color: STEEL, width: 2 })

    container.addChild(g)
  }

  private drawTransfer(progress: number): void {
    const { worldWidth: w, worldHeight: h, cargoUnits } = this.opts
    const g = this.animated
    g.clear()

    const deckY = h * .69
    const railStart = w * .34
    const railEnd = w * .69
    const railY = deckY - 34
    g.moveTo(railStart, railY).lineTo(railEnd, railY)
      .stroke({ color: STEEL, width: 5 })
    g.moveTo(railStart, railY).lineTo(railStart + (railEnd - railStart) * progress, railY)
      .stroke({ color: AMBER, width: 3, alpha: .9 })

    const crateCount = Math.max(2, Math.min(6, cargoUnits || 2))
    for (let i = 0; i < crateCount; i++) {
      const threshold = i / crateCount
      const local = Math.max(0, Math.min(1, (progress - threshold) * crateCount))
      const x = railStart + (railEnd - railStart) * local
      const bob = Math.sin(this.phase * 3 + i) * 1.4
      g.rect(x - 8, railY - 12 + bob, 16, 14)
        .fill({ color: local >= 1 ? 0x26384f : 0x9f671d })
        .stroke({ color: local >= 1 ? CYAN : AMBER, width: 1 })
      g.moveTo(x - 7, railY - 5 + bob).lineTo(x + 7, railY - 5 + bob)
        .stroke({ color: 0x07101c, width: 1, alpha: .7 })
    }

    const pulse = .45 + Math.sin(this.phase * 4) * .25
    g.circle(railEnd + 19, railY - 78, 5)
      .fill({ color: progress >= 1 ? 0x46d99a : AMBER, alpha: progress >= 1 ? .9 : pulse })
  }
}
