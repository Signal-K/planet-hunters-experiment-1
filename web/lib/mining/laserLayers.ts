import { Container, Graphics } from 'pixi.js'
import type { LaserPalette } from './laserPalette'

export const GROUND_TILE_W = 320
const RIDGE_TILE_W = 480

function lerp(a: number, b: number, t: number): number {
  const mix = (shift: number) => {
    const av = (a >> shift) & 255
    const bv = (b >> shift) & 255
    return Math.round(av + (bv - av) * t)
  }
  return (mix(16) << 16) | (mix(8) << 8) | mix(0)
}

function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 1831567221) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Low, smooth skyline. The ends meet so tiled copies do not step. */
function smoothHorizon(g: Graphics, width: number, color: number): void {
  const base = 28
  const amp = 7
  const yAt = (x: number) => Math.round(base - amp * (0.55 + 0.45 * Math.sin((x / width) * Math.PI * 2)))
  const pts: number[] = []
  for (let x = 0; x <= width; x += 24) pts.push(x, yAt(x))
  pts.push(width, base, 0, base)
  g.poly(pts).fill(color)
}

/** Cutaway soil: a light crust, then flat strata down to the deep layer. Nothing rises above y = 0. */
function paintGroundBands(g: Graphics, width: number, height: number, palette: LaserPalette): void {
  const edge = lerp(palette.ground, 0xffffff, 0.55)
  const crust = lerp(palette.ground, 0xffffff, 0.24)
  const mid = palette.ground
  const lower = lerp(palette.ground, palette.groundDeep, 0.42)
  const deep = palette.groundDeep
  const crustH = Math.max(18, Math.round(height * 0.16))
  const midH = Math.max(28, Math.round(height * 0.28))
  const lowerH = Math.max(24, Math.round(height * 0.22))
  g.rect(0, 0, width, height).fill(deep)
  g.rect(0, crustH + midH, width, lowerH).fill(lower)
  g.rect(0, crustH, width, midH).fill(mid)
  g.rect(0, 4, width, crustH).fill(crust)
  g.rect(0, 0, width, 4).fill(edge)
}

function paintSky(w: number, h: number, palette: LaserPalette): Graphics {
  const g = new Graphics()
  const steps = 28
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    g.rect(0, (h * i) / steps, w, h / steps + 1).fill(lerp(palette.skyTop, palette.skyHorizon, t * t))
  }
  return g
}

interface Mote { g: Graphics; x: number; y: number; vx: number; bob: number }

export interface LaserField {
  backdrop: Container
  far: Container
  near: Container
  ground: Container
  beam: Graphics
  dig: Graphics
  spark: Graphics
  ship: Container
  plume: Graphics
  farW: number
  nearW: number
  step: (time: number, reduced: boolean, firing: boolean) => void
}

