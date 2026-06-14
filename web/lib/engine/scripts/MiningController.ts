import { Container } from 'pixi.js'
import { ScriptBehaviour } from '../components/ScriptBehaviour'
import { ShapeRenderer } from '../components/ShapeRenderer'
import { GameObject } from '../GameObject'
import type { RuntimeContext } from '../RuntimeContext'
import type { EntityBounds } from '../InputManager'

/** Pixels/second. Matches the original DOM side-scroller (1.2px @ 60fps). */
const SCROLL_SPEED = 72
/** Pixels/second. Matches the original DOM side-scroller (8px @ 60fps). */
const LASER_SPEED = 480
const SHIP_X = 50
const SHIP_Y = 140
const ORE_SIZE = 28
const LASER_SIZE = { width: 14, height: 4 }
const LASER_COLOR = '#9becff'
const ORE_STROKE = '#0a0a12'
/** Caps unbounded ore growth if the player goes a long time without firing. */
const MAX_ORES = 60

export interface MiningControllerOptions {
  container: Container
  worldWidth: number
  worldHeight: number
  minerals: string[]
  mineralColors: Record<string, string>
  onCollect: (mineral: string) => void
}

interface OreEntity {
  go: GameObject
  mineral: string
  hp: number
  maxHp: number
}

interface LaserEntity {
  go: GameObject
}

/**
 * Drives the mining minigame: spawns scrolling ore nodes, fires/advances laser
 * projectiles, and resolves AABB collisions. Mirrors the constants and collision
 * logic of the original DOM-based MiningScreen so gameplay feel matches.
 */
export class MiningController extends ScriptBehaviour {
  private opts: MiningControllerOptions
  private ores: OreEntity[] = []
  private lasers: LaserEntity[] = []
  private oreCounter = 0
  private laserCounter = 0

  constructor(context: RuntimeContext, opts: MiningControllerOptions) {
    super(context)
    this.opts = opts
  }

  start(): void {
    let x = 100
    for (let i = 0; i < 20; i++) {
      x += i === 0 ? 0 : 180 + Math.random() * 60
      this.spawnOre(x)
    }
  }

  update(dt: number): void {
    const dx = SCROLL_SPEED * dt

    for (const ore of this.ores) {
      ore.go.transform.position.x -= dx
    }
    const last = this.ores[this.ores.length - 1]
    const needsSpawn = !last || last.go.transform.position.x < this.opts.worldWidth + 100
    if (needsSpawn && this.ores.length < MAX_ORES) {
      const lastX = last ? last.go.transform.position.x : 0
      this.spawnOre(lastX + 180 + Math.random() * 60)
    }

    const ldx = LASER_SPEED * dt
    for (const laser of this.lasers) {
      laser.go.transform.position.x += ldx
    }

    this.resolveCollisions()
    this.removeOffscreen()
  }

  /** Fire a new laser projectile from the ship's position. */
  fireLaser(): void {
    const go = new GameObject(`laser-${this.laserCounter++}`, 'Laser', {
      position: { x: SHIP_X, y: SHIP_Y + (Math.random() - 0.5) * 20 },
    })
    go.addComponent(
      new ShapeRenderer(
        { shape: 'rect', width: LASER_SIZE.width, height: LASER_SIZE.height, color: LASER_COLOR },
        this.opts.container
      )
    )
    this.gameObject.addChild(go)
    go.start()
    this.lasers.push({ go })
  }

  private spawnOre(x: number): void {
    const mineral = this.opts.minerals[this.oreCounter % this.opts.minerals.length]
    const maxHp = 3 + Math.floor(Math.random() * 3)
    const y = 140 + Math.sin(this.oreCounter * 1.5) * 30
    const go = new GameObject(`ore-${this.oreCounter++}`, 'Ore', { position: { x, y } })
    go.addComponent(
      new ShapeRenderer(
        {
          shape: 'circle',
          width: ORE_SIZE,
          height: ORE_SIZE,
          color: this.opts.mineralColors[mineral] ?? '#ffffff',
          strokeColor: ORE_STROKE,
        },
        this.opts.container
      )
    )
    this.gameObject.addChild(go)
    go.start()
    this.ores.push({ go, mineral, hp: maxHp, maxHp })
  }

  /** AABB collision: laser.x in [ore.x-10, ore.x+30] and |laser.y - SHIP_Y| < 40. */
  private resolveCollisions(): void {
    for (const laser of this.lasers) {
      const lx = laser.go.transform.position.x
      const ly = laser.go.transform.position.y
      if (Math.abs(ly - SHIP_Y) >= 40) continue

      for (const ore of this.ores) {
        const ox = ore.go.transform.position.x
        if (lx < ox - 10 || lx > ox + 30) continue

        ore.hp -= 1
        laser.go.active = false
        if (ore.hp <= 0) {
          ore.go.active = false
          this.opts.onCollect(ore.mineral)
        }
        break
      }
    }
  }

  private removeOffscreen(): void {
    this.ores = this.ores.filter(ore => {
      if (ore.go.active && ore.go.transform.position.x > -ORE_SIZE) return true
      ore.go.destroy()
      this.gameObject.children = this.gameObject.children.filter(c => c !== ore.go)
      return false
    })

    this.lasers = this.lasers.filter(laser => {
      if (laser.go.active && laser.go.transform.position.x < this.opts.worldWidth + LASER_SIZE.width) return true
      laser.go.destroy()
      this.gameObject.children = this.gameObject.children.filter(c => c !== laser.go)
      return false
    })
  }

  /** Bounds of the ship, for InputManager entity-scoped listeners or hit-testing. */
  static shipBounds(): EntityBounds {
    return { x: SHIP_X, y: SHIP_Y, width: 40, height: 50 }
  }
}
