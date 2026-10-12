import { Assets, Container, Sprite, Texture, TilingSprite } from 'pixi.js'
import type { LaserPalette } from './laserPalette'

/** Native laser kit is authored at 1px and drawn at 2. */
export const LASER_PX = 2

const KIT = '/game/assets/laser'

function lerp(a: number, b: number, t: number): number {
  const mix = (shift: number) => {
    const av = (a >> shift) & 255
    const bv = (b >> shift) & 255
    return Math.round(av + (bv - av) * t)
  }
  return (mix(16) << 16) | (mix(8) << 8) | mix(0)
}

/** Multiply-tint keeps the grey kit's shading. Full replacement would flatten it. */
function shadeTint(color: number, blend: number): number {
  return lerp(0xffffff, color, blend)
}

async function tex(name: string): Promise<Texture> {
  const texture = await Assets.load<Texture>(`${KIT}/${name}.png`)
  texture.source.scaleMode = 'nearest'
  texture.source.addressMode = 'repeat'
  return texture
}

function tile(texture: Texture, copies: number, px: number, flip = false): TilingSprite {
  const strip = new TilingSprite({
    texture,
    width: copies * texture.width,
    height: texture.height,
  })
  strip.scale.set(flip ? -px : px, px)
  if (flip) strip.x = copies * texture.width * px
  return strip
}

interface Drifter { node: Sprite; x: number; y: number; v: number }

export interface LaserField {
  backdrop: Container
  far: Container
  near: Container
  ground: Container
  beam: Container
  dig: Container
  spark: Sprite
  ship: Container
  plume: Sprite
  soilW: number
  ridgeW: number
  pixelScale: number
  depositFrames: Texture[]
  hover: number
  step: (time: number, reduced: boolean, firing: boolean) => void
}

