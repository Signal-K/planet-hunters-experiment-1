import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js'
import { ScriptBehaviour } from '../components/ScriptBehaviour'
import { ShapeRenderer } from '../components/ShapeRenderer'
import type { ShapeKind } from '../components/ShapeRenderer'
import { GameObject } from '../GameObject'
import type { RuntimeContext } from '../RuntimeContext'
import type { EntityBounds } from '../InputManager'
import { devMiningSpeedMultiplier } from '@/lib/devMiningSpeed'
import { hitStopSeconds, pickupPosition, stepHitStop, type HitKind } from '../miningJuice'
import type { DebrisArtSet } from '../debrisArt'
import { fallFrameIndex, landFrameIndex } from '@/lib/orionids/theme'

export const SCROLL_SPEED = 48
export const SCROLL_SPEED_MIN = 16
export const SCROLL_SPEED_MAX = 96
const LASER_SPEED = 480
export const SHIP_X = 80
export const SHIP_Y = 112
export const SURFACE_Y = 320
// Wider than ship X so ore movement during laser flight doesn't cause misses on tall screens
const HIT_TOLERANCE = 56
// Share of ore nodes that are the requested mineral(s) once the seeded ones are out.
const REQUIRED_ORE_SHARE = 0.5
const LASER_SIZE = { width: 4, height: 16 }
const LASER_COLOR = '#9becff'
const ORE_STROKE = '#0a0a12'
// Untinted base fill; the mineral colour is applied with setTint.
const ORE_FILL = '#ffffff'
// Ore sym label — the only disambiguation signal that reaches all 16 minerals:
// half of them render as PNG textures and never touch mineralShapes, and the
// pale platinum-group colors are near-identical. White-on-dark-halo so it stays
// legible over both the pale and the dark ore fills.
const ORE_LABEL_FILL = 0xffffff
const ORE_LABEL_HALO = 0x0a0a12
const MAX_ORES = 60
const FLASH_DURATION = 0.14
// Laser stops this far below the surface — deep enough to reach all ore tiers (max depth 96) + buffer
const LASER_MAX_DEPTH = 124
// Laser reach per equipped drill tier — deliberately stops just short of the next tier's
// depth band so higher-tier ore is visibly present but genuinely unreachable until upgraded.
const LASER_DEPTH_BY_TIER: Record<number, number> = {
  1: 30,
  2: 60,
  3: LASER_MAX_DEPTH,
}

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
  /** Required order minerals are seeded at the front of the run so the
   * objective is always discoverable before the normal deposit rotation. */
  requiredMinerals?: string[]
  mineralColors: Record<string, string>
  /** laserAccess tier per mineral (1=common, 2=uncommon, 3=exotic). Drives size/depth/hp. */
  mineralLaserAccess?: Record<string, number>
  /** Equipped drill/laser part tier (1-3). Caps how deep the laser can travel before fizzling out. */
  maxLaserTier?: number
  /** Shape per mineral key — defaults to 'circle' if not provided. */
  mineralShapes?: Record<string, ShapeKind>
  mineralTextures?: Record<string, Texture>
  /** Element-symbol per mineral key (e.g. `Pt`, `H2O`). Rendered as a label on
   * every ore node — omit to leave ore unlabelled. */
  mineralSyms?: Record<string, string>
  onCollect: (mineral: string) => void
  /** Called when a laser exits the world without hitting any ore (miss). */
  onMiss?: () => void
  /** Called the instant a laser collides with ore. Fires on every hit, whether or not it destroys the ore. */
  onHit?: () => void
  /** Called every update with the total horizontal scroll distance so callers can sync visual layers. */
  onScroll?: (scrollX: number) => void
  /** Called when any ore enters or leaves the "fire now" window around SHIP_X. */
  onOreNearby?: (near: boolean) => void
  /**
   * Live-updating set of mineral keys still needed to fill the order. When
   * set, the "fire now" window only lights up for ore whose mineral is still
   * needed — an ore of an already-satisfied or off-order mineral never flashes.
   * Omit (or leave `current` null) to flash for any ore, regardless of mineral.
   */
  neededMineralsRef?: { current: Set<string> | null }
  /** Skip hit-stop freezes when the player prefers reduced motion. */
  reducedMotion?: boolean
  /**
   * Sky-event debris (SSL-475). Absent, or `getSpawn()` returning null / rate 0,
   * means no debris and no streaks: the scene is the unchanged ore field.
   */
  debris?: {
    /** Live spawn config; null (or rate 0) when the event is not active. */
    getSpawn: () => { mineral: string; ratePerMinute: number; speedFactor: number } | null
  }
  /** Raster shower art. Omit to keep the vector chunk fallback. */
  debrisArt?: DebrisArtSet | null
}

