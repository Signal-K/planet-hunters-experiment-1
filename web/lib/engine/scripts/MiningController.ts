import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import { ScriptBehaviour } from '../components/ScriptBehaviour'
import { ShapeRenderer } from '../components/ShapeRenderer'
import type { ShapeKind } from '../components/ShapeRenderer'
import { GameObject } from '../GameObject'
import type { RuntimeContext } from '../RuntimeContext'
import type { EntityBounds } from '../InputManager'

export const SCROLL_SPEED = 48
export const SCROLL_SPEED_MIN = 16
export const SCROLL_SPEED_MAX = 96
const LASER_SPEED = 480
export const SHIP_X = 80
export const SHIP_Y = 112
export const SURFACE_Y = 320
// Wider than ship X so ore movement during laser flight doesn't cause misses on tall screens
const HIT_TOLERANCE = 48
const LASER_SIZE = { width: 4, height: 16 }
const LASER_COLOR = '#9becff'
const ORE_STROKE = '#0a0a12'
const MAX_ORES = 60
const FLASH_DURATION = 0.14

/** Organic ore gap distribution: 20% tight cluster, 50% normal, 30% wide open space */
function oreGap(): number {
  const r = Math.random()
  if (r < 0.20) return 55  + Math.random() * 40   // close follow-on
  if (r < 0.70) return 100 + Math.random() * 100  // normal spacing
  return 220 + Math.random() * 160                 // barren stretch
}

/** Per-laser-tier ore properties: radius, hp, depth range within rock surface */
const ORE_TIER: Record<number, { radius: number; maxHp: number; depthMin: number; depthMax: number }> = {
  1: { radius: 10, maxHp: 1, depthMin: 8,  depthMax: 30 },
  2: { radius: 13, maxHp: 2, depthMin: 32, depthMax: 60 },
  3: { radius: 17, maxHp: 3, depthMin: 62, depthMax: 96 },
}

export interface MiningControllerOptions {
  container: Container
  worldWidth: number
  worldHeight: number
  /** Overrides SURFACE_Y when the world is sized dynamically from the viewport. */
  surfaceY?: number
  /** Overrides SHIP_Y when the world is sized dynamically from the viewport. */
  shipY?: number
  minerals: string[]
  mineralColors: Record<string, string>
  /** laserAccess tier per mineral (1=common, 2=uncommon, 3=exotic). Drives size/depth/hp. */
  mineralLaserAccess?: Record<string, number>
  /** Shape per mineral key — defaults to 'circle' if not provided. */
  mineralShapes?: Record<string, ShapeKind>
  mineralTextures?: Record<string, Texture>
  onCollect: (mineral: string) => void
  /** Called when a laser exits the world without hitting any ore (miss). */
  onMiss?: () => void
  /** Called every update with the total horizontal scroll distance so callers can sync visual layers. */
  onScroll?: (scrollX: number) => void
  /** Called when any ore enters or leaves the "fire now" window around SHIP_X. */
  onOreNearby?: (near: boolean) => void
}

interface OreEntity {
  go: GameObject
  renderer: ShapeRenderer | null
  sprite: Sprite | null
  mineral: string
  hp: number
  maxHp: number
  radius: number
  flashTimer: number
  mineralColor: number
}

interface LaserEntity {
  go: GameObject
  prevY: number
}

interface Particle {
  g: Graphics
  vx: number
  vy: number
  life: number
  maxLife: number
}

/**
 * Side-scrolling mining: ship cruises at the top, asteroid surface at the
 * bottom. Player fires laser DOWNWARD at ore nodes embedded in the rock.
 * Common ores sit near the surface; rare ores are buried deeper.
 */
export class MiningController extends ScriptBehaviour {
  private opts: MiningControllerOptions
  private ores: OreEntity[] = []
  private lasers: LaserEntity[] = []
  private particles: Particle[] = []
  private oreCounter = 0
  private laserCounter = 0
  private totalScrollX = 0
  private scrollSpeed = SCROLL_SPEED
  private oreNearState = false

  constructor(context: RuntimeContext, opts: MiningControllerOptions) {
    super(context)
    this.opts = opts
  }

