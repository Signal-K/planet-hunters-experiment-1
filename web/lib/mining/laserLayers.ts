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

function ridgeY(terrain: LaserPalette['terrain'], i: number, rand: () => number): number {
  if (terrain === 'ice') return i % 2 === 0 ? -26 - rand() * 22 : -2 - rand() * 4
  if (terrain === 'dunes') return -8 - Math.sin(i * 0.65) * 16 - rand() * 4
  return -4 - rand() * 18
}

function silhouette(g: Graphics, width: number, base: number, color: number, terrain: LaserPalette['terrain'], rand: () => number, step: number) {
  const n = Math.ceil(width / step)
  const pts: number[] = [0, base]
  for (let i = 0; i <= n; i++) pts.push(i * step, ridgeY(terrain, i, rand))
  pts.push(width, base)
  g.poly(pts).fill(color)
}

/** Pixel grit, stones, strata and cracks. Rock colours only — no discs. */
function paintGroundGrit(g: Graphics, width: number, height: number, palette: LaserPalette, rand: () => number): void {
  const rock = palette.ground
  const deep = palette.groundDeep
  const terrain = palette.terrain
  const top = 18
  const span = Math.max(24, height - 30)

  const strata = terrain === 'dunes' ? 6 : terrain === 'ice' ? 5 : 4
  for (let i = 0; i < strata; i++) {
    const y = top + Math.floor(rand() * span)
    const x0 = Math.floor(rand() * 20)
    const len = Math.floor(48 + rand() * (width * (terrain === 'dunes' ? 0.8 : 0.5)))
    g.rect(x0, y, Math.min(len, width - x0), 2).fill(deep)
    if (rand() > 0.3) {
      const x1 = x0 + len + 6 + Math.floor(rand() * 12)
      if (x1 < width - 12) g.rect(x1, y + (rand() > 0.5 ? 3 : -2), Math.floor(24 + rand() * 48), 2).fill(deep)
    }
  }

  const cracks = terrain === 'ice' ? 8 : terrain === 'rubble' ? 5 : 3
  for (let i = 0; i < cracks; i++) {
    let x = 8 + rand() * (width - 24)
    let y = top + rand() * 16
    const steps = 4 + Math.floor(rand() * (terrain === 'ice' ? 6 : 4))
    for (let s = 0; s < steps; s++) {
      g.rect(x, y, 2, 4 + rand() * 7).fill(deep)
      x += (rand() - 0.35) * 6
      y += 4 + rand() * 5
    }
  }

  const stones = terrain === 'rubble' ? 14 : terrain === 'dunes' ? 7 : 9
  for (let i = 0; i < stones; i++) {
    const sw = 4 + Math.floor(rand() * (terrain === 'rubble' ? 7 : 4))
    const sh = 3 + Math.floor(rand() * 4)
    const sx = rand() * (width - sw)
    const sy = top + rand() * (span - sh)
    g.rect(sx, sy, sw, sh).fill(deep)
    g.rect(sx, sy, Math.max(2, sw - 1), 1).fill(rock)
  }

  const grit = terrain === 'rubble' ? 28 : 18
  for (let i = 0; i < grit; i++) g.rect(rand() * (width - 2), top + rand() * span, 2, rand() > 0.5 ? 2 : 1).fill(deep)
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

  const farW = RIDGE_TILE_W
  const far = new Container()
  const farCopies = Math.ceil(worldW / farW) + 2
  for (let i = 0; i < farCopies; i++) {
    const g = new Graphics()
    silhouette(g, farW, 70, palette.distant, palette.terrain, rand, 28)
    g.x = i * farW
    far.addChild(g)
  }
  far.y = surfaceY - 78
  backdrop.addChild(far)

  const nearW = RIDGE_TILE_W
  const near = new Container()
  const nearCopies = Math.ceil(worldW / nearW) + 2
  for (let i = 0; i < nearCopies; i++) {
    const g = new Graphics()
    silhouette(g, nearW, 48, palette.nearRidge, palette.terrain, rand, 18)
    g.x = i * nearW
    near.addChild(g)
  }
  near.y = surfaceY - 36
  backdrop.addChild(near)

  const groundH = Math.max(40, worldH - surfaceY)
  const ground = new Container()
  const tiles = Math.ceil(worldW / GROUND_TILE_W) + 2
  for (let i = 0; i < tiles; i++) {
    const g = new Graphics()
    g.rect(0, 16, GROUND_TILE_W, groundH).fill(palette.groundDeep)
    silhouette(g, GROUND_TILE_W, groundH, palette.ground, palette.terrain, rand, 14)
    paintGroundGrit(g, GROUND_TILE_W, groundH, palette, rand)
    g.x = i * GROUND_TILE_W
    ground.addChild(g)
  }
  ground.y = surfaceY
  backdrop.addChild(ground)

  const motes: Mote[] = []
  for (let i = 0; i < 22; i++) {
    const g = new Graphics()
    const r = 1 + rand() * 1.6
    g.circle(0, 0, r).fill({ color: palette.dust, alpha: 0.25 + rand() * 0.4 })
    g.x = rand() * worldW
    g.y = surfaceY * 0.35 + rand() * (worldH - surfaceY * 0.35)
    backdrop.addChild(g)
    motes.push({ g, x: g.x, y: g.y, vx: 8 + rand() * 22, bob: rand() * Math.PI * 2 })
  }

  const beamH = Math.max(24, surfaceY - shipY - 8)
  const beam = new Graphics()
  beam.rect(-11, 0, 22, beamH).fill({ color: palette.beam, alpha: 0.28 })
  beam.rect(-4, 0, 8, beamH).fill({ color: palette.beam, alpha: 0.9 })
  beam.rect(-1.5, 0, 3, beamH).fill({ color: palette.beamCore, alpha: 0.98 })
  beam.x = shipX
  beam.y = shipY + 10

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
    backdrop, far, near, ground, beam, spark, ship, plume, farW, nearW,
    step(time, reduced, firing) {
      const tw = reduced ? 0 : 1
      for (const star of stars) {
        const flick = 0.55 + 0.45 * Math.abs(Math.sin(time * 2.4 + star.phase))
        star.g.alpha = star.base * (1 - tw + tw * flick)
      }
      for (const mote of motes) {
        if (!reduced) mote.x -= mote.vx * 0.016
        if (mote.x < -8) mote.x = worldW + 8
        mote.g.x = mote.x
        mote.g.y = mote.y + Math.sin(time * 1.4 + mote.bob) * 3 * tw
      }
      for (const cloud of clouds) {
        if (!reduced) cloud.x += cloud.vx * 0.016
        if (cloud.x > worldW + 80) cloud.x = -80
        cloud.g.x = cloud.x
      }
      const pulse = reduced ? 1 : 0.82 + Math.sin(time * 9) * 0.18
      beam.alpha = firing ? 1 : 0.72 + pulse * 0.28
      beam.scale.x = firing ? 1.45 : 0.9 + pulse * 0.15
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
