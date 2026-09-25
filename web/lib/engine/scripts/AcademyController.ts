import { Container, Graphics } from 'pixi.js'
import { ScriptBehaviour } from '../components/ScriptBehaviour'
import type { RuntimeContext } from '../RuntimeContext'

export interface AcademyScenePalette {
  surface: number
  surfaceBright: number
  hairline: number
  cyan: number
  cyanBright: number
  text: number
  textMuted: number
}

export interface AcademyCrewCounts {
  astronaut: number
  rover: number
  drone: number
}

export interface AcademyControllerOptions {
  container: Container
  worldWidth: number
  worldHeight: number
  getActiveTraining: () => number
  getFunded: () => boolean
  getCrewCounts: () => AcademyCrewCounts
  palette: AcademyScenePalette
}

const MAX_FIGURES_PER_CLASS = 5

/** Animated Earth-side academy yard: pool, centrifuge, and moving crew shaped/colored by roster composition. */
export class AcademyController extends ScriptBehaviour {
  private readonly opts: AcademyControllerOptions
  private readonly animation = new Graphics()
  private phase = 0

  constructor(context: RuntimeContext, opts: AcademyControllerOptions) {
    super(context)
    this.opts = opts
  }

  start(): void {
    const { container, worldWidth: w, worldHeight: h, palette } = this.opts
    const g = new Graphics()
    g.rect(0, 0, w, h).fill(palette.surface)
    g.rect(0, h * .66, w, h * .34).fill(palette.hairline)
    for (let x = 0; x < w; x += 38) {
      g.moveTo(x, h * .66).lineTo(x, h).stroke({ color: palette.textMuted, width: 1, alpha: .4 })
    }

    // Training hall.
    g.roundRect(w * .06, h * .20, w * .42, h * .46, 8)
      .fill(palette.surfaceBright)
      .stroke({ color: palette.textMuted, width: 2 })
    g.rect(w * .10, h * .28, w * .34, h * .08).fill(palette.text)
    for (let x = w * .13; x < w * .42; x += w * .08) {
      g.rect(x, h * .41, w * .045, h * .20).fill(palette.hairline).stroke({ color: palette.textMuted, width: 1 })
    }

    // Neutral-buoyancy pool.
    g.roundRect(w * .56, h * .48, w * .36, h * .18, 10)
      .fill(palette.cyanBright)
      .stroke({ color: palette.cyan, width: 3 })
    for (let y = h * .51; y < h * .64; y += 12) {
      g.moveTo(w * .58, y).lineTo(w * .90, y).stroke({ color: 0xffffff, width: 1, alpha: .3 })
    }
    container.addChild(g, this.animation)
  }

  update(dt: number): void {
    this.phase += dt
    const { worldWidth: w, worldHeight: h, palette } = this.opts
    const active = this.opts.getActiveTraining()
    const funded = this.opts.getFunded()
    const counts = this.opts.getCrewCounts()
    const g = this.animation
    g.clear()

    // Centrifuge arm and capsule.
    const cx = w * .69
    const cy = h * .31
    g.circle(cx, cy, h * .09).stroke({ color: funded ? palette.cyan : palette.textMuted, width: 3, alpha: .8 })
    const angle = funded ? this.phase * (active > 0 ? 2.2 : .5) : 0
    const radius = h * .09
    const px = cx + Math.cos(angle) * radius
    const py = cy + Math.sin(angle) * radius
    g.moveTo(cx, cy).lineTo(px, py).stroke({ color: palette.text, width: 3 })
    g.roundRect(px - 9, py - 6, 18, 12, 3).fill({ color: funded ? palette.cyanBright : palette.textMuted })

    // Roster composition, walking the yard: circle astronauts, diamond
    // rovers, triangle drones — same shape language as the roster's
    // .classMark marks, so the scene reads as the actual crew, not a
    // generic headcount.
    const lanes: Array<{ count: number; shape: 'circle' | 'diamond' | 'triangle'; laneY: number }> = [
      { count: Math.min(counts.astronaut, MAX_FIGURES_PER_CLASS), shape: 'circle', laneY: h * .76 },
      { count: Math.min(counts.rover, MAX_FIGURES_PER_CLASS), shape: 'diamond', laneY: h * .82 },
      { count: Math.min(counts.drone, MAX_FIGURES_PER_CLASS), shape: 'triangle', laneY: h * .70 },
    ]
    for (const lane of lanes) {
      for (let i = 0; i < lane.count; i++) {
        const walk = (this.phase * 12 + i * 42) % Math.max(80, w * .34)
        const x = w * .10 + walk
        const y = lane.laneY + Math.sin(this.phase * 3 + i) * 2
        this.drawFigure(g, lane.shape, x, y, palette)
      }
    }
    // Empty facility: at least one idle marker so the yard never reads as
    // totally dead before the first hire/trainee.
    if (counts.astronaut + counts.rover + counts.drone === 0) {
      this.drawFigure(g, 'circle', w * .10, h * .76, palette)
    }
  }

  private drawFigure(g: Graphics, shape: 'circle' | 'diamond' | 'triangle', x: number, y: number, palette: AcademyScenePalette) {
    g.circle(x, y - 17, 4).fill({ color: palette.text })
    if (shape === 'circle') {
      g.roundRect(x - 5, y - 13, 10, 15, 3).fill({ color: palette.cyanBright })
    } else if (shape === 'diamond') {
      g.poly([x, y - 13, x + 6, y - 5.5, x, y + 2, x - 6, y - 5.5]).fill({ color: palette.textMuted })
    } else {
      g.poly([x, y - 13, x + 6, y + 2, x - 6, y + 2]).fill({ color: palette.cyan })
    }
    g.moveTo(x - 3, y + 2).lineTo(x - 5, y + 10).stroke({ color: palette.text, width: 2 })
    g.moveTo(x + 3, y + 2).lineTo(x + 5, y + 10).stroke({ color: palette.text, width: 2 })
  }
}
