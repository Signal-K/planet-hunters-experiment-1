import { Graphics, Container } from 'pixi.js'
import type { Component, ComponentData } from '../types'
import type { GameObject } from '../GameObject'

export type ShapeKind = 'triangle' | 'circle' | 'rect' | 'diamond'

export interface ShapeRendererData {
  type: 'ShapeRenderer'
  shape: ShapeKind
  width: number
  height: number
  /** Fill color as a CSS hex string, e.g. "#6cc2ff". */
  color: string
  /** Optional stroke color as a CSS hex string. */
  strokeColor?: string
  strokeWidth?: number
}

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

/**
 * Renders a simple vector shape (triangle/circle/rect) via PixiJS Graphics, for
 * entities that don't have raster sprite assets (ship, lasers, ore markers).
 * Follows the same Component contract as SpriteRenderer.
 */
export class ShapeRenderer implements Component {
  readonly type = 'ShapeRenderer'
  gameObject!: GameObject
  private graphics: Graphics | null = null
  private container: Container
  private shape: ShapeKind
  private width: number
  private height: number
  private color: string
  private strokeColor?: string
  private strokeWidth: number

  constructor(data: Omit<ShapeRendererData, 'type'>, container: Container) {
    this.shape = data.shape
    this.width = data.width
    this.height = data.height
    this.color = data.color
    this.strokeColor = data.strokeColor
    this.strokeWidth = data.strokeWidth ?? 2
    this.container = container
  }

  start(): void {
    this.graphics = new Graphics()
    this.draw()
    this.container.addChild(this.graphics)
    this.syncTransform()
  }

  update(_dt: number): void {
    this.syncTransform()
  }

  private draw(): void {
    const g = this.graphics
    if (!g) return
    const w = this.width
    const h = this.height
    const fill = hexToNumber(this.color)

    switch (this.shape) {
      case 'triangle':
        g.poly([-w / 2, -h / 2, w / 2, 0, -w / 2, h / 2])
        break
      case 'circle':
        g.circle(0, 0, w / 2)
        break
      case 'rect':
        g.rect(-w / 2, -h / 2, w, h)
        break
      case 'diamond':
        g.poly([0, -h / 2, w / 2, 0, 0, h / 2, -w / 2, 0])
        break
    }
    g.fill(fill)
    if (this.strokeColor) {
      g.stroke({ width: this.strokeWidth, color: hexToNumber(this.strokeColor) })
    }
  }

  private syncTransform(): void {
    if (!this.graphics) return
    const t = this.gameObject.transform
    this.graphics.x = t.position.x
    this.graphics.y = t.position.y
    this.graphics.rotation = t.rotation
    this.graphics.scale.set(t.scale.x, t.scale.y)
  }

  /** Apply a PixiJS multiply-tint to the graphics (0xffffff = no tint). Draw ores in white
   * and call this with the mineral color so flashing just resets to 0xffffff. */
  setTint(tint: number): void {
    if (this.graphics) this.graphics.tint = tint
  }

  destroy(): void {
    if (this.graphics) {
      this.graphics.parent?.removeChild(this.graphics)
      this.graphics.destroy()
      this.graphics = null
    }
  }

  toJSON(): ComponentData {
    return {
      type: 'ShapeRenderer',
      shape: this.shape,
      width: this.width,
      height: this.height,
      color: this.color,
      ...(this.strokeColor !== undefined && { strokeColor: this.strokeColor, strokeWidth: this.strokeWidth }),
    }
  }

  static fromData(data: ShapeRendererData, container: Container): ShapeRenderer {
    return new ShapeRenderer({ ...data }, container)
  }
}

/** Register a wiring function that attaches ShapeRenderer to GameObjects loaded from scene JSON. */
export function wireShapeRenderers(
  container: Container,
  entityData: import('../types').EntityData[],
  scene: import('../Scene').Scene
): void {
  for (const e of entityData) {
    const obj = scene.find(e.id)
    if (!obj) continue
    for (const cd of e.components) {
      if (cd.type === 'ShapeRenderer') {
        const d = cd as unknown as ShapeRendererData
        obj.addComponent(ShapeRenderer.fromData(d, container))
      }
    }
  }
}
