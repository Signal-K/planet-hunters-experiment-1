import { Application, Graphics, Container } from 'pixi.js'

export interface RoverSceneOptions {
  targetName: string
  minerals: string[]
  mineralColors: Record<string, string>
  getDone: () => boolean
  getJoystick: () => { dx: number; dy: number }
}

export interface RoverScene {
  update(elapsed: number, dt: number): void
}

const SURFACE_COLOR = 0x2a1e0a
const SURFACE_RIDGE_COLOR = 0x3d2d10
const SKY_COLOR = 0x010408
const DUST_COLOR = 0x8b6030

interface DustParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  r: number
}

function buildStarfield(W: number, H: number, surfaceY: number): Graphics {
  const g = new Graphics()
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * W
    const y = Math.random() * (surfaceY - 20)
    const r = 0.3 + Math.random() * 0.9
    const alpha = 0.15 + Math.random() * 0.6
    g.circle(x, y, r).fill({ color: 0xffffff, alpha })
  }
  return g
}

function buildHorizonGlow(W: number, surfaceY: number): Graphics {
  const g = new Graphics()
  // Subtle horizon haze
  g.rect(0, surfaceY - 18, W, 18).fill({ color: 0x3d2010, alpha: 0.4 })
  g.rect(0, surfaceY - 8, W, 8).fill({ color: 0x5a3015, alpha: 0.5 })
  return g
}

function buildSurface(W: number, surfaceY: number, H: number): Graphics {
  const g = new Graphics()
  const ridges = [0, -8, -14, -6, -18, -10, -5, -15, -11, -7, -16, -9, -19, -4, -12]
  const pts: number[] = [0, H]
  for (let x = 0; x <= W; x += 24) {
    pts.push(x, surfaceY + ridges[Math.floor(x / 24) % ridges.length])
  }
  pts.push(W, H)
  g.poly(pts).fill(SURFACE_COLOR)

  // Ridge highlight layer
  const pts2: number[] = []
  for (let x = 0; x <= W; x += 24) {
    pts2.push(x, surfaceY + ridges[Math.floor(x / 24) % ridges.length] - 2)
  }
  g.poly([...pts2, W, surfaceY, 0, surfaceY]).fill({ color: SURFACE_RIDGE_COLOR, alpha: 0.6 })

  // Surface rocks
  const rocks = [[40, -4, 6, 4], [110, -2, 4, 3], [190, -6, 8, 5], [260, -3, 5, 4], [320, -5, 7, 4]]
  for (const [rx, ry, rw, rh] of rocks) {
    g.ellipse(rx, surfaceY + ry, rw, rh).fill({ color: 0x1e1206, alpha: 0.8 })
  }
  return g
}

function drawRover(g: Graphics, x: number, y: number, speed: number, elapsed: number, done: boolean) {
  g.clear()
  const color = done ? 0x4ade80 : 0x9becff
  const wheelBob = Math.sin(elapsed * 8 + x * 0.05) * (Math.abs(speed) > 0.05 ? 1.5 : 0)

  // Wheels
  const wRadius = 7
  g.circle(x - 12, y + 4 + wheelBob, wRadius).fill({ color: 0x334455, alpha: 0.9 })
  g.circle(x + 12, y + 4 - wheelBob, wRadius).fill({ color: 0x334455, alpha: 0.9 })
  g.circle(x - 12, y + 4 + wheelBob, wRadius - 3).fill({ color: 0x556677, alpha: 0.6 })
  g.circle(x + 12, y + 4 - wheelBob, wRadius - 3).fill({ color: 0x556677, alpha: 0.6 })

  // Axle
  g.rect(x - 12, y + 3, 24, 2).fill({ color: 0x4a5a6a, alpha: 0.8 })

  // Body
  g.rect(x - 14, y - 10, 28, 14).fill(0x1a2a3a)
  g.rect(x - 12, y - 8, 24, 10).fill(0x223344)
  // Body highlight
  g.rect(x - 11, y - 8, 22, 2).fill({ color: color, alpha: 0.2 })

  // Solar panel / scanner arm
  g.rect(x - 2, y - 18, 4, 10).fill(0x4a5a6a)
  g.rect(x - 10, y - 20, 20, 4).fill({ color: done ? 0x4ade80 : 0x1155aa, alpha: 0.85 })
  g.rect(x - 10, y - 20, 20, 1).fill({ color: 0x88ccff, alpha: 0.4 })

  // Status light
  g.circle(x + 10, y - 6, 2).fill({ color: done ? 0x4ade80 : 0xffaa00, alpha: 0.9 })

  // Drill arm (extends down when drilling, i.e. not moving much)
  if (Math.abs(speed) < 0.1) {
    const drillY = y + 14 + Math.sin(elapsed * 6) * 2
    g.rect(x - 1, y + 4, 2, drillY - (y + 4)).fill({ color: color, alpha: 0.5 })
    g.circle(x, drillY, 3).fill({ color: color, alpha: 0.7 })
    // drill vibration circle
    g.circle(x, drillY, 3 + Math.sin(elapsed * 20) * 1.5).stroke({ color, alpha: 0.3, width: 1 })
  }
}