/** Falling debris chunk: descends while scrolling, mineable only after it lands. */
const DEBRIS_RADIUS = 36
const DEBRIS_BASE_FALL_SPEED = 70
/** Cap so a long run cannot fill the field with chunks. */
const MAX_DEBRIS = 4
const MAX_STREAKS = 6
/** Visual-only meteor streak. */
interface Streak {
  g: Graphics | null
  sprite: Sprite | null
  vx: number
  vy: number
  life: number
  maxLife: number
}

interface LiveFx {
  sprite: Sprite
  life: number
  maxLife: number
  frames: Texture[] | null
  fps: number
  grow: boolean
}

interface OreEntity {
  go: GameObject
  renderer: ShapeRenderer | null
  sprite: Sprite | null
  label: Text | null
  mineral: string
  hp: number
  maxHp: number
  radius: number
  flashTimer: number
  mineralColor: number
  /** Falling debris only: px/s descent. Undefined on seam ore. */
  fallSpeed?: number
  /** Debris only. Mineable in `intact` — after the fall and land clips. */
  phase?: 'fall' | 'land' | 'intact'
  animTime: number
  variant: number
}

interface LaserEntity {
  go: GameObject
  prevY: number
}

interface Pickup {
  g: Graphics
  from: { x: number; y: number }
  t: number
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
  private pickups: Pickup[] = []
  private streaks: Streak[] = []
  private liveFx: LiveFx[] = []
  private debrisAccumulator = 0
  private streakAccumulator = 0
  /** First active frame drops a chunk immediately so the shower is visible. */
  private debrisPrimed = false
  private debrisCounter = 0
  private hitStop = 0
  private oreCounter = 0
  private requiredMineralQueue: string[] = []
  private laserCounter = 0
  private totalScrollX = 0
  private scrollSpeed = SCROLL_SPEED
  private oreNearState = false
  /** Local-dev QA multiplier (1 everywhere else), see lib/devMiningSpeed.ts. */
  private readonly devSpeed = devMiningSpeedMultiplier()

  constructor(context: RuntimeContext, opts: MiningControllerOptions) {
    super(context)
    this.opts = opts
  }

  /** Override the terrain scroll speed (px/s). Clamped to SCROLL_SPEED_MIN..SCROLL_SPEED_MAX. */
  setScrollSpeed(speed: number): void {
    this.scrollSpeed = Math.max(SCROLL_SPEED_MIN, Math.min(SCROLL_SPEED_MAX, speed))
  }

