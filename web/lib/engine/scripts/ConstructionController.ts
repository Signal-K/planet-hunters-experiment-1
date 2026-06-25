import { Container, Graphics } from 'pixi.js'
import { ScriptBehaviour } from '../components/ScriptBehaviour'
import type { RuntimeContext } from '../RuntimeContext'

export type ConstructionState = 'placing' | 'constructing' | 'operational'

const PAD_CYAN  = 0x3fa9ff
const PAD_AMBER = 0xf5a623
const SCAFFOLD  = 0x6cc2ff
const STRUCT_BODY = 0x0d1828
const ROCK_BASE   = 0x1a1410
const ROCK_RIDGE  = 0x2a1e14

export interface ConstructionPadConfig {
  x: number
  y: number
}

export interface ConstructionControllerOptions {
  container: Container
  worldWidth: number
  worldHeight: number
  surfaceY: number
  pads: ConstructionPadConfig[]
  getState: () => ConstructionState
  getSelectedPad: () => number
  onSelectPad: (index: number) => void
}

interface PadState {
  x: number
  y: number
  glow: Graphics
  ring: Graphics
  buildProgress: number
}

export class ConstructionController extends ScriptBehaviour {
  private opts: ConstructionControllerOptions
  private phase = 0
  private pads: PadState[] = []

  constructor(context: RuntimeContext, opts: ConstructionControllerOptions) {
    super(context)
    this.opts = opts
  }

  start(): void {
    this.buildStars()
    this.buildSurface()
    this.buildPads()
  }

  update(dt: number): void {
    this.phase += dt
    const state = this.opts.getState()
    const selected = this.opts.getSelectedPad()
    for (let i = 0; i < this.pads.length; i++) {
      this.renderPad(this.pads[i], i, i === selected, state, dt)
    }
  }

  private buildStars(): void {
    const { container, worldWidth } = this.opts
    const surfY = this.opts.surfaceY
    const g = new Graphics()
    const data: [number, number, number][] = [
      [0.10, 0.09, 0.22], [0.22, 0.06, 0.28], [0.38, 0.18, 0.18], [0.52, 0.07, 0.32],
      [0.64, 0.22, 0.20], [0.78, 0.09, 0.25], [0.88, 0.15, 0.20], [0.05, 0.35, 0.15],
      [0.30, 0.42, 0.18], [0.58, 0.38, 0.22], [0.74, 0.45, 0.14], [0.16, 0.55, 0.12],
      [0.45, 0.52, 0.16], [0.85, 0.50, 0.18], [0.70, 0.32, 0.10],
    ]
    for (const [fx, fy, alpha] of data) {
      g.circle(fx * worldWidth, fy * surfY, 1.0).fill({ color: 0xffffff, alpha })
    }
    container.addChild(g)
  }

  private buildSurface(): void {
    const { container, worldWidth, worldHeight, surfaceY } = this.opts
    const tileH = worldHeight - surfaceY
    const ridgeY = [-4, -12, -8, -18, -6, -14, -10, -20, -5, -16, -9, -13, -7, -19, -11, -4, -15, -8, -12, -6, -10]
    const step = worldWidth / 20

    const edgePts: number[] = [0, tileH]
    for (let i = 0; i <= 20; i++) {
      edgePts.push(i * step, (ridgeY[i] ?? -8) + 6)
    }
    edgePts.push(worldWidth, tileH)

    const g = new Graphics()
    g.y = surfaceY
    g.rect(0, 10, worldWidth, tileH).fill(ROCK_BASE)
    g.poly(edgePts).fill(ROCK_RIDGE)

    const patches: [number, number, number, number][] = [
      [0.15, 16, 16, 0.55], [0.36, 10, 12, 0.48], [0.57, 18, 20, 0.52], [0.78, 12, 14, 0.50], [0.92, 14, 10, 0.45],
    ]
    for (const [fx, py, pr, a] of patches) {
      g.ellipse(fx * worldWidth, py + 10, pr, pr * 0.55).fill({ color: 0x0e0b07, alpha: a })
    }
    container.addChild(g)
  }

  private buildPads(): void {
    for (const cfg of this.opts.pads) {
      const glow = new Graphics()
      const ring = new Graphics()

      glow.eventMode = 'static'
      glow.cursor = 'pointer'

      const idx = this.pads.length
      glow.on('pointerdown', () => {
        if (this.opts.getState() === 'placing') this.opts.onSelectPad(idx)
      })

      this.opts.container.addChild(glow)
      this.opts.container.addChild(ring)

      this.pads.push({ x: cfg.x, y: cfg.y, glow, ring, buildProgress: 0 })
    }
  }