export function buildRoverScene(app: Application, opts: RoverSceneOptions): RoverScene {
  const W = app.screen.width
  const H = app.screen.height
  const surfaceY = H * 0.62

  // Sky gradient bg
  const skyG = new Graphics()
  skyG.rect(0, 0, W, H).fill(SKY_COLOR)
  app.stage.addChild(skyG)

  app.stage.addChild(buildStarfield(W, H, surfaceY))
  app.stage.addChild(buildHorizonGlow(W, surfaceY))
  app.stage.addChild(buildSurface(W, surfaceY, H))

  // Ore indicators at surface
  const oreG = new Graphics()
  const orePositions = opts.minerals.slice(0, 4).map((mineral, i) => ({
    x: 60 + i * 70 + Math.random() * 30,
    mineral,
    color: parseInt((opts.mineralColors[mineral] ?? '#888888').slice(1), 16),
  }))
  for (const ore of orePositions) {
    oreG.circle(ore.x, surfaceY - 2, 4).fill({ color: ore.color, alpha: 0.7 })
    oreG.circle(ore.x, surfaceY - 2, 6).stroke({ color: ore.color, alpha: 0.3, width: 1 })
  }
  app.stage.addChild(oreG)

  // Dust particles container
  const dustC = new Container()
  app.stage.addChild(dustC)
  const dustG = new Graphics()
  dustC.addChild(dustG)
  const particles: DustParticle[] = []

  const roverG = new Graphics()
  app.stage.addChild(roverG)

  let roverX = W * 0.35
  const roverY = surfaceY - 14
  let roverVx = 0

  function spawnDust(x: number, dir: number) {
    if (particles.length > 30) return
    for (let i = 0; i < 3; i++) {
      particles.push({
        x,
        y: roverY + 10,
        vx: -dir * (1 + Math.random() * 2) + (Math.random() - 0.5),
        vy: -(0.5 + Math.random() * 1.5),
        life: 0,
        maxLife: 0.4 + Math.random() * 0.4,
        r: 1 + Math.random() * 2,
      })
    }
  }

  return {
    update(elapsed, dt) {
      const { dx } = opts.getJoystick()
      const done = opts.getDone()

      // Physics
      const targetVx = dx * 80
      roverVx += (targetVx - roverVx) * Math.min(1, dt * 5)
      roverX = Math.max(24, Math.min(W - 24, roverX + roverVx * dt))

      // Spawn dust when moving
      if (Math.abs(roverVx) > 8 && Math.random() < 0.35) {
        spawnDust(roverX - Math.sign(roverVx) * 14, Math.sign(roverVx))
      }

      // Update/draw dust
      dustG.clear()
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life += dt
        if (p.life > p.maxLife) { particles.splice(i, 1); continue }
        p.x += p.vx
        p.y += p.vy
        p.vy += dt * 2  // gravity
        const alpha = (1 - p.life / p.maxLife) * 0.55
        dustG.circle(p.x, p.y, p.r).fill({ color: DUST_COLOR, alpha })
      }

      drawRover(roverG, roverX, roverY, roverVx / 80, elapsed, done)

      // Done glow
      if (done) {
        roverG.circle(roverX, roverY - 6, 20).stroke({ color: 0x4ade80, alpha: 0.15 + Math.sin(elapsed * 3) * 0.08, width: 2 })
      }
    },
  }
}
