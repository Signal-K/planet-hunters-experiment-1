import { Sprite, Container } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { Component, ComponentData } from '../types'
import type { GameObject } from '../GameObject'
import { AssetManager, PLACEHOLDER_TINT } from '../AssetManager'

export interface SpriteRendererData {
  type: 'SpriteRenderer'
  /** Logical sprite name, resolved via the AssetManager manifest (preferred). */
  sprite?: string
  /** Direct asset URL, used if `sprite` is not set (legacy/back-compat). */
  textureUrl?: string
  anchorX?: number
  anchorY?: number
  tint?: number
}

export class SpriteRenderer implements Component {
  readonly type = 'SpriteRenderer'
  gameObject!: GameObject
  private sprite: Sprite | null = null
  private container: Container
  private spriteName?: string
  private textureUrl?: string
  private anchorX: number
  private anchorY: number
  private tint?: number
  private assets: AssetManager

  constructor(data: Omit<SpriteRendererData, 'type'>, container: Container, assets: AssetManager) {
    this.spriteName = data.sprite
    this.textureUrl = data.textureUrl
    this.anchorX = data.anchorX ?? 0.5
    this.anchorY = data.anchorY ?? 0.5
    this.tint = data.tint
    this.container = container
    this.assets = assets
  }

  start(): void {
    const resolve = this.spriteName
      ? this.assets.loadTexture(this.spriteName)
      : this.textureUrl
        ? this.assets.loadTextureByUrl(this.textureUrl)
        : Promise.resolve({ texture: undefined, isPlaceholder: true })

    resolve.then(result => {
      if (!result.texture) return
      this.sprite = new Sprite(result.texture)
      this.sprite.anchor.set(this.anchorX, this.anchorY)
      this.sprite.tint = result.isPlaceholder ? PLACEHOLDER_TINT : (this.tint ?? 0xffffff)
      this.container.addChild(this.sprite)
      this.syncTransform()
    })
  }

  update(_dt: number): void {
    this.syncTransform()
  }

  private syncTransform(): void {
    if (!this.sprite) return
    const t = this.gameObject.transform
    this.sprite.x = t.position.x
    this.sprite.y = t.position.y
    this.sprite.rotation = t.rotation
    this.sprite.scale.set(t.scale.x, t.scale.y)
  }

  destroy(): void {
    this.sprite?.destroy()
    this.sprite = null
  }

  toJSON(): ComponentData {
    return {
      type: 'SpriteRenderer',
      ...(this.spriteName !== undefined && { sprite: this.spriteName }),
      ...(this.textureUrl !== undefined && { textureUrl: this.textureUrl }),
      anchorX: this.anchorX,
      anchorY: this.anchorY,
      ...(this.tint !== undefined && { tint: this.tint }),
    }
  }

  /** Factory: build from scene JSON component data */
  static fromData(data: SpriteRendererData, container: Container, assets: AssetManager): SpriteRenderer {
    return new SpriteRenderer({ ...data }, container, assets)
  }
}

/** Register a wiring function that attaches SpriteRenderer to GameObjects loaded from scene JSON. */
export function wireSpriteRenderers(
  app: Application,
  entityData: import('../types').EntityData[],
  scene: import('../Scene').Scene,
  assets: AssetManager
): void {
  for (const e of entityData) {
    const obj = scene.find(e.id)
    if (!obj) continue
    for (const cd of e.components) {
      if (cd.type === 'SpriteRenderer') {
        const d = cd as unknown as SpriteRendererData
        const sr = SpriteRenderer.fromData(d, app.stage, assets)
        obj.addComponent(sr)
      }
    }
  }
}
