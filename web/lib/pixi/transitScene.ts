import { Application, Assets, Graphics, Container, Sprite, Text, TextStyle, Texture } from 'pixi.js'

export type TargetKind = 'asteroid' | 'planet' | 'moon' | 'earth'

export interface TransitSceneOptions {
  targetName: string
  targetKind?: TargetKind
  rocketImageSrc?: string
  renderRocket?: boolean
  getProgress: () => number  // 0..100
}

export interface TransitScene {
  update(elapsed: number, dt: number): void
}

// How fast each star layer scrolls (deeper = faster parallax)
const LAYER_SPEEDS = [18, 36, 65]   // px/s — gives clear sense of upward travel
const LAYER_COUNTS = [55, 32, 18]

function mkStarLayer(W: number, H: number, count: number, layer: number): Graphics {
  const g = new Graphics()
  for (let i = 0; i < count; i++) {
    const x = Math.random() * W
    const y = Math.random() * H
    const r = 0.3 + Math.random() * (layer === 2 ? 1.2 : 0.6)
    const alpha = 0.18 + Math.random() * 0.65
    g.circle(x, y, r).fill({ color: 0xffffff, alpha })
  }
  return g
}

// Stylized landmasses in spherical (longitude, latitude) terms so Earth can
// slowly rotate like a real globe instead of sitting as a static painted
// disc — loosely Africa/Eurasia/Americas-shaped, not geographically exact.
const EARTH_CONTINENTS: { lon: number; lat: number; w: number; h: number }[] = [
  { lon: 0.15, lat: -0.05, w: 0.30, h: 0.46 },   // Africa-ish
  { lon: 0.95, lat: 0.42, w: 0.40, h: 0.24 },    // Eurasia-ish
  { lon: -1.35, lat: 0.10, w: 0.22, h: 0.50 },   // Americas-ish
  { lon: -2.5, lat: -0.35, w: 0.14, h: 0.14 },   // Antarctica-adjacent island
  { lon: 2.7, lat: -0.30, w: 0.16, h: 0.12 },    // Australia-ish
]

const EARTH_CLOUDS: { lon: number; lat: number; w: number; h: number }[] = [
  { lon: 0.6, lat: -0.5, w: 0.34, h: 0.09 },
  { lon: -0.4, lat: 0.15, w: 0.26, h: 0.08 },
  { lon: 1.8, lat: 0.55, w: 0.3, h: 0.09 },
  { lon: -2.0, lat: -0.1, w: 0.22, h: 0.07 },
  { lon: 3.3, lat: 0.05, w: 0.28, h: 0.08 },
]

function drawGlobeFeature(
  g: Graphics, cx: number, cy: number, r: number,
  feature: { lon: number; lat: number; w: number; h: number },
  rotation: number, color: number, baseAlpha: number,
) {
  const angle = feature.lon + rotation
  const cosA = Math.cos(angle)
  if (cosA < -0.2) return  // far side of the globe — not visible
  const visibility = Math.max(0, Math.min(1, cosA + 0.2))
  const xProj = Math.sin(angle) * 0.82
  const wScale = Math.max(0.1, visibility)
  g.ellipse(cx + r * xProj, cy + r * feature.lat * 0.8, Math.max(0.5, r * feature.w * wScale), r * feature.h)
    .fill({ color, alpha: baseAlpha * Math.min(1, visibility * 1.6) })
}