export async function buildLaserField(opts: {
  worldW: number
  worldH: number
  surfaceY: number
  shipX: number
  shipY: number
  palette: LaserPalette
}): Promise<LaserField> {
  const { worldW, worldH, surfaceY, shipX, shipY, palette } = opts
  const px = LASER_PX
  const soilW = 64 * px
  const ridgeW = 128 * px
  const crustH = 8 * px

  const [
    dither0, dither1, dither2, starTex, disc48, disc24, moteTex,
    ridgeTex, crustTex, soilTex, fleckTex, shipTex, flame0, flame1, beamTex, sparkTex,
    deposit0, deposit1,
  ] = await Promise.all([
    tex('sky-dither-0'), tex('sky-dither-1'), tex('sky-dither-2'),
    tex('star'), tex('disc-48'), tex('disc-24'), tex('mote'),
    tex(palette.terrain === 'ice' || palette.terrain === 'dunes' ? `ridge-${palette.terrain}` : 'ridge-rubble'),
    tex('crust'), tex('soil'), tex('soil-flecks'),
    tex('ship'), tex('flame-0'), tex('flame-1'), tex('beam'), tex('spark-0'),
    tex('deposit-0'), tex('deposit-1'),
  ])
  const dither = [dither0, dither1, dither2]
  const cloudTex = palette.clouds ? await Assets.load<Texture>('/game/assets/base/layers/cloud.png') : null
  if (cloudTex) {
    cloudTex.source.scaleMode = 'nearest'
  }

  const backdrop = new Container()
  const bandH = 4 * px
  const bands = Math.max(1, Math.ceil(surfaceY / bandH))
  for (let r = 0; r < bands; r++) {
    const t = bands <= 1 ? 0 : r / (bands - 1)
    const sky = lerp(palette.skyTop, palette.skyHorizon, t * t)
    const strip = new TilingSprite({
      texture: dither[Math.min(2, Math.floor(t * 3))],
      width: Math.ceil(worldW / (16 * px)) * 16,
      height: 4,
    })
    strip.scale.set(px)
    strip.y = r * bandH
    strip.tint = lerp(sky, 0xffffff, 0.28)
    strip.alpha = 0.82
    backdrop.addChild(strip)
  }

  const stars: { node: Sprite; base: number; phase: number }[] = []
  if (palette.starAlpha > 0) {
    for (let i = 0; i < 64; i++) {
      const star = new Sprite(starTex)
      star.anchor.set(0.5)
      star.scale.set(i % 9 === 0 ? px : px / 2)
      star.tint = 0xffffff
      const fromBottom = 0.42 + ((i * 53) % 50) / 100
      star.x = (i * 97) % Math.max(1, worldW)
      star.y = Math.min(surfaceY - 10, worldH * (1 - fromBottom))
      if (star.y < 4) star.y = 8 + (i * 13) % Math.max(8, surfaceY - 16)
      const base = palette.starAlpha * (0.45 + (i % 5) * 0.12)
      star.alpha = base
      backdrop.addChild(star)
      stars.push({ node: star, base, phase: i })
    }
  }

  if (palette.planet) {
    const radius = worldW * palette.planet.radius
    const scale = Math.max(1, Math.round((radius * 2) / 48))
    const body = new Sprite(disc48)
    body.anchor.set(0.5)
    body.scale.set(scale)
    body.tint = palette.planet.bands[0] ?? 0xffffff
    body.x = worldW * palette.planet.cx
    body.y = worldH * palette.planet.cy
    backdrop.addChild(body)
  }

  if (palette.lightAlpha > 0) {
    const sun = new Sprite(disc24)
    sun.anchor.set(0.5)
    sun.scale.set(px)
    sun.tint = palette.light
    sun.alpha = palette.lightAlpha
    sun.x = worldW * 0.62
    sun.y = Math.max(24, surfaceY * 0.28)
    backdrop.addChild(sun)
  }

  const clouds: Drifter[] = []
  if (cloudTex) {
    for (let i = 0; i < 4; i++) {
      const cloud = new Sprite(cloudTex)
      cloud.anchor.set(0.5)
      cloud.scale.set(px + (i % 2))
      cloud.alpha = 0.7
      cloud.x = (worldW * i) / 4
      cloud.y = surfaceY * (0.22 + i * 0.08)
      backdrop.addChild(cloud)
      clouds.push({ node: cloud, x: cloud.x, y: cloud.y, v: 8 + i * 3 })
    }
  }

  const dust: Drifter[] = []
  for (let i = 0; i < 18; i++) {
    const mote = new Sprite(moteTex)
    mote.anchor.set(0.5)
    mote.scale.set(px)
    mote.tint = palette.dust
    mote.alpha = 0.6
    const x = (i * 113) % Math.max(1, worldW)
    const y = 12 + ((i * 29) % Math.max(1, Math.round(surfaceY * 0.7)))
    mote.x = x
    mote.y = y
    backdrop.addChild(mote)
    dust.push({ node: mote, x, y, v: 10 + (i % 5) * 6 })
  }

  const ridgeCopies = Math.ceil(worldW / ridgeW) + 2
  const far = new Container()
  const farStrip = tile(ridgeTex, ridgeCopies, px)
  farStrip.tint = shadeTint(palette.distant, 0.42)
  far.addChild(farStrip)
  far.y = surfaceY + 8 - 48 * px
  backdrop.addChild(far)

  const near = new Container()
  const nearStrip = tile(ridgeTex, ridgeCopies, px, true)
  nearStrip.tint = shadeTint(palette.nearRidge, 0.5)
  near.addChild(nearStrip)
  near.y = surfaceY + 2 + 8 * px - 48 * px
  backdrop.addChild(near)

  const ground = new Container()
  const cols = Math.ceil(worldW / soilW) + 2
  const rows = Math.ceil(Math.max(40, worldH - surfaceY) / soilW) + 1
  for (let c = 0; c < cols; c++) {
    const cx = c * soilW
    for (let r = 0; r < rows; r++) {
      const deep = r > 0 || c % 3 === 1
      const flip = (c + r) % 2 === 1
      const soil = new Sprite(soilTex)
      soil.anchor.set(0, 0)
      soil.scale.set(flip ? -px : px, px)
      soil.tint = shadeTint(deep ? palette.groundDeep : palette.ground, deep ? 0.62 : 0.26)
      soil.x = flip ? cx + soilW : cx
      soil.y = crustH + r * soilW
      ground.addChild(soil)
      const flecks = new Sprite(fleckTex)
      flecks.anchor.set(0, 0)
      flecks.scale.set(flip ? -px : px, px)
      flecks.x = soil.x
      flecks.y = soil.y
      ground.addChild(flecks)
    }
    const lip = new Sprite(crustTex)
    lip.anchor.set(0, 0)
    lip.scale.set(px)
    lip.tint = shadeTint(palette.groundSpeck, 0.32)
    lip.width = 64 * px
    lip.height = crustH
    lip.x = cx
    lip.y = 0
    ground.addChild(lip)
  }
  ground.y = surfaceY
  backdrop.addChild(ground)

  const beam = new Container()
  const beamSpan = Math.max(24, surfaceY - (shipY + 8 * px))
  const segH = 8 * px
  for (let k = 0; k < Math.ceil(beamSpan / segH); k++) {
    const seg = new Sprite(beamTex)
    seg.anchor.set(0.5, 0)
    seg.scale.set(px)
    seg.y = k * segH
    seg.tint = palette.beam
    beam.addChild(seg)
  }
  beam.x = shipX
  beam.y = shipY + 8 * px

  const dig = new Container()
  for (let k = 0; k < 4; k++) {
    const seg = new Sprite(beamTex)
    seg.anchor.set(0.5, 0)
    seg.scale.set(px)
    seg.y = k * segH
    seg.tint = palette.beam
    dig.addChild(seg)
  }
  const digMotes: { node: Sprite; base: number }[] = []
  for (let i = 0; i < 6; i++) {
    const mote = new Sprite(moteTex)
    mote.anchor.set(0.5)
    mote.scale.set(px * 2)
    mote.tint = palette.beamCore
    mote.x = (i - 2.5) * 4
    mote.y = 6 + i * 8
    dig.addChild(mote)
    digMotes.push({ node: mote, base: mote.y })
  }
  dig.x = shipX
  dig.y = surfaceY
  dig.alpha = 0

  const spark = new Sprite(sparkTex)
  spark.anchor.set(0.5)
  spark.scale.set(px)
  spark.x = shipX
  spark.y = surfaceY

  const ship = new Container()
  const plume = new Sprite(flame0)
  plume.anchor.set(1, 0.5)
  plume.scale.set(px)
  plume.x = -19 * px
  ship.addChild(plume)
  const hull = new Sprite(shipTex)
  hull.anchor.set(0.5)
  hull.scale.set(px)
  ship.addChild(hull)
  ship.x = shipX
  ship.y = shipY

  const flameFrames = [flame0, flame1]
  const field: LaserField = {
    backdrop, far, near, ground, beam, dig, spark, ship, plume,
    soilW, ridgeW, pixelScale: px, depositFrames: [deposit0, deposit1], hover: 0,
    step(time, reduced, firing) {
      const tw = reduced ? 0 : 1
      for (const star of stars) {
        const flick = 0.55 + 0.45 * Math.abs(Math.sin(time * 2.4 + star.phase))
        star.node.alpha = star.base * (1 - tw + tw * flick)
      }
      if (!reduced) {
        for (const cloud of clouds) {
          cloud.x += cloud.v * 0.016
          if (cloud.x > worldW + 80) cloud.x = -80
          cloud.node.x = cloud.x
        }
        for (const mote of dust) {
          mote.x -= mote.v * 0.016
          if (mote.x < -8) mote.x = worldW + 8
          mote.node.x = mote.x
          mote.node.y = mote.y + Math.sin(time + mote.v) * 3
        }
      }
      const pulse = reduced ? 1 : 0.82 + Math.sin(time * 9) * 0.18
      beam.alpha = firing ? 1 : 0.72 + pulse * 0.28
      beam.scale.x = firing ? 1.45 : 1
      dig.alpha = firing ? 1 : 0
      if (firing && !reduced) {
        for (const mote of digMotes) {
          mote.node.alpha = 0.45 + 0.55 * Math.abs(Math.sin(time * 6 + mote.base))
          mote.node.y = (mote.base + time * 40) % 48
        }
      }
      spark.scale.set(px * (firing ? 1.5 : 0.85 + pulse * 0.2))
      spark.alpha = firing ? 1 : 0.7 + pulse * 0.3
      plume.alpha = 0.7 + pulse * 0.3
      if (!reduced) plume.texture = flameFrames[Math.floor(time * 10) % 2]
      field.hover = reduced ? 0 : Math.sin(time * 2.2) * 2
    },
  }
  return field
}