  /** Override the terrain scroll speed (px/s). Clamped to SCROLL_SPEED_MIN..SCROLL_SPEED_MAX. */
  setScrollSpeed(speed: number): void {
    this.scrollSpeed = Math.max(SCROLL_SPEED_MIN, Math.min(SCROLL_SPEED_MAX, speed))
  }

  start(): void {
    let x = 160
    let count = 0
    while (count < 20) {
      this.spawnOre(x)
      count++
      // Occasionally spawn a close companion (cluster of 2-3)
      const clusterRoll = Math.random()
      if (clusterRoll < 0.18 && count < 20) {
        x += 45 + Math.random() * 35
        this.spawnOre(x)
        count++
        if (Math.random() < 0.35 && count < 20) {
          x += 40 + Math.random() * 30
          this.spawnOre(x)
          count++
        }
      }
      x += oreGap()
    }
  }

  update(dt: number): void {
    const dx = this.scrollSpeed * dt
    this.totalScrollX += dx

    for (const ore of this.ores) {
      ore.go.transform.position.x -= dx
      if (ore.sprite) ore.sprite.x = ore.go.transform.position.x

      if (ore.flashTimer > 0) {
        ore.flashTimer = Math.max(0, ore.flashTimer - dt)
        if (ore.flashTimer <= 0) {
          this.applyTint(ore, this.damagedTint(ore))
        }
      }
    }

    const last = this.ores[this.ores.length - 1]
    const needsSpawn = !last || last.go.transform.position.x < this.opts.worldWidth + 120
    if (needsSpawn && this.ores.length < MAX_ORES) {
      const lastX = last ? last.go.transform.position.x : 0
      this.spawnOre(lastX + oreGap())
    }

    for (const laser of this.lasers) {
      laser.prevY = laser.go.transform.position.y
      laser.go.transform.position.y += LASER_SPEED * dt
    }

    this.resolveCollisions()
    this.removeOffscreen()
    this.updateParticles(dt)

    this.opts.onScroll?.(this.totalScrollX)

    const anyNear = this.ores.some(o => o.go.active && Math.abs(o.go.transform.position.x - SHIP_X) < 120)
    if (anyNear !== this.oreNearState) {
      this.oreNearState = anyNear
      this.opts.onOreNearby?.(anyNear)
    }
  }

  fireLaser(): void {
    const go = new GameObject(`laser-${this.laserCounter++}`, 'Laser', {
      position: { x: SHIP_X, y: (this.opts.shipY ?? SHIP_Y) + 16 },
    })
    go.addComponent(
      new ShapeRenderer(
        { shape: 'rect', width: LASER_SIZE.width, height: LASER_SIZE.height, color: LASER_COLOR },
        this.opts.container
      )
    )
    this.gameObject.addChild(go)
    go.start()
    this.lasers.push({ go, prevY: go.transform.position.y })
  }

  getScrollX(): number {
    return this.totalScrollX
  }

  private spawnOre(x: number): void {
    const mineral = this.opts.minerals[this.oreCounter % this.opts.minerals.length]
    const tier = this.opts.mineralLaserAccess?.[mineral] ?? 1
    const cfg = ORE_TIER[tier] ?? ORE_TIER[1]
    const radius = cfg.radius
    const maxHp = cfg.maxHp
    const depth = cfg.depthMin + Math.random() * (cfg.depthMax - cfg.depthMin)
    const y = (this.opts.surfaceY ?? SURFACE_Y) + depth

    const colorHex = this.opts.mineralColors[mineral] ?? '#ffffff'
    const mineralColor = parseInt(colorHex.replace('#', ''), 16)

    const go = new GameObject(`ore-${this.oreCounter++}`, 'Ore', { position: { x, y } })

    const texture = this.opts.mineralTextures?.[mineral]
    let renderer: ShapeRenderer | null = null
    let sprite: Sprite | null = null

    if (texture) {
      sprite = new Sprite(texture)
      const size = radius * 2
      sprite.width = size
      sprite.height = size
      sprite.anchor.set(0.5)
      sprite.x = x
      sprite.y = y
      this.opts.container.addChild(sprite)
    } else {
      const shape: ShapeKind = this.opts.mineralShapes?.[mineral] ?? 'circle'
      renderer = new ShapeRenderer(
        {
          shape,
          width: radius * 2,
          height: radius * 2,
          color: '#ffffff',
          strokeColor: ORE_STROKE,
          strokeWidth: tier > 1 ? 2 + tier : 1.5,
        },
        this.opts.container
      )
      go.addComponent(renderer)
      go.start()
      renderer.setTint(mineralColor)
    }

    this.gameObject.addChild(go)
    this.ores.push({ go, renderer, sprite, mineral, hp: maxHp, maxHp, radius, flashTimer: 0, mineralColor })
  }