  start(): void {
    this.requiredMineralQueue = [...(this.opts.requiredMinerals ?? [])]
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

  update(realDt: number): void {
    const stepped = stepHitStop(this.hitStop, realDt)
    this.hitStop = stepped.remaining
    const dt = stepped.simDt
    if (this.hitStop > 0) return // frozen: the whole scene holds for the impact
    const dx = this.scrollSpeed * this.devSpeed * dt
    this.totalScrollX += dx

    for (const ore of this.ores) {
      ore.go.transform.position.x -= dx
      if (ore.sprite) ore.sprite.x = ore.go.transform.position.x
      if (ore.label) ore.label.x = ore.go.transform.position.x

      if (ore.flashTimer > 0) {
        ore.flashTimer = Math.max(0, ore.flashTimer - dt)
        if (ore.flashTimer <= 0) {
          this.applyTint(ore, this.damagedTint(ore))
        }
      }
    }

    this.updateDebris(dt)
    this.updateLiveFx(dt)

    const seamOres = this.ores.filter(o => o.fallSpeed === undefined)
    const last = seamOres[seamOres.length - 1]
    const needsSpawn = !last || last.go.transform.position.x < this.opts.worldWidth + 120
    if (needsSpawn && this.ores.length < MAX_ORES + 8) {
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
    this.updatePickups(dt)

    this.opts.onScroll?.(this.totalScrollX)

    const needed = this.opts.neededMineralsRef?.current
    const anyNear = this.ores.some(o => o.go.active
      && Math.abs(o.go.transform.position.x - SHIP_X) < HIT_TOLERANCE
      && (!needed || needed.has(o.mineral)))
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

  /** Spawns falling debris + decorative streaks while the event rate is above zero. */
  private updateDebris(dt: number): void {
    const debris = this.opts.debris
    const groundY = (this.opts.surfaceY ?? SURFACE_Y) - 4
    for (const ore of this.ores) {
      if (ore.phase === undefined) continue
      this.stepDebris(ore, dt, groundY)
    }
    this.updateStreaks(dt)
    if (!debris) return
    const spawn = debris.getSpawn()
    if (!spawn || !(spawn.ratePerMinute > 0)) { this.debrisAccumulator = 0; this.debrisPrimed = false; return }
    if (!this.debrisPrimed) {
      this.debrisPrimed = true
      this.debrisAccumulator = Math.max(this.debrisAccumulator, 1)
      this.streakAccumulator = Math.max(this.streakAccumulator, 1)
    }
    const rate = spawn.ratePerMinute
    this.debrisAccumulator += (rate / 60) * dt
    this.streakAccumulator += (rate / 60) * dt * 2
    let alive = this.ores.filter(o => o.phase !== undefined).length
    while (this.debrisAccumulator >= 1) {
      this.debrisAccumulator -= 1
      if (alive >= MAX_DEBRIS) continue
      this.spawnDebris(spawn.mineral, spawn.speedFactor)
      alive += 1
    }
    while (this.streakAccumulator >= 1) {
      this.streakAccumulator -= 1
      if (this.streaks.length < MAX_STREAKS) this.spawnStreak(spawn.speedFactor)
    }
  }

  /** Fall until the ground contact meets the surface, play land, then sit mineable. */
  private stepDebris(ore: OreEntity, dt: number, groundY: number): void {
    if (ore.phase === 'fall') {
      const speed = ore.fallSpeed ?? 0
      const y = Math.min(ore.go.transform.position.y + speed * dt, groundY)
      this.placeDebris(ore, y)
      ore.animTime += dt
      if (y >= groundY - 0.5) {
        ore.fallSpeed = 0
        ore.animTime = 0
        const art = this.opts.debrisArt
        const useSheet = !!art && art.fallFrames.length >= 8 && ore.variant === 0 && !this.opts.reducedMotion
        ore.phase = useSheet ? 'land' : 'intact'
        if (ore.phase === 'intact') this.showIntact(ore)
        else this.showFallFrame(ore, 6)
      } else if (ore.variant === 0) {
        const art = this.opts.debrisArt
        const frame = art
          ? fallFrameIndex(ore.animTime, art.fallFps, Math.min(6, art.fallFrames.length), !!this.opts.reducedMotion)
          : 0
        this.showFallFrame(ore, frame)
      }
      return
    }
    if (ore.phase === 'land') {
      ore.animTime += dt
      const art = this.opts.debrisArt
      const fps = art?.fallFps ?? 24
      const land = landFrameIndex(ore.animTime, fps, !!this.opts.reducedMotion)
      this.showFallFrame(ore, land.frame)
      if (land.done) {
        ore.phase = 'intact'
        this.showIntact(ore)
      }
    }
  }

  private placeDebris(ore: OreEntity, y: number): void {
    ore.go.transform.position.y = y
    if (ore.sprite) ore.sprite.y = y
    if (ore.label) ore.label.y = y
  }

  private showFallFrame(ore: OreEntity, frame: number): void {
    const art = this.opts.debrisArt
    if (!art || !ore.sprite || art.fallFrames.length === 0) return
    const tex = art.fallFrames[Math.min(frame, art.fallFrames.length - 1)]
    ore.sprite.texture = tex
    ore.sprite.anchor.set(art.fallAnchor.x, art.fallAnchor.y)
  }

  private showIntact(ore: OreEntity): void {
    const art = this.opts.debrisArt
    const piece = art?.intact[ore.variant]
    if (!art || !ore.sprite || !piece) return
    ore.sprite.texture = piece.texture
    ore.sprite.anchor.set(piece.ax, piece.ay)
  }

  private spawnDebris(mineral: string, speedFactor: number): void {
    const x = 40 + Math.random() * Math.max(80, this.opts.worldWidth - 80)
    const y = -20 - Math.random() * 40
    const colorHex = this.opts.mineralColors[mineral] ?? LASER_COLOR
    const mineralColor = parseInt(colorHex.replace('#', ''), 16)
    const art = this.opts.debrisArt
    const variant = art && art.intact.length > 0 ? Math.floor(Math.random() * art.intact.length) : 0
    const go = new GameObject(`debris-${this.debrisCounter++}`, 'Debris', { position: { x, y } })
    let renderer: ShapeRenderer | null = null
    let sprite: Sprite | null = null
    if (art && art.intact[variant]) {
      const useSheet = variant === 0 && art.fallFrames.length > 0
      const tex = useSheet ? art.fallFrames[0] : art.intact[variant].texture
      sprite = new Sprite(tex)
      if (useSheet) sprite.anchor.set(art.fallAnchor.x, art.fallAnchor.y)
      else sprite.anchor.set(art.intact[variant].ax, art.intact[variant].ay)
      sprite.x = x
      sprite.y = y
      this.opts.container.addChild(sprite)
    } else {
      renderer = new ShapeRenderer(
        {
          shape: this.opts.mineralShapes?.[mineral] ?? 'diamond',
          width: 22,
          height: 22,
          color: ORE_FILL,
          strokeColor: ORE_STROKE,
          strokeWidth: 1.5,
        },
        this.opts.container,
      )
      go.addComponent(renderer)
      go.start()
      renderer.setTint(mineralColor)
    }
    this.gameObject.addChild(go)
    this.ores.push({
      go, renderer, sprite, label: art ? null : this.createLabel(mineral, x, y, 11), mineral,
      hp: 1, maxHp: 1, radius: art ? DEBRIS_RADIUS : 11, flashTimer: 0, mineralColor,
      fallSpeed: DEBRIS_BASE_FALL_SPEED * Math.max(0.2, speedFactor),
      phase: 'fall', animTime: 0, variant,
    })
  }

  private spawnStreak(speedFactor: number): void {
    const art = this.opts.debrisArt
    const speed = 280 * Math.max(0.3, speedFactor)
    const life = 0.7 + Math.random() * 0.4
    const x = -30 + Math.random() * (this.opts.worldWidth * 0.45)
    const y = 8 + Math.random() * ((this.opts.surfaceY ?? SURFACE_Y) * 0.28)
    if (art && art.streaks.length > 0) {
      const piece = art.streaks[Math.floor(Math.random() * art.streaks.length)]
      const sprite = new Sprite(piece.texture)
      sprite.anchor.set(piece.ax, piece.ay)
      sprite.blendMode = art.streakBlend
      sprite.x = x
      sprite.y = y
      this.opts.container.addChild(sprite)
      this.streaks.push({ g: null, sprite, vx: speed, vy: speed * 0.42, life, maxLife: life })
      return
    }
    const g = new Graphics()
    g.moveTo(0, 0).lineTo(22, 9).stroke({ color: 0xffffff, alpha: 0.85, width: 2 })
    g.x = x
    g.y = y
    this.opts.container.addChild(g)
    this.streaks.push({ g, sprite: null, vx: speed, vy: speed * 0.42, life, maxLife: life })
  }

  private updateStreaks(dt: number): void {
    this.streaks = this.streaks.filter(s => {
      s.life -= dt
      const node = s.sprite ?? s.g
      if (!node || s.life <= 0) {
        if (node) {
          this.opts.container.removeChild(node)
          node.destroy()
        }
        return false
      }
      node.x += s.vx * dt
      node.y += s.vy * dt
      node.alpha = s.life / s.maxLife
      const onScreen = node.x < this.opts.worldWidth + 80 && node.y < (this.opts.surfaceY ?? SURFACE_Y) + 24
      if (onScreen) return true
      this.opts.container.removeChild(node)
      node.destroy()
      return false
    })
  }

  /** Intact → mined swap, plus the impact clip and dust puff. */
  private playDebrisMine(ore: OreEntity): void {
    const art = this.opts.debrisArt
    if (!art) return
    const mined = art.mined[ore.variant] ?? art.mined[0]
    if (mined) {
      const sprite = new Sprite(mined.texture)
      sprite.anchor.set(mined.ax, mined.ay)
      sprite.x = ore.go.transform.position.x
      sprite.y = ore.go.transform.position.y
      this.opts.container.addChild(sprite)
      this.liveFx.push({ sprite, life: 0.45, maxLife: 0.45, frames: null, fps: 1, grow: false })
    }
    if (art.impactFrames.length > 0) {
      const sprite = new Sprite(art.impactFrames[0])
      sprite.anchor.set(art.impactAnchor.x, art.impactAnchor.y)
      sprite.blendMode = art.streakBlend
      sprite.x = ore.go.transform.position.x
      sprite.y = ore.go.transform.position.y
      this.opts.container.addChild(sprite)
      this.liveFx.push({
        sprite, life: art.impactFrames.length / art.impactFps, maxLife: art.impactFrames.length / art.impactFps,
        frames: art.impactFrames, fps: art.impactFps, grow: false,
      })
    }
    if (art.dust) {
      const sprite = new Sprite(art.dust)
      sprite.anchor.set(0.5)
      sprite.blendMode = art.streakBlend
      sprite.x = ore.go.transform.position.x
      sprite.y = ore.go.transform.position.y
      this.opts.container.addChild(sprite)
      this.liveFx.push({ sprite, life: 0.4, maxLife: 0.4, frames: null, fps: 1, grow: true })
    }
  }

  private updateLiveFx(dt: number): void {
    this.liveFx = this.liveFx.filter(fx => {
      fx.life -= dt
      if (fx.life <= 0) {
        this.opts.container.removeChild(fx.sprite)
        fx.sprite.destroy()
        return false
      }
      const t = 1 - fx.life / fx.maxLife
      if (fx.frames && fx.frames.length > 0) {
        const i = Math.min(fx.frames.length - 1, Math.floor(t * fx.frames.length))
        fx.sprite.texture = fx.frames[i]
      }
      fx.sprite.alpha = fx.life / fx.maxLife
      if (fx.grow) fx.sprite.scale.set(0.7 + t * 0.6)
      return true
    })
  }

  getScrollX(): number {
    return this.totalScrollX
  }

  /**
   * Which mineral the next ore node is. The requested minerals are seeded first,
   * then make up about half of the field so a normal player finds them within a
   * few shots (SSL-512: 15 shots never hit the requested Nickel). Only minerals
   * the equipped laser can reach count, since an unreachable node is no ore.
   */
  private pickMineral(): string {
    if (this.requiredMineralQueue.length > 0) return this.requiredMineralQueue.shift()!
    const maxTier = this.opts.maxLaserTier ?? 3
    const reachable = (this.opts.requiredMinerals ?? []).filter(m => (this.opts.mineralLaserAccess?.[m] ?? 1) <= maxTier)
    if (reachable.length > 0 && Math.random() < REQUIRED_ORE_SHARE) {
      return reachable[Math.floor(Math.random() * reachable.length)]
    }
    return this.opts.minerals[this.oreCounter % this.opts.minerals.length]
  }

  private spawnOre(x: number): void {
    const mineral = this.pickMineral()
    const tier = this.opts.mineralLaserAccess?.[mineral] ?? 1
    const cfg = ORE_TIER[tier] ?? ORE_TIER[1]
    const radius = cfg.radius
    const maxHp = cfg.maxHp
    const depth = cfg.depthMin + Math.random() * (cfg.depthMax - cfg.depthMin)
    const y = (this.opts.surfaceY ?? SURFACE_Y) + depth

    const colorHex = this.opts.mineralColors[mineral] ?? ORE_FILL
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
      // Generic ore art is reused for minerals without bespoke PNGs; tint it
      // from the catalog so the shared crystal still reads as the right
      // mineral beside its chemistry symbol (KES-175).
      sprite.tint = mineralColor
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
          color: ORE_FILL,
          strokeColor: ORE_STROKE,
          strokeWidth: tier > 1 ? 2 + tier : 1.5,
        },
        this.opts.container
      )
      go.addComponent(renderer)
      go.start()
      renderer.setTint(mineralColor)
    }

    const label = this.createLabel(mineral, x, y, radius)

    this.gameObject.addChild(go)
    this.ores.push({ go, renderer, sprite, label, mineral, hp: maxHp, maxHp, radius, flashTimer: 0, mineralColor, animTime: 0, variant: 0 })
  }

