import { Container } from 'pixi.js'
import { ScriptBehaviour } from '../components/ScriptBehaviour'
import { ShapeRenderer } from '../components/ShapeRenderer'
import { GameObject } from '../GameObject'
import type { RuntimeContext } from '../RuntimeContext'
import type { EntityBounds } from '../InputManager'

const SCROLL_SPEED = 72
const LASER_SPEED = 480
export const SHIP_X = 80
export const SHIP_Y = 72
export const SURFACE_Y = 200
const ORE_SIZE = 20
const HIT_TOLERANCE = 28
const LASER_SIZE = { width: 4, height: 16 }
const LASER_COLOR = '#9becff'
const ORE_STROKE = '#0a0a12'
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
 * Side-scrolling mining: ship cruises at the top, asteroid surface at the
 * bottom. Player fires laser DOWNWARD at ore nodes embedded in the rock.
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
    let x = 200
    for (let i = 0; i < 20; i++) {
      x += i === 0 ? 0 : 120 + Math.random() * 60
      this.spawnOre(x)
    }
  }

  update(dt: number): void {
    const dx = SCROLL_SPEED * dt
    const ldy = LASER_SPEED * dt

    for (const ore of this.ores) {
      ore.go.transform.position.x -= dx
    }

    const last = this.ores[this.ores.length - 1]
    const needsSpawn = !last || last.go.transform.position.x < this.opts.worldWidth + 100
    if (needsSpawn && this.ores.length < MAX_ORES) {
      const lastX = last ? last.go.transform.position.x : 0
      this.spawnOre(lastX + 120 + Math.random() * 60)
    }

    for (const laser of this.lasers) {
      laser.go.transform.position.y += ldy
    }

    this.resolveCollisions()
    this.removeOffscreen()
  }

  fireLaser(): void {
    const go = new GameObject(`laser-${this.laserCounter++}`, 'Laser', {
      position: { x: SHIP_X, y: SHIP_Y + 16 },
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
    const maxHp = 2 + Math.floor(Math.random() * 2)
    const y = SURFACE_Y - ORE_SIZE / 2
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

  private resolveCollisions(): void {
    for (const laser of this.lasers) {
      const lx = laser.go.transform.position.x
      const ly = laser.go.transform.position.y

      for (const ore of this.ores) {
        const ox = ore.go.transform.position.x
        const oy = ore.go.transform.position.y

        if (ly < oy - ORE_SIZE / 2 || ly > oy + ORE_SIZE / 2) continue
        if (Math.abs(lx - ox) >= HIT_TOLERANCE) continue

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
      if (laser.go.active && laser.go.transform.position.y < this.opts.worldHeight + LASER_SIZE.height) return true
      laser.go.destroy()
      this.gameObject.children = this.gameObject.children.filter(c => c !== laser.go)
      return false
    })
  }

  static shipBounds(): EntityBounds {
    return { x: SHIP_X - 20, y: SHIP_Y - 12, width: 56, height: 24 }
  }
}