  private resolveCollisions(): void {
    for (const laser of this.lasers) {
      const lx = laser.go.transform.position.x
      const ly = laser.go.transform.position.y

      for (const ore of this.ores) {
        const ox = ore.go.transform.position.x
        const oy = ore.go.transform.position.y

        // Swept Y check: did the laser travel THROUGH the ore's Y band this frame?
        const minTravelY = Math.min(laser.prevY, ly)
        const maxTravelY = Math.max(laser.prevY, ly)
        if (maxTravelY < oy - ore.radius || minTravelY > oy + ore.radius) continue
        if (Math.abs(lx - ox) >= HIT_TOLERANCE) continue

        ore.hp -= 1
        laser.go.active = false

        if (ore.hp <= 0) {
          ore.go.active = false
          if (ore.sprite) ore.sprite.visible = false
          this.spawnParticleBurst(ore.go.transform.position.x, ore.go.transform.position.y, ore.mineralColor, ore.radius)
          this.opts.onCollect(ore.mineral)
        } else {
          ore.flashTimer = FLASH_DURATION
          this.applyTint(ore, 0xffffff)
        }
        break
      }
    }
  }

  private applyTint(ore: OreEntity, tint: number): void {
    if (ore.sprite) {
      ore.sprite.tint = tint
    } else {
      ore.renderer?.setTint(tint)
    }
  }

  private removeOffscreen(): void {
    this.ores = this.ores.filter(ore => {
      if (ore.go.active && ore.go.transform.position.x > -(ore.radius * 2)) return true
      ore.go.destroy()
      this.gameObject.children = this.gameObject.children.filter(c => c !== ore.go)
      if (ore.sprite) {
        this.opts.container.removeChild(ore.sprite)
        ore.sprite.destroy()
      }
      return false
    })

    this.lasers = this.lasers.filter(laser => {
      if (laser.go.active && laser.go.transform.position.y < this.opts.worldHeight + LASER_SIZE.height) return true
      const wasMiss = laser.go.active
      laser.go.destroy()
      this.gameObject.children = this.gameObject.children.filter(c => c !== laser.go)
      if (wasMiss) this.opts.onMiss?.()
      return false
    })
  }

  private spawnParticleBurst(x: number, y: number, color: number, radius: number): void {
    const count = 8
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const speed = 50 + Math.random() * 70
      const size = 1.5 + Math.random() * 2.5
      const g = new Graphics()
      g.circle(0, 0, size).fill({ color, alpha: 1 })
      g.x = x + (Math.random() - 0.5) * radius
      g.y = y + (Math.random() - 0.5) * radius
      this.opts.container.addChild(g)
      const life = 0.3 + Math.random() * 0.15
      this.particles.push({ g, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life })
    }
  }

  private updateParticles(dt: number): void {
    this.particles = this.particles.filter(p => {
      p.life -= dt
      if (p.life <= 0) {
        this.opts.container.removeChild(p.g)
        p.g.destroy()
        return false
      }
      p.g.x += p.vx * dt
      p.g.y += p.vy * dt
      p.g.alpha = p.life / p.maxLife
      return true
    })
  }

  /** Darkened mineral tint based on remaining hp fraction */
  private damagedTint(ore: OreEntity): number {
    if (ore.hp >= ore.maxHp) return ore.mineralColor
    const f = ore.hp / ore.maxHp
    const r = Math.round(((ore.mineralColor >> 16) & 0xff) * f)
    const g = Math.round(((ore.mineralColor >> 8) & 0xff) * f)
    const b = Math.round((ore.mineralColor & 0xff) * f)
    return (r << 16) | (g << 8) | b
  }

  static shipBounds(): EntityBounds {
    return { x: SHIP_X - 20, y: SHIP_Y - 12, width: 56, height: 24 }
  }
}