export function buildLaserField(opts: {
  worldW: number
  worldH: number
  surfaceY: number
  shipX: number
  shipY: number
  palette: LaserPalette
}): LaserField {
  const { worldW, worldH, surfaceY, shipX, shipY, palette } = opts
  const rand = rng(palette.id.length * 97 + palette.skyTop)
  const backdrop = new Container()

  backdrop.addChild(paintSky(worldW, worldH, palette))

  const stars: { g: Graphics; base: number; phase: number }[] = []
  if (palette.starAlpha > 0) {
    const layer = new Container()
    for (let i = 0; i < 70; i++) {
      const g = new Graphics()
      const r = rand() > 0.86 ? 1.8 : 1
      const base = (0.35 + rand() * 0.65) * palette.starAlpha
      g.circle(0, 0, r).fill({ color: 0xffffff, alpha: base })
      g.x = rand() * worldW
      g.y = rand() * (surfaceY - 12)
      layer.addChild(g)
      stars.push({ g, base, phase: rand() * Math.PI * 2 })
    }
    backdrop.addChild(layer)
  }

  if (palette.planet) {
    const p = palette.planet
    const radius = p.radius * Math.min(worldW, worldH) * 0.5
    const body = new Graphics()
    body.circle(0, 0, radius + 10).fill({ color: p.bands[0], alpha: 0.28 })
    body.circle(0, 0, radius).fill(p.bands[0])
    p.bands.forEach((band, i) => {
      const y = -radius + ((i + 0.5) / p.bands.length) * radius * 2
      const half = Math.sqrt(Math.max(0, radius * radius - y * y))
      const h = (radius * 2) / p.bands.length * 0.72
      body.ellipse(0, y, half, h).fill(band)
    })
    body.x = p.cx * worldW
    body.y = p.cy * surfaceY
    backdrop.addChild(body)
  }

  if (palette.lightAlpha > 0) {
    const sun = new Graphics()
    sun.circle(0, 0, 36).fill({ color: palette.light, alpha: 0.35 * palette.lightAlpha })
    sun.circle(0, 0, 22).fill({ color: palette.light, alpha: 0.95 * palette.lightAlpha })
    sun.x = worldW * 0.62
    sun.y = surfaceY * 0.42
    backdrop.addChild(sun)
  }

  const clouds: Mote[] = []
  if (palette.clouds) {
    for (let i = 0; i < 5; i++) {
      const g = new Graphics()
      const w = 50 + rand() * 70
      g.ellipse(0, 0, w, 10 + rand() * 8).fill({ color: 0xfff6ee, alpha: 0.45 })
      g.ellipse(-w * 0.3, 4, w * 0.55, 8).fill({ color: 0xfff6ee, alpha: 0.35 })
      g.x = rand() * worldW
      g.y = surfaceY * (0.25 + rand() * 0.35)
      backdrop.addChild(g)
      clouds.push({ g, x: g.x, y: g.y, vx: 6 + rand() * 10, bob: rand() * 4 })
    }
  }

  const horizon = lerp(palette.distant, palette.skyHorizon, 0.42)
  const farW = RIDGE_TILE_W
  const far = new Container()
  const farCopies = Math.ceil(worldW / farW) + 2
  for (let i = 0; i < farCopies; i++) {
    const g = new Graphics()
    smoothHorizon(g, farW, horizon)
    g.x = i * farW
    far.addChild(g)
  }
  far.y = surfaceY - 36
  backdrop.addChild(far)

  const nearW = RIDGE_TILE_W
  const near = new Container()
  near.y = surfaceY
  backdrop.addChild(near)

  const groundH = Math.max(40, worldH - surfaceY)
  const ground = new Container()
  const tiles = Math.ceil(worldW / GROUND_TILE_W) + 2
  for (let i = 0; i < tiles; i++) {
    const g = new Graphics()
    paintGroundBands(g, GROUND_TILE_W, groundH, palette)
    g.x = i * GROUND_TILE_W
    ground.addChild(g)
  }
  ground.y = surfaceY
  backdrop.addChild(ground)

  const beamH = Math.max(24, surfaceY - shipY - 8)
  const beam = new Graphics()
  beam.rect(-11, 0, 22, beamH).fill({ color: palette.beam, alpha: 0.28 })
  beam.rect(-4, 0, 8, beamH).fill({ color: palette.beam, alpha: 0.9 })
  beam.rect(-1.5, 0, 3, beamH).fill({ color: palette.beamCore, alpha: 0.98 })
  beam.x = shipX
  beam.y = shipY + 10

  const digH = 72
  const dig = new Graphics()
  dig.rect(-7, 0, 14, digH).fill({ color: palette.beam, alpha: 0.28 })
  dig.rect(-2, 0, 4, digH).fill({ color: palette.beamCore, alpha: 0.95 })
  dig.x = shipX
  dig.y = surfaceY
  dig.alpha = 0

  const spark = new Graphics()
  spark.circle(0, 0, 10).fill({ color: palette.beam, alpha: 0.45 })
  spark.circle(0, 0, 4).fill({ color: palette.beamCore, alpha: 0.95 })
  spark.x = shipX
  spark.y = surfaceY

  const ship = buildShip(palette)
  ship.x = shipX
  ship.y = shipY
  const plume = ship.children[0] as Graphics

  return {
    backdrop, far, near, ground, beam, dig, spark, ship, plume, farW, nearW,
    step(time, reduced, firing) {
      const tw = reduced ? 0 : 1
      for (const star of stars) {
        const flick = 0.55 + 0.45 * Math.abs(Math.sin(time * 2.4 + star.phase))
        star.g.alpha = star.base * (1 - tw + tw * flick)
      }
      for (const cloud of clouds) {
        if (!reduced) cloud.x += cloud.vx * 0.016
        if (cloud.x > worldW + 80) cloud.x = -80
        cloud.g.x = cloud.x
      }
      const pulse = reduced ? 1 : 0.82 + Math.sin(time * 9) * 0.18
      beam.alpha = firing ? 1 : 0.72 + pulse * 0.28
      beam.scale.x = firing ? 1.45 : 0.9 + pulse * 0.15
      dig.alpha = firing ? 1 : 0
      spark.scale.set(firing ? 1.6 : 0.75 + pulse * 0.35)
      spark.alpha = firing ? 1 : 0.7 + pulse * 0.3
      plume.scale.set(pulse, 0.85 + pulse * 0.2)
      plume.alpha = 0.75 + pulse * 0.25
    },
  }
}

function buildShip(palette: LaserPalette): Container {
  const root = new Container()
  const plume = new Graphics()
  plume.ellipse(-8, 0, 16, 7).fill({ color: palette.beam, alpha: 0.35 })
  plume.ellipse(-4, 0, 10, 4).fill({ color: palette.beamCore, alpha: 0.9 })
  plume.x = -34
  root.addChild(plume)

  const hull = new Graphics()
  hull.poly([-30, 7, -16, -12, 18, -11, 36, -1, 18, 12, -16, 12]).fill(0xc8c2b8)
  hull.poly([-30, 7, -22, -2, -22, 10]).fill(0x8e8880)
  hull.poly([6, -11, 16, -20, 22, -11]).fill(0xb4aea6)
  hull.poly([-8, 12, 4, 20, 14, 12]).fill(0x9a948c)
  hull.rect(-4, -6, 14, 8).fill(0x6e8ea0)
  hull.circle(18, -1, 3.5).fill(0xd7eef8)
  root.addChild(hull)
  return root
}