  /** Ore sym label, sized to fit inside the node — longer syms (`H2O`) shrink. */
  private createLabel(mineral: string, x: number, y: number, radius: number): Text | null {
    const sym = this.opts.mineralSyms?.[mineral]
    if (!sym) return null

    const fontSize = Math.max(7, Math.round(radius * (sym.length >= 3 ? 0.66 : 0.95)))
    const label = new Text({
      text: sym,
      style: {
        fontFamily: 'monospace',
        fontSize,
        fontWeight: 'bold',
        fill: ORE_LABEL_FILL,
        stroke: { color: ORE_LABEL_HALO, width: 2, join: 'round' },
      },
    })
    label.anchor.set(0.5)
    label.x = x
    label.y = y
    this.opts.container.addChild(label)
    return label
  }

  private resolveCollisions(): void {
    for (const laser of this.lasers) {
      const lx = laser.go.transform.position.x
      const ly = laser.go.transform.position.y

      for (const ore of this.ores) {
        const ox = ore.go.transform.position.x
        const oy = ore.go.transform.position.y

        // Debris is scenery until it has landed. The shot keeps going.
        if (ore.phase && ore.phase !== 'intact') continue

        // Swept Y check: did the laser travel THROUGH the ore's Y band this frame?
        const minTravelY = Math.min(laser.prevY, ly)
        const maxTravelY = Math.max(laser.prevY, ly)
        const hitY = ore.phase ? oy - ore.radius * 0.35 : oy
        if (maxTravelY < hitY - ore.radius || minTravelY > hitY + ore.radius) continue
        if (Math.abs(lx - ox) >= HIT_TOLERANCE) continue

        ore.hp -= 1
        laser.go.active = false
        this.opts.onHit?.()
        this.freeze(ore.hp <= 0 ? 'collect' : 'hit')

        if (ore.hp <= 0) {
          ore.go.active = false
          if (ore.phase) this.playDebrisMine(ore)
          if (ore.sprite) ore.sprite.visible = false
          if (ore.label) ore.label.visible = false
          if (!ore.phase || !this.opts.debrisArt) this.spawnParticleBurst(ore.go.transform.position.x, ore.go.transform.position.y, ore.mineralColor, ore.radius)
          this.spawnPickup(ore.go.transform.position.x, ore.go.transform.position.y, ore.mineralColor)
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
      if (ore.label) {
        this.opts.container.removeChild(ore.label)
        ore.label.destroy()
      }
      return false
    })

    const tier = this.opts.maxLaserTier ?? 3
    const laserDepth = LASER_DEPTH_BY_TIER[tier] ?? LASER_DEPTH_BY_TIER[3]
    const laserFloor = (this.opts.surfaceY ?? SURFACE_Y) + laserDepth
    this.lasers = this.lasers.filter(laser => {
      if (laser.go.active && laser.go.transform.position.y < laserFloor) return true
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

  private freeze(kind: HitKind): void {
    this.hitStop = Math.max(this.hitStop, hitStopSeconds(kind, !!this.opts.reducedMotion))
  }

  /** A chunky chip pops off a mined ore and flies to the ship's hold. */
  private spawnPickup(x: number, y: number, color: number): void {
    const g = new Graphics()
    g.rect(-4, -4, 8, 8).fill({ color, alpha: 1 })
    g.rect(-4, -4, 8, 8).stroke({ color: 0x0f2436, alpha: 0.55, width: 1.5 })
    g.x = x
    g.y = y
    this.opts.container.addChild(g)
    this.pickups.push({ g, from: { x, y }, t: 0 })
  }

  private updatePickups(dt: number): void {
    const home = { x: SHIP_X, y: this.opts.shipY ?? SHIP_Y }
    this.pickups = this.pickups.filter(p => {
      p.t += dt / 0.55
      if (p.t >= 1) {
        this.opts.container.removeChild(p.g)
        p.g.destroy()
        return false
      }
      const pos = pickupPosition(p.from, home, p.t)
      p.g.x = pos.x
      p.g.y = pos.y
      p.g.alpha = p.t > 0.8 ? (1 - p.t) / 0.2 : 1
      return true
    })
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
