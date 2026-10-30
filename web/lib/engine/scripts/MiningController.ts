import { depositTag } from '@/lib/mining/laserLayers'
import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js'
import { ScriptBehaviour } from '../components/ScriptBehaviour'
import { ShapeRenderer } from '../components/ShapeRenderer'
import type { ShapeKind } from '../components/ShapeRenderer'
import { GameObject } from '../GameObject'
import type { RuntimeContext } from '../RuntimeContext'
import type { EntityBounds } from '../InputManager'
import { devMiningSpeedMultiplier } from '@/lib/devMiningSpeed'
import { oreFleck, oreFleckStyle } from '@/lib/mining/oreFlecks'
import { hitStopSeconds, pickupPosition, stepHitStop, type HitKind } from '../miningJuice'
import type { DebrisArtSet } from '../debrisArt'
import { fallFrameIndex, landFrameIndex } from '@/lib/orionids/theme'

export const SCROLL_SPEED = 36
export const SCROLL_SPEED_MIN = 16
export const SCROLL_SPEED_MAX = 96
const LASER_SPEED = 480
export const SHIP_X = 80
export const SHIP_Y = 112
export const SURFACE_Y = 320
// Wider than ship X so ore movement during laser flight doesn't cause misses on tall screens
const HIT_TOLERANCE = 56
/** Time a player takes to press FIRE after it lights up (SSL-710). */
const REACTION_SECONDS = 0.2
// Share of ore nodes that are the requested mineral(s) once the seeded ones are out.
const REQUIRED_ORE_SHARE = 0.85
// First nodes are copies of the requested ore, close and shallow, so a few shots hit it.
const REQUIRED_ORE_COPIES = 6
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

/** Buried cutaway shapes. y grows downward into the soil. Every part starts below the surface line. */
type OreBlob = { x: number; y: number; w: number; h: number }
const NODULE_BLOBS: OreBlob[][] = [
  [
    { x: -28, y: 14, w: 22, h: 18 },
    { x: -4, y: 18, w: 26, h: 22 },
    { x: 18, y: 26, w: 16, h: 16 },
    { x: -14, y: 40, w: 40, h: 14 },
  ],
  [
    { x: -22, y: 16, w: 20, h: 16 },
    { x: 0, y: 22, w: 22, h: 20 },
    { x: -12, y: 42, w: 34, h: 12 },
  ],
  [
    { x: -24, y: 12, w: 18, h: 16 },
    { x: -6, y: 20, w: 16, h: 26 },
    { x: 12, y: 28, w: 18, h: 18 },
  ],
]
const SEAM_BLOBS: OreBlob[][] = [
  [
    { x: -46, y: 16, w: 92, h: 14 },
    { x: -30, y: 32, w: 68, h: 12 },
    { x: -16, y: 46, w: 38, h: 8 },
  ],
  [
    { x: -40, y: 20, w: 80, h: 12 },
    { x: -22, y: 34, w: 50, h: 10 },
  ],
  [
    { x: -34, y: 14, w: 28, h: 10 },
    { x: -4, y: 18, w: 54, h: 14 },
    { x: 8, y: 34, w: 34, h: 10 },
  ],
]
const CRYSTAL_BLOBS: OreBlob[][] = [
  [
    { x: -14, y: 12, w: 12, h: 28 },
    { x: 2, y: 16, w: 12, h: 26 },
    { x: -8, y: 36, w: 20, h: 16 },
  ],
  [
    { x: -18, y: 14, w: 12, h: 26 },
    { x: -4, y: 18, w: 14, h: 32 },
    { x: 12, y: 22, w: 10, h: 22 },
  ],
  [
    { x: -10, y: 14, w: 18, h: 16 },
    { x: -6, y: 28, w: 12, h: 24 },
    { x: 8, y: 22, w: 12, h: 20 },
  ],
]
/** Symbol disc sits on the buried mass, fully under the crust. */
const LABEL_DEPTH = 36

