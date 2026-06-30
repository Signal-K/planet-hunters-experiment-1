import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js'

export type TargetKind = 'asteroid' | 'planet' | 'moon'

export interface TransitSceneOptions {
  targetName: string
  targetKind?: TargetKind
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

function drawPlanet(g: Graphics, cx: number, cy: number, r: number, kind: TargetKind) {
  g.clear()
  if (r < 1) return

  // glow
  if (kind === 'planet') {
    g.circle(cx, cy, r + r * 0.35).fill({ color: 0x0d5e8a, alpha: 0.12 })
    g.circle(cx, cy, r + r * 0.15).fill({ color: 0x0b7ab8, alpha: 0.18 })
  } else if (kind === 'moon') {
    g.circle(cx, cy, r + r * 0.2).fill({ color: 0x556080, alpha: 0.1 })
  }

  // body
  const bodyColor = kind === 'asteroid' ? 0x3d3020 : kind === 'moon' ? 0x5a6070 : 0x1b4e70
  g.circle(cx, cy, r).fill(bodyColor)

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

  const rocketG = new Graphics()
  app.stage.addChild(rocketG)

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

      drawPlanet(planetG, cx, planetCY, r, kind)

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
      drawRocket(rocketG, cx, travelY + bob, flicker)
    },
  }
}
