import { Container, Graphics } from 'pixi.js'
import type { LaserPalette } from './laserPalette'

export const GROUND_TILE_W = 320
const RIDGE_TILE_W = 320
/** Pre-Oct-5 surface profile. Period is 20 steps of 16px, so a 320px tile meets itself. */
const RIDGE_H = [0, -10, -14, -7, -18, -11, -5, -16, -12, -8, -15, -9, -19, -6, -13, -10, -17, -4, -11, -8]

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

/** Low, smooth skyline. The ends meet so tiled copies do not step. Peaks point up (negative y). */
function smoothHorizon(g: Graphics, width: number, color: number, amp: number): void {
  const yAt = (x: number) => Math.round(-amp * (0.55 + 0.45 * Math.sin((x / width) * Math.PI * 2)))
  const pts: number[] = []
  for (let x = 0; x <= width; x += 24) pts.push(x, yAt(x))
  pts.push(width, 0, 0, 0)
  g.poly(pts).fill(color)
}

/** Jagged distant ridge from the pre-Oct-5 surface profile. Nothing crosses below y = 0. */
function jaggedRidge(g: Graphics, width: number, color: number, scale: number): void {
  const pts: number[] = [0, 0]
  for (let x = 0; x <= width; x += 16) {
    pts.push(x, Math.round(RIDGE_H[Math.floor(x / 16) % RIDGE_H.length] * scale))
  }
  pts.push(width, 0)
  g.poly(pts).fill(color)
}

/** Cutaway soil. y = 0 is the surface; every mark sits strictly below it. */
function paintGroundBands(g: Graphics, width: number, height: number, palette: LaserPalette, tile: number): void {
  const rand = rng((tile + 1) * 997 + palette.ground)
  const edge = lerp(palette.ground, 0xffffff, 0.55)
  const crust = lerp(palette.ground, 0xffffff, 0.28)
  const crustShade = lerp(palette.ground, palette.groundDeep, 0.12)
  const mid = palette.ground
  const midLite = lerp(palette.ground, palette.groundSpeck, 0.18)
  const lower = lerp(palette.ground, palette.groundDeep, 0.42)
  const deep = palette.groundDeep
  const crustH = Math.max(22, Math.round(height * 0.18))
  const midH = Math.max(32, Math.round(height * 0.3))
  const lowerH = Math.max(26, Math.round(height * 0.22))
  g.rect(0, 0, width, height).fill(deep)
  g.rect(0, crustH + midH, width, lowerH).fill(lower)
  g.rect(0, crustH, width, midH).fill(mid)
  g.rect(0, crustH, width, Math.round(midH * 0.28)).fill({ color: midLite, alpha: 0.55 })
  g.rect(0, 5, width, crustH).fill(crust)
  g.rect(0, 5 + Math.round(crustH * 0.55), width, Math.max(6, Math.round(crustH * 0.28))).fill({ color: crustShade, alpha: 0.65 })
  g.rect(0, 0, width, 4).fill(edge)

  const pebble = lerp(palette.ground, palette.groundSpeck, 0.42)
  const fossil = lerp(palette.groundDeep, palette.groundSpeck, 0.35)
  for (let n = 0; n < 7; n++) {
    const x = 12 + rand() * (width - 24)
    const y = 14 + rand() * (height - 28)
    const rx = 3 + rand() * 5
    const ry = 2 + rand() * 3
    g.ellipse(x, y, rx, ry).fill({ color: pebble, alpha: 0.28 })
  }
  for (let n = 0; n < 2; n++) {
    const x = 20 + rand() * (width - 40)
    const y = 28 + rand() * (height * 0.55)
    g.ellipse(x, y, 8, 3.5).stroke({ color: fossil, width: 1.25, alpha: 0.34 })
    g.circle(x - 2, y, 1.2).fill({ color: fossil, alpha: 0.4 })
  }
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
  dig: Container
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

  for (let i = 0; i < 4; i++) {
    const g = new Graphics()
    g.circle(0, 0, 1.4).fill({ color: palette.dust, alpha: 0.35 })
    g.x = rand() * worldW
    g.y = surfaceY * (0.15 + rand() * 0.7)
    backdrop.addChild(g)
    clouds.push({ g, x: g.x, y: g.y, vx: 4 + rand() * 8, bob: rand() * 6 })
  }

  const horizon = lerp(palette.distant, palette.skyHorizon, 0.35)
  const farW = RIDGE_TILE_W
  const far = new Container()
  const farCopies = Math.ceil(worldW / farW) + 2
  for (let i = 0; i < farCopies; i++) {
    const g = new Graphics()
    smoothHorizon(g, farW, horizon, 16)
    jaggedRidge(g, farW, lerp(palette.distant, palette.skyHorizon, 0.2), 1.35)
    g.x = i * farW
    far.addChild(g)
  }
  far.y = surfaceY
  backdrop.addChild(far)

  const nearW = RIDGE_TILE_W
  const near = new Container()
  const nearCopies = Math.ceil(worldW / nearW) + 2
  for (let i = 0; i < nearCopies; i++) {
    const g = new Graphics()
    jaggedRidge(g, nearW, palette.nearRidge, 0.85)
    g.x = i * nearW
    near.addChild(g)
  }
  near.y = surfaceY
  backdrop.addChild(near)

  const haze = new Graphics()
  haze.rect(0, surfaceY - 18, worldW, 18).fill({ color: palette.skyHorizon, alpha: 0.28 })
  backdrop.addChild(haze)

  const groundH = Math.max(40, worldH - surfaceY)
  const ground = new Container()
  const tiles = Math.ceil(worldW / GROUND_TILE_W) + 2
  for (let i = 0; i < tiles; i++) {
    const g = new Graphics()
    paintGroundBands(g, GROUND_TILE_W, groundH, palette, i)
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

  const digH = 96
  const dig = new Container()
  const digGlow = new Graphics()
  digGlow.rect(-18, 0, 36, digH).fill({ color: palette.beam, alpha: 0.16 })
  digGlow.rect(-7, 0, 14, digH).fill({ color: palette.beam, alpha: 0.38 })
  digGlow.rect(-2, 0, 4, digH).fill({ color: palette.beamCore, alpha: 0.95 })
  dig.addChild(digGlow)
  const motes: { g: Graphics; base: number; speed: number }[] = []
  for (let i = 0; i < 7; i++) {
    const g = new Graphics()
    g.circle(0, 0, i % 3 === 0 ? 2.2 : 1.3).fill({ color: palette.beamCore, alpha: 0.9 })
    g.x = (i - 3) * 3
    g.y = 8 + i * 12
    g.alpha = 0
    dig.addChild(g)
    motes.push({ g, base: g.y, speed: 28 + i * 9 })
  }
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
      if (firing && !reduced) {
        for (const mote of motes) {
          mote.g.alpha = 0.45 + 0.55 * Math.abs(Math.sin(time * 6 + mote.base))
          mote.g.y = (mote.base + time * mote.speed) % digH
        }
      }
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