  private renderPad(pad: PadState, index: number, isSelected: boolean, state: ConstructionState, dt: number): void {
    const { x, y } = pad
    pad.glow.clear()
    pad.ring.clear()

    if (state === 'placing') {
      const pulse = 0.55 + Math.sin(this.phase * 3.8 + index * 1.4) * 0.45
      const color = isSelected ? PAD_AMBER : PAD_CYAN
      const baseAlpha = isSelected ? 1 : 0.75

      pad.glow
        .ellipse(x, y, 40, 14)
        .fill({ color, alpha: pulse * 0.20 * baseAlpha })

      pad.ring
        .ellipse(x, y, 30, 10)
        .stroke({ color, alpha: pulse * baseAlpha, width: isSelected ? 2 : 1.5 })
      pad.ring
        .circle(x, y, 3)
        .fill({ color, alpha: 1 })

      pad.ring
        .moveTo(x - 14, y).lineTo(x - 7, y)
        .stroke({ color, alpha: 0.55 * baseAlpha, width: 1 })
      pad.ring
        .moveTo(x + 7, y).lineTo(x + 14, y)
        .stroke({ color, alpha: 0.55 * baseAlpha, width: 1 })
      pad.ring
        .moveTo(x, y - 7).lineTo(x, y - 14)
        .stroke({ color, alpha: 0.55 * baseAlpha, width: 1 })

    } else if (state === 'constructing') {
      if (!isSelected) {
        pad.glow.ellipse(x, y, 22, 7).fill({ color: PAD_CYAN, alpha: 0.05 })
        return
      }

      pad.buildProgress = Math.min(1, pad.buildProgress + dt * 0.22)
      const p = pad.buildProgress
      const h = Math.max(6, p * 72)

      pad.ring
        .ellipse(x, y, 30, 10)
        .stroke({ color: PAD_AMBER, alpha: 0.85, width: 2 })

      for (const bx of [-18, -6, 6, 18]) {
        pad.glow
          .rect(x + bx - 1.5, y - h, 3, h)
          .fill({ color: SCAFFOLD, alpha: 0.62 })
      }
      if (p > 0.35) {
        pad.glow
          .rect(x - 18, y - h * 0.5 - 1, 40, 2)
          .fill({ color: SCAFFOLD, alpha: 0.40 })
      }
      if (p > 0.72) {
        pad.glow
          .rect(x - 18, y - h * 0.85 - 1, 40, 2)
          .fill({ color: SCAFFOLD, alpha: 0.30 })
      }

      const beacon = 0.6 + Math.sin(this.phase * 5) * 0.4
      pad.ring.circle(x, y - h - 4, 4).fill({ color: PAD_AMBER, alpha: beacon })

    } else {
      // operational
      if (!isSelected) {
        pad.glow.ellipse(x, y, 22, 7).fill({ color: PAD_CYAN, alpha: 0.05 })
        return
      }

      pad.buildProgress = 1
      const breathe = 0.65 + Math.sin(this.phase * 1.6) * 0.20

      pad.ring
        .ellipse(x, y, 32, 11)
        .fill({ color: PAD_AMBER, alpha: 0.14 })
        .stroke({ color: PAD_AMBER, alpha: 0.88, width: 2 })

      const sH = 64
      const sW = 30

      pad.glow
        .rect(x - sW / 2, y - 7, sW, 7)
        .fill({ color: ROCK_RIDGE, alpha: 0.95 })
        .stroke({ color: PAD_AMBER, alpha: 0.65, width: 1 })

      pad.glow
        .rect(x - 10, y - sH, 20, sH - 7)
        .fill({ color: STRUCT_BODY, alpha: 0.92 })
        .stroke({ color: PAD_CYAN, alpha: 0.45, width: 1 })

      pad.glow
        .rect(x - 1.5, y - sH - 14, 3, 14)
        .fill({ color: PAD_CYAN, alpha: 0.65 })
      pad.glow
        .circle(x, y - sH - 14, 3)
        .fill({ color: PAD_AMBER, alpha: breathe })

      pad.glow
        .rect(x - 6, y - sH + 10, 5, 4)
        .fill({ color: PAD_CYAN, alpha: breathe * 0.82 })
      pad.glow
        .rect(x + 2, y - sH + 10, 5, 4)
        .fill({ color: PAD_CYAN, alpha: breathe * 0.65 })

      pad.glow
        .ellipse(x, y - sH * 0.45, sW + 22, sH * 0.72)
        .fill({ color: PAD_CYAN, alpha: breathe * 0.055 })
    }
  }
}