function mixHex(a: number, b: number, t: number): number {
  const ch = (shift: number) => {
    const av = (a >> shift) & 255
    const bv = (b >> shift) & 255
    return Math.round(av + (bv - av) * t)
  }
  return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

function blobFamily(mineral: string): OreBlob[][] {
  const style = oreFleckStyle(mineral)
  if (style === 'seam') return SEAM_BLOBS
  if (style === 'crystal') return CRYSTAL_BLOBS
  return NODULE_BLOBS
}

function mineralSalt(mineral: string): number {
  let hash = 0
  for (let i = 0; i < mineral.length; i++) hash = (hash * 33 + mineral.charCodeAt(i)) >>> 0
  return hash
}

function blobParts(mineral: string, salt: number): OreBlob[] {
  const family = blobFamily(mineral)
  return family[(mineralSalt(mineral) + salt) % family.length]
}

/** Per-laser-tier ore properties: radius, hp, depth range within rock surface */
const ORE_TIER: Record<number, { radius: number; maxHp: number; depthMin: number; depthMax: number }> = {
  1: { radius: 10, maxHp: 1, depthMin: 8,  depthMax: 30 },
  2: { radius: 13, maxHp: 1, depthMin: 32, depthMax: 60 },
  3: { radius: 17, maxHp: 1, depthMin: 62, depthMax: 96 },
}
/** Native placeChips offset in source pixels: crust 8 + gap 4 + deposit 14. */
const PIXEL_BURIAL_SRC = 26

export interface MiningControllerOptions {
  container: Container
  worldWidth: number
  worldHeight: number
  /** Overrides SURFACE_Y when the world is sized dynamically from the viewport. */
  surfaceY?: number
  /** Overrides SHIP_Y when the world is sized dynamically from the viewport. */
  shipY?: number
  /** Live horizontal ship position. The d-pad steers the ship; the field still scrolls independently. */
  shipX?: () => number
  minerals: string[]
  /** Drawn first, in order, each one deposit-gap apart. `?ores=mixed` uses
   * this so iron, carbon and ice each get their own stretch of soil. */
  leadMinerals?: string[]
  /** Preview offset in screen-widths. Shifts the field by that many viewports. */
  scrollScreens?: number
  /** When set (the `?scroll=` preview), the field stays put until the player scrolls. */
  pinScroll?: boolean
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
  /** Display names, for the deposit labels (`Platinum · 1u`). */
  mineralNames?: Record<string, string>
  /** Beam tint for the projectile. Defaults to the original cyan. */
  beamColor?: string
  /** Surface rock-chip colours. Omit to keep the buried marker as the only ore graphic. */
  chipFill?: number
  chipShade?: number
  /** Shared pixel deposit frames. Drawn at pixelScale, unstretched and untinted. */
  depositFrames?: Texture[]
  /** Deposits v2 art per mineral; wins over `depositFrames` when present (SSL-536). */
  depositArtFor?: (mineral: string) => Texture | undefined
  pixelScale?: number
  /** The scene beam sprite is the shot. Hide the collision bolt graphic. */
  pixelBeam?: boolean
  /** Symbol ink. Light ground uses a dark ink. */
  labelInk?: number
  onCollect: (mineral: string) => void
  /** Called when a laser exits the world without hitting any ore (miss). */
  onMiss?: () => void
  /** Called the instant a laser collides with ore. Fires on every hit, whether or not it destroys the ore. */
  onHit?: () => void
  /** Called every update with the total horizontal scroll distance so callers can sync visual layers. */
  onScroll?: (scrollX: number) => void
  /** Called when any ore enters or leaves the "fire now" window around SHIP_X. */
  onOreNearby?: (near: boolean) => void
  /** Live target mineral and alignment state for the mining HUD. */
  onTargetCue?: (mineral: string | null, inRange: boolean) => void
  /**
   * Live-updating set of mineral keys still needed to fill the order. When
   * set, the "fire now" window only lights up for ore whose mineral is still
   * needed — an ore of an already-satisfied or off-order mineral never flashes.
   * Omit (or leave `current` null) to flash for any ore, regardless of mineral.
   */
  neededMineralsRef?: { current: Set<string> | null }
  /** Live ship height including the d-pad climb; the collector beam follows it. Falls back to shipY. */
  shipYNow?: () => number
  /** SSL-711: true while a catchable fragment is inside the collector beam, so CATCH can light up. */
  onCatchCue?: (ready: boolean) => void
  /** Skip hit-stop freezes when the player prefers reduced motion. */
  reducedMotion?: boolean
  /**
   * Sky-event debris (SSL-475). Absent, or `getSpawn()` returning null / rate 0,
   * means no debris and no streaks: the scene is the unchanged ore field.
   */
  debris?: {
    /** Live spawn config; null (or rate 0) when the event is not active. */
    getSpawn: () => { mineral: string; ratePerMinute: number; speedFactor: number; onceMineral?: string; onceHero?: boolean; catchable?: boolean } | null
  }
  /** Raster shower art. Omit to keep the vector chunk fallback. */
  debrisArt?: DebrisArtSet | null
}

/** Falling debris chunk: descends while scrolling, mineable only after it lands. */
const DEBRIS_RADIUS = 36
const DEBRIS_BASE_FALL_SPEED = 70
/** Cap so a long run cannot fill the field with chunks. */
const MAX_DEBRIS = 4
/** A few fragments in the sky at once, so a run of about a minute reaches the goal without a crowded sky. */
const MAX_RAIN = 3
/** SSL-711: the collector beam above the ship. A fragment inside it is caught by a CATCH press. */
const CATCH_HALF_W = 36
const CATCH_BEAM_H = 150
/**
 * A catchable fragment is on screen at least this long before it reaches the ship, so a touch
 * player can see it, steer under it and press. On a short landscape phone the ship sits near the
 * top, so fragments fall slower there instead of arriving with no warning.
 */
const CATCH_MIN_SECONDS_TO_SHIP = 3.2
/** A press this early still catches a fragment that enters the beam (input buffering, like FIRE). */
const CATCH_BUFFER_SECONDS = 0.25
/** Rain spreads this far either side of where the ship is, so staying put catches a minority and the player has to weave.
 * Kept within what the ship can steer (100 px/s) in the 3.2 s a fragment takes to reach it. */
const RAIN_SPREAD = 270
const MAX_STREAKS = 1
/** Decorative only: a sparse reminder of the shower, never visual noise. */
const STREAKS_PER_SECOND = 0.08
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
  labelBaseY: number
  /** Surface rock drawn on the ground line. Collision stays at the buried node. */
  chip: Graphics | null
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
  frames?: Texture[] | null
  /** A one-off fireball. It falls on the ship and does not scroll away. */
  hero?: boolean
  /** SSL-711: shower fragment, caught in the air with CATCH; breaks up if it reaches the ground. */
  catchable?: boolean
  /** SSL-710: dark backing and mineral-coloured rim that lifts a seam off the soil. */
  halo?: Graphics | null
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
  /** SSL-711: upward collector beam drawn while catchable fragments fall. */
  private catchBeam: Graphics | null = null
  private catchBeamFlash = 0
  private catchBuffered = 0
  private catchCueState = false
  /** SSL-710: dashed line from the ship to the soil showing where a shot lands. */
  private aimLine: Graphics | null = null
  private aimTarget: OreEntity | null = null
  private streakAccumulator = 0
  /** First active frame drops a chunk immediately so the shower is visible. */
  private debrisPrimed = false
  /** One rare fragment per mining session. The caller decides whether it is due. */
  private onceDebrisSpawned = false
  private debrisCounter = 0
  private hitStop = 0
  private oreCounter = 0
  private requiredMineralQueue: string[] = []
  private laserCounter = 0
  private totalScrollX = 0
  private scrollSpeed = SCROLL_SPEED
  private oreNearState = false
  private targetCueState = ''
  /** Local-dev QA multiplier (1 everywhere else), see lib/devMiningSpeed.ts. */
  private readonly devSpeed = devMiningSpeedMultiplier()

  constructor(context: RuntimeContext, opts: MiningControllerOptions) {
    super(context)
    this.opts = opts
  }

  private currentShipX(): number {
    return Math.max(40, Math.min(this.opts.worldWidth - 40, this.opts.shipX?.() ?? SHIP_X))
  }

  /** True while `?scroll=` is holding the field still for a spacing check. */
  private pinScroll = false

  /** Override the terrain scroll speed (px/s). Clamped to SCROLL_SPEED_MIN..SCROLL_SPEED_MAX.
   * A player scroll releases the preview pin. */
  setScrollSpeed(speed: number): void {
    this.pinScroll = false
    this.scrollSpeed = Math.max(SCROLL_SPEED_MIN, Math.min(SCROLL_SPEED_MAX, speed))
  }

  start(): void {
    const required = this.opts.requiredMinerals ?? []
    const lead = (this.opts.leadMinerals ?? []).filter(mineral => mineral.length > 0)
    this.requiredMineralQueue = [
      ...lead,
      ...required.flatMap(mineral => Array.from({ length: REQUIRED_ORE_COPIES }, () => mineral)),
    ]
    const gap = this.depositGap()
    const screens = Math.max(0, this.opts.scrollScreens ?? 0)
    const skip = Math.round(screens * this.opts.worldWidth)
    this.pinScroll = this.opts.pinScroll === true
    this.totalScrollX = skip
    this.opts.onScroll?.(skip)
    let x = this.depositAnchor() - skip
    let count = 0
    while (count < 20) {
      this.spawnOre(x)
      count++
      x += gap
    }
  }

  /** Where the first deposit sits when `?scroll=0`, clear of the beam. */
  private depositAnchor(): number {
    return this.currentShipX() + 160
  }

  /** Native stride. A phone-width pass shows one or two deposits. */
  private depositGap(): number {
    // Sparse during the shower run so labelled ore does not crowd the falling fragments.
    return this.opts.debris?.getSpawn()?.catchable ? 640 : 280
  }

  update(realDt: number): void {
    const stepped = stepHitStop(this.hitStop, realDt)
    this.hitStop = stepped.remaining
    const dt = stepped.simDt
    if (this.hitStop > 0) return // frozen: the whole scene holds for the impact
    const dx = (this.pinScroll ? 0 : this.scrollSpeed) * this.devSpeed * dt
    this.totalScrollX += dx

    const visibleChipLabels: Array<{ ore: OreEntity; center: number; halfWidth: number }> = []
    for (const ore of this.ores) {
      if (!ore.hero) ore.go.transform.position.x -= dx
      if (ore.frames && ore.frames.length > 1 && ore.sprite) {
        ore.animTime += dt
        const frame = ore.frames[Math.floor(ore.animTime / 0.6) % ore.frames.length]
        if (ore.sprite.texture !== frame) ore.sprite.texture = frame
      }
      // SSL-344: draw on whole pixels. Fractional x on pixelated art shimmers between frames and reads as the deposit jittering. Hit tests keep the exact position.
      if (ore.sprite) ore.sprite.x = Math.round(ore.go.transform.position.x)
      if (ore.chip) ore.chip.x = Math.round(ore.go.transform.position.x)
      if (ore.halo) ore.halo.x = Math.round(ore.go.transform.position.x)
      if (ore.label) {
        const halfLabel = ore.label.width * (ore.chip ? 0.58 : 0.5)
        const oreX = ore.go.transform.position.x
        if ((ore.chip || !(ore.label instanceof Text)) && (oreX < -halfLabel || oreX > this.opts.worldWidth + halfLabel)) {
          ore.label.visible = false
        } else {
          ore.label.visible = true
          const minLabelX = halfLabel + 20
          const maxLabelX = Math.max(minLabelX, this.opts.worldWidth - halfLabel - 20)
          ore.label.x = Math.min(maxLabelX, Math.max(minLabelX, oreX))
          if (!ore.chip || (ore.phase !== 'fall' && ore.phase !== 'land')) {
            visibleChipLabels.push({ ore, center: ore.label.x, halfWidth: halfLabel })
          }
        }
      }

      if (ore.flashTimer > 0) {
        ore.flashTimer = Math.max(0, ore.flashTimer - dt)
        if (ore.flashTimer <= 0) {
          this.applyTint(ore, this.damagedTint(ore))
        }
      }
    }

    visibleChipLabels.sort((a, b) => a.center - b.center)
    const laneEnds: number[] = []
    for (const label of visibleChipLabels) {
      let lane = 0
      while (lane < laneEnds.length && label.center - label.halfWidth < laneEnds[lane] + 8) lane++
      if (lane === laneEnds.length) laneEnds.push(Number.NEGATIVE_INFINITY)
      laneEnds[lane] = label.center + label.halfWidth
      // Chip labels sit far apart; deposit name pills only need to clear each other.
      const step = label.ore.chip ? Math.max(160, label.ore.label!.height + 24) : label.ore.label!.height + 4
      label.ore.label!.y = label.ore.labelBaseY - lane * step
    }

    this.updateDebris(dt)
    this.updateLiveFx(dt)

    const seamOres = this.ores.filter(o => o.fallSpeed === undefined)
    const last = seamOres[seamOres.length - 1]
    const needsSpawn = !last || last.go.transform.position.x < this.opts.worldWidth + 120
    if (needsSpawn && this.ores.length < MAX_ORES + 8) {
      const lastX = last ? last.go.transform.position.x : 0
      this.spawnOre(lastX + this.depositGap())
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
    const heroes = this.ores.filter(o => o.go.active && o.hero)
    // SSL-710: a seam deeper than the laser reaches is never a target, so FIRE only lights up for a shot that can hit.
    const reach = this.laserFloor()
    const seamTargets = this.ores.filter(o => o.go.active && o.fallSpeed === undefined && o.go.transform.position.y - o.radius <= reach && (!needed || needed.size === 0 || needed.has(o.mineral)))
    const targetOres = heroes.length > 0 ? heroes : seamTargets
    const target = targetOres.reduce<OreEntity | null>((best, ore) => {
      if (!best) return ore
      return Math.abs(ore.go.transform.position.x - this.currentShipX()) < Math.abs(best.go.transform.position.x - this.currentShipX()) ? ore : best
    }, null)
    const targetDistance = target ? Math.abs(target.go.transform.position.x - this.currentShipX()) : Number.POSITIVE_INFINITY
    const landed = !target?.phase || target.phase === 'intact'
    // SSL-710: judge range where the seam will be when a shot fired now (plus a moment to react)
    // reaches it. The ground keeps scrolling while the beam falls, so a seam that is under the ship
    // only as it slides past is already gone by impact.
    const impactLead = target && !target.phase
      ? this.scrollSpeed * this.devSpeed * (Math.max(0, target.go.transform.position.y - ((this.opts.shipY ?? SHIP_Y) + 16)) / LASER_SPEED + REACTION_SECONDS)
      : 0
    const impactDistance = target ? Math.abs(target.go.transform.position.x - impactLead - this.currentShipX()) : Number.POSITIVE_INFINITY
    const inRange = landed && targetDistance < HIT_TOLERANCE && impactDistance < HIT_TOLERANCE - 8
    const targetState = target ? `${target.mineral}:${inRange}` : ''
    if (targetState !== this.targetCueState) {
      this.targetCueState = targetState
      this.opts.onTargetCue?.(target?.mineral ?? null, inRange)
    }
    this.updateAim(target, inRange)
    const anyNear = inRange
    if (anyNear !== this.oreNearState) {
      this.oreNearState = anyNear
      this.opts.onOreNearby?.(anyNear)
    }
  }

  /** Deepest y the current laser reaches; a seam below it cannot be hit. */
  private laserFloor(): number {
    const tier = this.opts.maxLaserTier ?? 3
    const laserDepth = this.opts.pixelScale ? this.pixelLaserReach(tier) : (LASER_DEPTH_BY_TIER[tier] ?? LASER_DEPTH_BY_TIER[3])
    return (this.opts.surfaceY ?? SURFACE_Y) + laserDepth
  }

  /** SSL-710: show where the shot lands, and make an in-range seam unmistakable. */
  private updateAim(target: OreEntity | null, inRange: boolean): void {
    if (!this.aimLine) {
      this.aimLine = new Graphics()
      this.opts.container.addChild(this.aimLine)
    }
    const g = this.aimLine
    const x = Math.round(this.currentShipX())
    const top = (this.opts.shipY ?? SHIP_Y) + 26
    // The line stops where the beam stops: at the targeted seam, or at the laser's reach.
    const bottom = inRange && target && !target.phase ? target.go.transform.position.y : this.laserFloor()
    g.clear()
    if (inRange) {
      g.rect(x - 2, top, 4, Math.max(0, bottom - top)).fill({ color: 0xbfefff, alpha: 0.85 })
    } else {
      for (let y = top; y < bottom; y += 14) g.rect(x - 1, y, 2, Math.min(7, bottom - y)).fill({ color: 0xbfefff, alpha: 0.45 })
    }
    const next = inRange ? target : null
    if (this.aimTarget && this.aimTarget !== next && this.aimTarget.halo) {
      this.aimTarget.halo.scale.set(1)
      this.aimTarget.halo.alpha = 1
    }
    this.aimTarget = next
    if (next?.halo) {
      const pulse = this.opts.reducedMotion ? 1 : 1 + 0.12 * (0.5 + 0.5 * Math.sin(performance.now() / 110))
      next.halo.scale.set(pulse)
      next.halo.alpha = 1
    }
  }

  fireLaser(): void {
    const go = new GameObject(`laser-${this.laserCounter++}`, 'Laser', {
      position: { x: this.currentShipX(), y: (this.opts.shipY ?? SHIP_Y) + 16 },
    })
    const bolt = new ShapeRenderer(
      { shape: 'rect', width: LASER_SIZE.width, height: LASER_SIZE.height, color: this.opts.beamColor ?? LASER_COLOR },
      this.opts.container
    )
    go.addComponent(bolt)
    this.gameObject.addChild(go)
    go.start()
    if (this.opts.pixelBeam) bolt.setShown(false)
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
    this.updateCatchBeam(dt, !!spawn?.catchable && (spawn.ratePerMinute ?? 0) > 0)
    const oncePending = !!spawn?.onceMineral && !this.onceDebrisSpawned
    if (!spawn || !(spawn.ratePerMinute > 0 || oncePending)) { this.debrisAccumulator = 0; this.debrisPrimed = false; return }
    if (!this.debrisPrimed) {
      this.debrisPrimed = true
      this.debrisAccumulator = Math.max(this.debrisAccumulator, 1)
      this.streakAccumulator = Math.max(this.streakAccumulator, 1)
    }
    if (spawn.onceMineral && !this.onceDebrisSpawned) {
      this.onceDebrisSpawned = true
      this.spawnDebris(spawn.onceMineral, spawn.speedFactor, !!spawn.onceHero)
    }
    const rate = spawn.ratePerMinute
    this.debrisAccumulator += (rate / 60) * dt
    this.streakAccumulator += STREAKS_PER_SECOND * dt
    let alive = this.ores.filter(o => o.phase !== undefined).length
    const cap = spawn.catchable ? MAX_RAIN : MAX_DEBRIS
    while (this.debrisAccumulator >= 1) {
      this.debrisAccumulator -= 1
      if (alive >= cap) continue
      this.spawnDebris(spawn.mineral, spawn.speedFactor, false, !!spawn.catchable)
      alive += 1
    }
    while (this.streakAccumulator >= 1) {
      this.streakAccumulator -= 1
      if (this.streaks.length < MAX_STREAKS) this.spawnStreak(spawn.speedFactor)
    }
  }

  private currentShipY(): number {
    return this.opts.shipYNow?.() ?? this.opts.shipY ?? SHIP_Y
  }

  /** The fragment a CATCH press would take now: falling, catchable and inside the beam. */
  private fragmentInBeam(): OreEntity | null {
    const x = this.currentShipX()
    const shipY = this.currentShipY()
    // Only the part of the beam on screen counts, so a press never takes a fragment the player cannot see.
    const top = Math.max(4, shipY - CATCH_BEAM_H)
    let best: OreEntity | null = null
    let bestY = -Infinity
    for (const ore of this.ores) {
      if (!ore.go.active || !ore.catchable || ore.phase !== 'fall') continue
      const p = ore.go.transform.position
      // Judge where the fragment is drawn, not its anchor point.
      const y = ore.sprite ? ore.sprite.y + (0.5 - ore.sprite.anchor.y) * ore.sprite.height : p.y
      if (Math.abs(p.x - x) > CATCH_HALF_W + 8 || y < top || y > shipY + 12) continue
      if (y > bestY) { best = ore; bestY = y }
    }
    return best
  }

  /** SSL-711: a short beam rising from the ship. Brightens while a fragment is inside it. */
  private updateCatchBeam(dt: number, show: boolean): void {
    if (!show) {
      if (this.catchBeam) this.catchBeam.visible = false
      if (this.catchCueState) { this.catchCueState = false; this.opts.onCatchCue?.(false) }
      return
    }
    if (!this.catchBeam) {
      this.catchBeam = new Graphics()
      this.opts.container.addChild(this.catchBeam)
    }
    this.catchBuffered = Math.max(0, this.catchBuffered - dt)
    if (this.catchBuffered > 0) {
      const ore = this.fragmentInBeam()
      if (ore) { this.catchBuffered = 0; this.catchBeamFlash = 0.3; this.collectOre(ore) }
    }
    const inBeam = !!this.fragmentInBeam()
    if (inBeam !== this.catchCueState) { this.catchCueState = inBeam; this.opts.onCatchCue?.(inBeam) }
    this.catchBeamFlash = Math.max(0, this.catchBeamFlash - dt)
    const g = this.catchBeam
    const x = Math.round(this.currentShipX())
    const bottom = Math.round(this.currentShipY()) - 4
    const top = bottom - CATCH_BEAM_H
    const flash = this.catchBeamFlash > 0
    const fill = flash ? 0.42 : inBeam ? 0.3 : 0.12
    g.clear()
    // Tapered column: wide at the top where fragments enter, narrow at the hull.
    g.poly([x - CATCH_HALF_W, top, x + CATCH_HALF_W, top, x + 10, bottom, x - 10, bottom]).fill({ color: 0x7fd8ff, alpha: fill })
    const edge = flash || inBeam ? 0.95 : 0.5
    g.rect(x - CATCH_HALF_W, top, CATCH_HALF_W * 2, 3).fill({ color: 0xbfefff, alpha: edge })
    g.poly([x - CATCH_HALF_W, top, x - CATCH_HALF_W + 3, top, x - 8, bottom, x - 11, bottom]).fill({ color: 0xbfefff, alpha: edge * 0.8 })
    g.poly([x + CATCH_HALF_W - 3, top, x + CATCH_HALF_W, top, x + 11, bottom, x + 8, bottom]).fill({ color: 0xbfefff, alpha: edge * 0.8 })
    g.visible = true
  }

  /**
   * SSL-711: the CATCH button. Takes the lowest fragment inside the collector
   * beam. Returns false when the beam was empty; that press costs nothing.
   */
  catchFragment(): boolean {
    this.catchBeamFlash = 0.14
    const ore = this.fragmentInBeam()
    if (!ore) { this.catchBuffered = CATCH_BUFFER_SECONDS; return false }
    this.catchBuffered = 0
    this.catchBeamFlash = 0.3
    this.collectOre(ore)
    return true
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
        if (ore.phase === 'intact' && ore.catchable) this.breakFragment(ore)
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
        if (ore.catchable) this.breakFragment(ore)
      }
    }
  }

  private placeDebris(ore: OreEntity, y: number): void {
    ore.go.transform.position.y = y
    if (ore.sprite) ore.sprite.y = Math.round(y)
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

  private spawnDebris(mineral: string, speedFactor: number, hero = false, catchable = false): void {
    // Aim where the ship is now, shifted by how far the ground scrolls while the fragment falls.
    const groundY = (this.opts.surfaceY ?? SURFACE_Y) - 4
    const y = hero ? -36 : -20 - Math.random() * 40
    const baseSpeed = DEBRIS_BASE_FALL_SPEED * Math.max(0.2, speedFactor)
    // SSL-711: a catchable fragment never reaches the ship sooner than CATCH_MIN_SECONDS_TO_SHIP, and is aimed at where the ship can meet it.
    const fallSpeed = catchable
      ? Math.min(baseSpeed, Math.max(20, this.currentShipY() - y) / CATCH_MIN_SECONDS_TO_SHIP)
      : baseSpeed * (hero ? 1.35 : 1)
    const fallTime = catchable ? Math.max(0, this.currentShipY() - y) / fallSpeed : (groundY + 40) / baseSpeed
    const rainX = this.currentShipX() + SCROLL_SPEED * fallTime + (Math.random() * 2 - 1) * RAIN_SPREAD
    const x = hero
      ? this.currentShipX()
      : catchable
        // Not clamped to the right edge: on a narrow phone the aim point sits past the screen and the fragment drifts in. Clamping it made every fragment land out of reach.
        ? Math.max(40, rainX)
        : 40 + Math.random() * Math.max(80, this.opts.worldWidth - 80)
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
          width: hero ? 48 : 22,
          height: hero ? 48 : 22,
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
    if (sprite && hero) sprite.scale.set(2.4)
    // Shower rain is drawn small so the sky stays readable.
    if (sprite && catchable) sprite.scale.set(0.45)
    this.gameObject.addChild(go)
    this.ores.push({
      go, renderer, sprite, chip: null, label: art ? null : this.createLabel(mineral, x, y, hero ? 24 : 11), labelBaseY: y, mineral,
      hp: 1, maxHp: 1, radius: hero ? 56 : (art ? DEBRIS_RADIUS : 11), flashTimer: 0, mineralColor,
      fallSpeed,
      phase: 'fall', animTime: 0, variant, hero, catchable,
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
  private pickMineral(): { mineral: string; seeded: boolean } {
    if (this.requiredMineralQueue.length > 0) return { mineral: this.requiredMineralQueue.shift()!, seeded: true }
    const maxTier = this.opts.maxLaserTier ?? 3
    const reachable = (this.opts.requiredMinerals ?? []).filter(m => (this.opts.mineralLaserAccess?.[m] ?? 1) <= maxTier)
    if (reachable.length > 0 && Math.random() < REQUIRED_ORE_SHARE) {
      return { mineral: reachable[Math.floor(Math.random() * reachable.length)], seeded: false }
    }
    return { mineral: this.opts.minerals[this.oreCounter % this.opts.minerals.length], seeded: false }
  }

  /**
   * Pixel deposits follow the native burial (26 source px under the surface)
   * and step up and down so they are not one line under the crust.
   * Higher tiers sit below the previous laser so a stock beam cannot mine them.
   */
  /** Level 1: just under the crust, comfortably inside the starting laser's reach. */
  private levelOneDepth(): number {
    const px = this.opts.pixelScale ?? 1
    return this.clampPixelDepth(Math.min(PIXEL_BURIAL_SRC * px, this.pixelLaserReach(1) - 16 * px - 12), 0, px)
  }

  private pixelDepositDepth(tier: number, salt: number): number {
    const px = this.opts.pixelScale ?? 1
    const wobble = (salt % (tier <= 1 ? 5 : 4)) * 4 * px
    // Native center, then deeper. The shallowest sprite top stays a full crust under the lip.
    const tier1 = PIXEL_BURIAL_SRC * px + wobble
    if (tier <= 1) return this.clampPixelDepth(tier1, 0, px)
    const laser1 = this.pixelLaserReach(1)
    if (tier === 2) return this.clampPixelDepth(laser1 + 14 + wobble, laser1 + 14, px)
    const laser2 = this.pixelLaserReach(2)
    return this.clampPixelDepth(laser2 + 19 + wobble, laser2 + 19, px)
  }

  /** How far a pixel beam travels: just past that tier's deepest varied deposit. */
  private pixelLaserReach(tier: number): number {
    const px = this.opts.pixelScale ?? 1
    const laser1 = PIXEL_BURIAL_SRC * px + 16 * px + 14
    if (tier <= 1) return laser1
    const laser2 = laser1 + 14 + 12 * px + 17
    if (tier === 2) return laser2
    return laser2 + 19 + 12 * px + 21
  }

  /** Keep the sprite inside the soil without pulling a locked tier up into the beam above it. */
  private clampPixelDepth(depth: number, floor: number, px: number): number {
    const surface = this.opts.surfaceY ?? SURFACE_Y
    const room = this.opts.worldHeight - surface - 7 * px
    if (room <= floor) return Math.max(depth, floor)
    return Math.min(Math.max(depth, floor), room)
  }

  private spawnOre(x: number): void {
    const picked = this.pickMineral()
    const mineral = picked.mineral
    const tier = this.opts.mineralLaserAccess?.[mineral] ?? 1
    const cfg = ORE_TIER[tier] ?? ORE_TIER[1]
    const radius = cfg.radius
    const maxHp = cfg.maxHp
    let depth = picked.seeded
      ? 8 + Math.random() * 14
      : cfg.depthMin + Math.random() * (cfg.depthMax - cfg.depthMin)
    // Level 1 mining (starting laser): every deposit sits in the shallow band the laser reaches, never deeper (Liam, 2026-10-29).
    const levelOne = (this.opts.maxLaserTier ?? 3) <= 1
    if (this.opts.pixelScale) depth = levelOne ? this.levelOneDepth() : this.pixelDepositDepth(tier, this.oreCounter + mineralSalt(mineral))
    else if (levelOne) depth = Math.min(depth, ORE_TIER[1].depthMax)
    const y = (this.opts.surfaceY ?? SURFACE_Y) + depth

    const colorHex = this.opts.mineralColors[mineral] ?? ORE_FILL
    const mineralColor = parseInt(colorHex.replace('#', ''), 16)

    const oreIndex = this.oreCounter++
    const go = new GameObject(`ore-${oreIndex}`, 'Ore', { position: { x, y } })

    const frames = this.opts.depositFrames
    const art = this.opts.depositArtFor?.(mineral)
    const texture = art ?? frames?.[0] ?? this.opts.mineralTextures?.[mineral]
    let renderer: ShapeRenderer | null = null
    let sprite: Sprite | null = null

    // SSL-710: the halo is added before the deposit art so it sits behind it.
    const halo = new Graphics()
    this.opts.container.addChild(halo)
    if (texture && frames && this.opts.pixelScale) {
      sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      // Deposits v2 art is authored at 64px; draw it near the old 22px chip footprint.
      if (art) art.source.scaleMode = 'nearest'
      sprite.scale.set(this.opts.pixelScale)
      sprite.tint = 0xffffff
      sprite.x = x
      sprite.y = y
      this.opts.container.addChild(sprite)
    } else if (texture) {
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
      if (this.opts.chipFill != null) sprite.visible = false
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
      if (this.opts.chipFill != null) renderer.setShown(false)
    }

    const surface = this.opts.surfaceY ?? SURFACE_Y
    const parts = blobParts(mineral, oreIndex)
    const chip = this.opts.chipFill != null ? this.createChip(x, surface, mineral, parts) : null
    // Name pills ride in the sky band just above the ground line (never in the soil, where the HUD lives); lanes stack them upward when seams bunch.
    const labelY = chip ? surface - 50 : surface - 24
    const label = this.createLabel(mineral, x, labelY, radius)

    const haloW = Math.max(radius * 2, sprite ? sprite.width : 0) * 0.62 + 6
    const haloH = Math.max(radius * 2, sprite ? sprite.height : 0) * 0.5 + 6
    halo.ellipse(0, 0, haloW, haloH).fill({ color: 0x05080f, alpha: 0.55 })
    halo.ellipse(0, 0, haloW, haloH).stroke({ color: mixHex(mineralColor, 0xffffff, 0.35), width: 2.5, alpha: 0.95 })
    halo.x = Math.round(x)
    halo.y = y

    this.gameObject.addChild(go)
    this.ores.push({ go, renderer, sprite, label, labelBaseY: labelY, chip, mineral, hp: maxHp, maxHp, radius, flashTimer: 0, mineralColor, animTime: 0, variant: 0, frames: art ? null : frames ?? null, halo })
  }

  /** Faceted nodules, seams and crystals inside the soil, with a sym disc on the mass. */
  private createChip(x: number, y: number, mineral: string, parts: OreBlob[]): Graphics {
    const body = oreFleck(mineral)
    const avg = (((body >> 16) & 255) + ((body >> 8) & 255) + (body & 255)) / 3
    const lit = mixHex(body, 0xffffff, avg < 70 ? 0.62 : 0.34)
    const shade = mixHex(body, 0x000000, avg < 70 ? 0.28 : 0.45)
    const g = new Graphics()
    g.scale.set(0.42)
    let glowX = 0
    let glowY = 0
    let glowN = 0
    for (const part of parts) {
      glowX += part.x + part.w / 2
      glowY += part.y + part.h / 2
      glowN += 1
    }
    if (glowN > 0) {
      g.ellipse(glowX / glowN, glowY / glowN, 36, 18).fill({ color: lit, alpha: 0.28 })
    }
    for (const part of parts) this.paintFacet(g, part, body, lit, shade)
    const ink = this.opts.labelInk ?? ORE_LABEL_FILL
    const disc = ink === ORE_LABEL_FILL ? 0x10141c : 0xf6f3ea
    const ring = ink === ORE_LABEL_FILL ? 0xf6f3ea : 0x10141c
    g.circle(0, LABEL_DEPTH, 16).fill(ring)
    g.circle(0, LABEL_DEPTH, 13).fill(disc)
    g.x = x
    g.y = y
    this.opts.container.addChild(g)
    return g
  }

  /** One buried crystal: shade, body, and a highlight. The box is already under the surface. */
  private paintFacet(g: Graphics, part: OreBlob, body: number, lit: number, shade: number): void {
    const { x, y, w, h } = part
    const cx = x + w / 2
    g.poly([x, y + 2, cx, y, x + w, y + 2, x + w, y + h, x, y + h]).fill(shade)
    g.poly([cx, y, x + w, y + 2, x + w, y + h * 0.72, cx, y + h * 0.55]).fill(body)
    g.poly([
      x + w * 0.22, y + Math.max(4, h * 0.22),
      cx, y + 1,
      x + w * 0.7, y + Math.max(4, h * 0.2),
      cx, y + h * 0.42,
    ]).fill(lit)
  }

  /** Element sym above the outcrop. Longer syms (`H2O`) use a smaller size. */
  private createLabel(mineral: string, x: number, y: number, radius: number): Text | null {
    const sym = this.opts.mineralSyms?.[mineral]
    if (!sym) return null
    const name = this.opts.mineralNames?.[mineral]
    if (name && this.opts.depositArtFor) {
      // Clean pill: mineral name + rough amount (one hit-set yields one unit) (SSL-536).
      const tag = depositTag(`${name} · ${sym} ×1`, x, y)
      this.opts.container.addChild(tag)
      return tag as unknown as Text
    }

    const fontSize = Math.max(14, Math.round(radius * (sym.length >= 3 ? 1.15 : 1.7)))
    const ink = this.opts.labelInk ?? ORE_LABEL_FILL
    const label = new Text({
      text: sym,
      style: {
        fontFamily: 'monospace',
        fontSize,
        fontWeight: 'bold',
        fill: ink,
        stroke: { color: ink === ORE_LABEL_FILL ? ORE_LABEL_HALO : 0xffffff, width: 4, join: 'round' },
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
        // Impact: small spark burst on every hit (SSL-538).
        this.spawnParticleBurst(ox, ore.chip ? ore.chip.y : oy, 0xd8f2ff, ore.radius * 0.6)
        this.freeze(ore.hp <= 0 ? 'collect' : 'hit')

        if (ore.hp <= 0) {
          this.collectOre(ore)
        } else {
          ore.flashTimer = FLASH_DURATION
          this.applyTint(ore, 0xffffff)
        }
        break
      }
    }
  }

  /** A shower fragment that reached the ground uncaught breaks up and is gone. */
  private breakFragment(ore: OreEntity): void {
    ore.go.active = false
    if (ore.sprite) ore.sprite.visible = false
    if (ore.label) ore.label.visible = false
    this.spawnParticleBurst(ore.go.transform.position.x, ore.go.transform.position.y, 0x5a6b78, ore.radius * 0.6)
  }

  /** Bank an ore: laser kill, or a shower fragment caught in the collector beam. */
  private collectOre(ore: OreEntity): void {
    ore.go.active = false
    if (ore.halo) ore.halo.visible = false
    if (ore.phase) this.playDebrisMine(ore)
    if (ore.sprite) ore.sprite.visible = false
    if (ore.chip) ore.chip.visible = false
    if (ore.label) ore.label.visible = false
    const popY = ore.chip ? ore.chip.y : ore.go.transform.position.y
    if (!ore.phase || !this.opts.debrisArt) this.spawnParticleBurst(ore.go.transform.position.x, popY, ore.mineralColor, ore.radius)
    this.spawnPickup(ore.go.transform.position.x, popY, ore.mineralColor)
    // SSL-711: a catch says so plainly, larger than an ore pickup.
    if (ore.catchable) this.spawnPopup(this.currentShipX(), Math.max(24, Math.min(popY - 22, this.currentShipY() - 44)), 'Caught +1', 24)
    else this.spawnPopup(ore.go.transform.position.x, popY - 18, `+1 ${this.opts.mineralSyms?.[ore.mineral] ?? ore.mineral}`)
    this.opts.onCollect(ore.mineral)
  }

  private applyTint(ore: OreEntity, tint: number): void {
    if (ore.chip) ore.chip.tint = tint
    if (ore.sprite) {
      if (!this.opts.pixelScale) ore.sprite.tint = tint
      // Untinted pixel art flashes by brightening its alpha pulse instead of a tint.
      else ore.sprite.alpha = tint === 0xffffff ? 0.6 : 1
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
      if (ore.chip) {
        this.opts.container.removeChild(ore.chip)
        ore.chip.destroy()
      }
      if (ore.halo) {
        this.opts.container.removeChild(ore.halo)
        ore.halo.destroy()
      }
      if (this.aimTarget === ore) this.aimTarget = null
      return false
    })

    const laserFloor = this.laserFloor()
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

  /** Floating `+1 Pt` that drifts up and fades. */
  private spawnPopup(x: number, y: number, text: string, fontSize = 16): void {
    const t = new Text({ text, style: { fontFamily: 'Oxanium, system-ui, sans-serif', fontSize, fontWeight: '800', fill: 0xf4f1ea, stroke: { color: 0x1a2a3c, width: 4, join: 'round' } } })
    t.anchor.set(0.5)
    t.x = x
    t.y = y
    this.opts.container.addChild(t)
    let life = 0.8
    const tick = () => {
      life -= 1 / 60
      t.y -= 0.6
      t.alpha = Math.max(0, life / 0.8)
      if (life <= 0) { this.opts.container.removeChild(t); t.destroy(); return }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
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
    const home = { x: this.currentShipX(), y: this.opts.shipY ?? SHIP_Y }
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