function drawPlanet(g: Graphics, cx: number, cy: number, r: number, kind: TargetKind, rotation = 0) {
  g.clear()
  if (r < 1) return

  // glow
  if (kind === 'earth') {
    g.circle(cx, cy, r + r * 0.42).fill({ color: 0x3fa9ff, alpha: 0.13 })
    g.circle(cx, cy, r + r * 0.18).fill({ color: 0x6cc2ff, alpha: 0.24 })
    g.circle(cx, cy, r + r * 0.05).fill({ color: 0xbfe8ff, alpha: 0.16 })
  } else if (kind === 'planet') {
    g.circle(cx, cy, r + r * 0.35).fill({ color: 0x0d5e8a, alpha: 0.12 })
    g.circle(cx, cy, r + r * 0.15).fill({ color: 0x0b7ab8, alpha: 0.18 })
  } else if (kind === 'moon') {
    g.circle(cx, cy, r + r * 0.2).fill({ color: 0x556080, alpha: 0.1 })
  }

  // body — deep ocean base with a lighter mid-tone band so the sphere reads
  // as lit rather than a flat disc
  const bodyColor = kind === 'asteroid' ? 0x3d3020 : kind === 'moon' ? 0x5a6070 : kind === 'earth' ? 0x0f4c85 : 0x1b4e70
  g.circle(cx, cy, r).fill(bodyColor)

  if (kind === 'earth' && r > 6) {
    if (r > 10) {
      g.circle(cx, cy, r).fill({ color: 0x2378c4, alpha: 0.4 })
    }
    for (const feature of EARTH_CONTINENTS) {
      drawGlobeFeature(g, cx, cy, r, feature, rotation, 0x3c8f4a, 0.9)
    }
    if (r > 8) {
      // polar ice caps — fixed at the poles regardless of rotation
      g.ellipse(cx, cy - r * 0.86, r * 0.5, r * 0.18).fill({ color: 0xf0f8ff, alpha: 0.8 })
      g.ellipse(cx, cy + r * 0.86, r * 0.46, r * 0.16).fill({ color: 0xf0f8ff, alpha: 0.75 })
    }
    if (r > 18) {
      for (const cloud of EARTH_CLOUDS) {
        drawGlobeFeature(g, cx, cy, r, cloud, rotation * 0.6, 0xffffff, 0.35)
      }
    }
    if (r > 14) {
      // specular sun glint, offset toward the light source (top-left, matching the terminator below)
      g.ellipse(cx - r * 0.32, cy - r * 0.3, r * 0.22, r * 0.14).fill({ color: 0xeaf6ff, alpha: 0.14 })
    }
  }

  if (kind === 'planet' && r > 16) {
    // atmosphere bands
    g.ellipse(cx, cy + r * 0.08, r * 0.78, r * 0.13).stroke({ color: 0x5ac4e8, alpha: 0.07, width: r * 0.07 })
    g.ellipse(cx, cy - r * 0.18, r * 0.6, r * 0.09).stroke({ color: 0x8de8ff, alpha: 0.05, width: r * 0.05 })
  }

  if (kind === 'moon' && r > 14) {
    const craters: [number, number, number][] = [[0.28, 0.15, 0.12], [-0.22, 0.32, 0.09], [0.1, -0.28, 0.07]]
    for (const [fx, fy, fr] of craters) {
      g.circle(cx + r * fx, cy + r * fy, r * fr).fill({ color: 0x3c4050, alpha: 0.55 })
    }
  }

  if (kind === 'asteroid' && r > 10) {
    g.ellipse(cx + r * 0.1, cy, r * 0.9, r * 0.55).fill(0x3d3020)
    const craters: [number, number, number][] = [[0.3, 0.2, 0.14], [-0.28, -0.08, 0.1], [0.05, 0.38, 0.08]]
    for (const [fx, fy, fr] of craters) {
      g.circle(cx + r * fx, cy + r * fy, r * fr).fill({ color: 0x1e1508, alpha: 0.65 })
    }
  }

  // terminator shadow
  g.circle(cx + r * 0.22, cy + r * 0.05, r * 0.92).fill({ color: 0x000510, alpha: 0.55 })
}

function drawRocket(g: Graphics, rx: number, ry: number, flicker: number) {
  g.clear()
  // body
  g.rect(rx - 5, ry - 20, 10, 30).fill(0xc4d4f0)
  // nose
  g.poly([rx, ry - 28, rx - 5, ry - 20, rx + 5, ry - 20]).fill(0x9becff)
  // fins
  g.poly([rx - 5, ry + 8, rx - 13, ry + 20, rx - 5, ry + 10]).fill(0x9becff)
  g.poly([rx + 5, ry + 8, rx + 13, ry + 20, rx + 5, ry + 10]).fill(0x9becff)
  // engine bell
  g.rect(rx - 4, ry + 10, 8, 5).fill(0x8899bb)
  // plume
  const plumeH = 10 + flicker * 5
  g.poly([rx - 3, ry + 15, rx + 3, ry + 15, rx + 2, ry + 15 + plumeH, rx - 2, ry + 15 + plumeH]).fill({ color: 0xff7700, alpha: 0.85 })
  g.poly([rx - 1, ry + 15, rx + 1, ry + 15, rx, ry + 18 + plumeH]).fill({ color: 0xffee55, alpha: 0.9 })
}

export function buildTransitScene(app: Application, opts: TransitSceneOptions): TransitScene {
  const W = app.screen.width
  const H = app.screen.height

  const bg = new Graphics()
  bg.rect(0, 0, W, H).fill(0x010508)
  app.stage.addChild(bg)

  const starContainers: Container[] = []
  for (let i = 0; i < 3; i++) {
    const c = new Container()
    c.addChild(mkStarLayer(W, H, LAYER_COUNTS[i], i))
    app.stage.addChild(c)
    starContainers.push(c)
  }

  const planetG = new Graphics()
  app.stage.addChild(planetG)

  const renderRocket = opts.renderRocket !== false
  const rocketG = new Graphics()
  if (renderRocket) app.stage.addChild(rocketG)

  const rocketSprite = new Sprite(Texture.EMPTY)
  rocketSprite.anchor.set(0.5)
  rocketSprite.rotation = Math.PI / 2
  rocketSprite.visible = false
  if (renderRocket) app.stage.addChild(rocketSprite)
  if (renderRocket && opts.rocketImageSrc) {
    void Assets.load<Texture>(opts.rocketImageSrc).then(texture => {
      rocketSprite.texture = texture
      const longEdge = Math.min(H * 0.18, 110)
      const thickEdge = Math.min(W * 0.16, 48)
      const scale = Math.min(longEdge / Math.max(texture.width, 1), thickEdge / Math.max(texture.height, 1))
      rocketSprite.scale.set(scale)
      rocketSprite.visible = true
      rocketG.visible = false
    }).catch(() => {
      rocketSprite.visible = false
      rocketG.visible = true
    })
  }

  // Target name label (fades in as planet grows)
  const labelStyle = new TextStyle({
    fontFamily: 'Oxanium, monospace',
    fontSize: 11,
    fontWeight: '700',
    fill: 0x9becff,
    letterSpacing: 4,
  })
  const label = new Text({ text: opts.targetName.toUpperCase(), style: labelStyle })
  label.alpha = 0
  label.anchor.set(0.5, 0)
  label.x = W * 0.5
  app.stage.addChild(label)

  const kind = opts.targetKind ?? 'asteroid'
  const cx = W * 0.5
  const planetCY = H * 0.3

  return {
    update(elapsed, _dt) {
      // Stars scroll downward (rocket flying upward) — each layer at different speed for parallax.
      // Modulo H produces seamless looping since stars tile vertically.
      for (let i = 0; i < starContainers.length; i++) {
        starContainers[i].y = (elapsed * LAYER_SPEEDS[i]) % H
      }

      const progress = opts.getProgress()
      const p = Math.min(1, progress / 100)
      const minR = 6
      const maxR = Math.min(W * 0.52, H * 0.52)
      const r = minR + (maxR - minR) * Math.pow(p, 1.5)

      drawPlanet(planetG, cx, planetCY, r, kind, elapsed * 0.22)

      // label below planet, fades in past 10%
      label.y = planetCY + r + 8
      label.alpha = Math.max(0, (p - 0.1) / 0.2)

      // Rocket travels from bottom toward the planet as progress increases.
      // startY → just below the planet's current edge, eased with pow(0.6).
      const rocketStartY = H * 0.88
      const rocketEndY = planetCY + Math.max(r, 30) + 70
      const travelY = rocketStartY + (rocketEndY - rocketStartY) * Math.pow(p, 0.6)
      const bob = Math.sin(elapsed * 1.7) * 2.5
      const flicker = 0.5 + Math.sin(elapsed * 14) * 0.5
      if (renderRocket) {
        if (rocketSprite.visible) {
          rocketSprite.x = cx
          rocketSprite.y = travelY + bob
        } else {
          drawRocket(rocketG, cx, travelY + bob, flicker)
        }
      }
    },
  }
}
