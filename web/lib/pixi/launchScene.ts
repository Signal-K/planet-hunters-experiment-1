/**
 * Pure scene logic for the rocket launch sequence.
 * No React, no PixiJS Application lifecycle — just scene graph construction
 * and a per-frame update function returned to the caller.
 *
 * Fully procedural: no PNG/Sprite assets. Palette matches the design tokens
 * in web/app/globals.css and the vector style established by hubScene.ts.
 */
import { Application, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'

// ─── Palette (mirrors web/app/globals.css --ln-* tokens) ──────────────────────
const C = {
  void:      0x06090f,
  bg:        0x0a121d,
  surface:   0x122236,
  surface2:  0x18304b,
  surface3:  0x1f3d5e,
  cyan:      0x3fa9ff,
  cyanBright:0x6cc2ff,
  amber:     0xf5a623,
  amberBright:0xffc25c,
  crimson:   0xc8293e,
  text:      0xe6efff,
} as const

// ─── Timeline ────────────────────────────────────────────────────────────────
export const LAUNCH_TIMELINE = {
  ignitionStart: 0.0,
  liftoff:       0.8,
  boosterSep:    2.6,
  stageSep:      4.4,
  upperAtmos:    5.5,
  blackout:      7.0,
  fadeOut:       7.8,
  done:          8.5,
}

// ─── Canvas dimensions ───────────────────────────────────────────────────────
export const LAUNCH_W = 390
export const LAUNCH_H = 780

interface SmokeParticle {
  sprite: Sprite
  vx: number; vy: number
  life: number; maxLife: number
  baseScale: number
}

interface DebrisItem {
  sprite: Container
  vx: number; vy: number; rot: number
  life: number
}

interface CloudPuff {
  g: Graphics
  x: number; y: number; r: number
}

// ─── Soft circular texture (generated once, reused by every smoke particle) ──
function makeSoftCircleTexture(app: Application, radius: number): Texture {
  const g = new Graphics()
  const steps = 5
  for (let i = steps; i >= 1; i--) {
    const t = i / steps
    g.circle(radius, radius, radius * t).fill({ color: 0xdfe8f2, alpha: 0.16 * (1 - t) + 0.04 })
  }
  return app.renderer.generateTexture(g)
}

// ─── Rocket parts ──────────────────────────────────────────────────────────
function buildRocket(): {
  root: Container
  boosterL: Graphics
  boosterR: Graphics
  lowerStage: Container
} {
  const root = new Container()

  // Lower stage (body tube + engine bell) — separates as one unit at stageSep
  const lowerStage = new Container()
  const body = new Graphics()
  body.rect(-16, -175, 32, 115).fill(C.surface2)
  body.rect(-16, -175, 32, 4).fill(C.surface3)
  body.rect(-16, -90, 32, 3).fill(C.cyan) // stripe / stage separation ring
  lowerStage.addChild(body)

  const engineBell = new Graphics()
  engineBell.poly([-14, -60, 14, -60, 20, -20, -20, -20]).fill(C.void)
  engineBell.poly([-14, -60, 14, -60, 17, -35, -17, -35]).fill(C.surface3)
  lowerStage.addChild(engineBell)
  root.addChild(lowerStage)

  // Upper body + nose cone — stays attached
  const upper = new Graphics()
  upper.rect(-16, -220, 32, 45).fill(C.surface2)
  upper.rect(-14, -218, 4, 41).fill({ color: C.cyanBright, alpha: 0.4 })
  upper.poly([-16, -220, 0, -268, 16, -220]).fill(C.surface3)
  upper.poly([-6, -222, 0, -260, 6, -222]).fill({ color: C.amber, alpha: 0.5 })
  root.addChild(upper)

  // Side boosters — each separates independently at boosterSep
  function makeBooster(side: 1 | -1): Graphics {
    const g = new Graphics()
    g.rect(-6, -175, 12, 100).fill(C.surface)
    g.rect(-6, -175, 12, 4).fill(C.surface3)
    g.poly([-6, -175, 0, -195, 6, -175]).fill(C.surface2)
    g.rect(-6, -85, 12, 20).fill(C.void)
    g.x = side * 22
    return g
  }
  const boosterL = makeBooster(-1)
  const boosterR = makeBooster(1)
  root.addChild(boosterL)
  root.addChild(boosterR)

  return { root, boosterL, boosterR, lowerStage }
}

// ─── buildLaunchScene ─────────────────────────────────────────────────────────
// Sets up the full PixiJS scene graph, returns an update(elapsed, dt) function.
// Caller owns the Application lifecycle.
export function buildLaunchScene(
  app: Application,
  opts: { rocketName: string; targetName: string; onComplete: () => void },
) {
  const W = app.screen.width
  const H = app.screen.height
  const T = LAUNCH_TIMELINE

  // ── Sky ───────────────────────────────────────────────────────────────────
  const skyGfx = new Graphics()
  app.stage.addChild(skyGfx)

  function drawSky(skyT: number) {
    // skyT: 0 = night blue (--ln-void/--ln-bg), 1 = black (space)
    const r0 = 0x06, g0 = 0x09, b0 = 0x0f
    const r = Math.round(r0 * (1 - skyT))
    const g = Math.round(g0 * (1 - skyT))
    const b = Math.round(b0 * (1 - skyT))
    skyGfx.clear().rect(0, 0, W, H).fill((r << 16) | (g << 8) | b)
  }
  drawSky(0)

  // ── Stars ─────────────────────────────────────────────────────────────────
  const starGfx = new Graphics()
  starGfx.alpha = 0
  app.stage.addChild(starGfx)
  const stars = Array.from({ length: 200 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.85,
    r: Math.random() * 1.4 + 0.3,
    phase: Math.random() * Math.PI * 2,
  }))

  // ── Launchpad ground + towers (procedural) ────────────────────────────────
  const padContainer = new Container()
  app.stage.addChild(padContainer)

  const groundGfx = new Graphics()
  groundGfx.rect(0, H - 60, W, 60).fill({ color: C.void })
  groundGfx.rect(0, H - 62, W, 2).fill({ color: C.surface3 })
  // flame trench
  groundGfx.rect(W / 2 - 14, H - 60, 28, 60).fill({ color: 0x030509 })
  // hazard stripe accents
  groundGfx.rect(W * 0.08, H - 60, 16, 6).fill({ color: C.amber, alpha: 0.6 })
  groundGfx.rect(W * 0.86, H - 60, 16, 6).fill({ color: C.amber, alpha: 0.6 })
  padContainer.addChild(groundGfx)

  const towerGfx = new Graphics()
  towerGfx.rect(W * 0.15,      H - 240, 8, 220).fill({ color: C.surface })
  towerGfx.rect(W * 0.75,      H - 260, 8, 240).fill({ color: C.surface })
  towerGfx.rect(W * 0.15 + 8,  H - 180, 40, 3).fill({ color: C.surface3 })
  towerGfx.rect(W * 0.75 - 40, H - 200, 40, 3).fill({ color: C.surface3 })
  towerGfx.circle(W * 0.15 + 4, H - 242, 3).fill({ color: C.amber, alpha: 0.9 })
  towerGfx.circle(W * 0.75 + 4, H - 262, 3).fill({ color: C.amber, alpha: 0.9 })
  padContainer.addChild(towerGfx)

  // ── Cloud layers (vector, parallax depth) ─────────────────────────────────
  const cloudContainer = new Container()
  app.stage.addChild(cloudContainer)

  const cloudLayers: { container: Container; puffs: CloudPuff[]; speed: number; parallax: number }[] = []
  const layerDefs = [
    { count: 5, yMin: 0.55, yMax: 0.82, rMin: 34, rMax: 58, color: C.surface,  alpha: 0.55, speed: 4,  parallax: 0.4 },
    { count: 4, yMin: 0.35, yMax: 0.6,  rMin: 24, rMax: 40, color: C.surface2, alpha: 0.45, speed: 7,  parallax: 0.6 },
    { count: 3, yMin: 0.15, yMax: 0.35, rMin: 16, rMax: 26, color: C.surface3, alpha: 0.35, speed: 10, parallax: 0.8 },
  ]
  for (const def of layerDefs) {
    const container = new Container()
    const puffs: CloudPuff[] = []
    for (let i = 0; i < def.count; i++) {
      const x = Math.random() * W
      const y = H * (def.yMin + Math.random() * (def.yMax - def.yMin))
      const r = def.rMin + Math.random() * (def.rMax - def.rMin)
      const g = new Graphics()
      g.circle(0, 0, r).fill({ color: def.color, alpha: def.alpha })
      g.circle(r * 0.6, r * 0.15, r * 0.7).fill({ color: def.color, alpha: def.alpha })
      g.circle(-r * 0.6, r * 0.1, r * 0.6).fill({ color: def.color, alpha: def.alpha })
      g.x = x; g.y = y
      container.addChild(g)
      puffs.push({ g, x, y, r })
    }
    cloudContainer.addChild(container)
    cloudLayers.push({ container, puffs, speed: def.speed, parallax: def.parallax })
  }

  // ── High atmosphere band (vector gradient via stacked bands) ──────────────
  const highAtmosContainer = new Container()
  highAtmosContainer.y = H * 0.12
  highAtmosContainer.alpha = 0
  app.stage.addChild(highAtmosContainer)

  const atmosBandCount = 6
  for (let i = 0; i < atmosBandCount; i++) {
    const t = i / (atmosBandCount - 1)
    const band = new Graphics()
    band.rect(0, i * (70 / atmosBandCount), W, 70 / atmosBandCount + 1)
      .fill({ color: C.cyan, alpha: 0.35 * (1 - t) })
    highAtmosContainer.addChild(band)
  }

  // ── Smoke pool ────────────────────────────────────────────────────────────
  const smokeTexture = makeSoftCircleTexture(app, 24)
  const smokePool: SmokeParticle[] = []
  const smokeContainer = new Container()
  app.stage.addChild(smokeContainer)

  function spawnSmoke(x: number, y: number) {
    const s = new Sprite(smokeTexture)
    s.anchor.set(0.5, 0.5)
    const scale = 0.6 + Math.random() * 0.8
    s.scale.set(scale)
    s.x = x + (Math.random() - 0.5) * 30
    s.y = y
    s.alpha = 0.7
    smokeContainer.addChild(s)
    smokePool.push({
      sprite: s,
      vx: (Math.random() - 0.5) * 25,
      vy: -15 - Math.random() * 20,
      life: 1.5 + Math.random() * 1.0,
      maxLife: 2.5,
      baseScale: scale,
    })
    if (smokePool.length > 60) {
      const old = smokePool.shift()!
      old.sprite.destroy()
    }
  }

  // ── Rocket ────────────────────────────────────────────────────────────────
  const rocketRoot = new Container()
  rocketRoot.x = W / 2
  rocketRoot.y = H - 100
  app.stage.addChild(rocketRoot)

  const { root: rocketVisual, boosterL, boosterR, lowerStage } = buildRocket()
  rocketRoot.addChild(rocketVisual)

  // ── Plume ─────────────────────────────────────────────────────────────────
  const plumeContainer = new Container()
  app.stage.addChildAt(plumeContainer, app.stage.children.indexOf(rocketRoot))
  const plumeGfx = new Graphics()
  plumeContainer.addChild(plumeGfx)

  // ── HUD ───────────────────────────────────────────────────────────────────
  const hudStyle = new TextStyle({
    fontFamily: '"Oxanium", "Turret Road", monospace',
    fontSize: 10, fontWeight: '800',
    fill: C.cyan, letterSpacing: 2,
  })
  const destLabel = new Text({ text: `TRANSIT → ${opts.targetName.toUpperCase()}`, style: hudStyle })
  destLabel.anchor.set(0.5, 0); destLabel.x = W / 2; destLabel.y = H * 0.88; destLabel.alpha = 0
  app.stage.addChild(destLabel)

  const shipLabel = new Text({
    text: opts.rocketName.toUpperCase(),
    style: new TextStyle({ ...hudStyle, fill: C.text, fontSize: 8, letterSpacing: 1.5 }),
  })
  shipLabel.anchor.set(0.5, 1); shipLabel.x = W / 2; shipLabel.y = H * 0.10; shipLabel.alpha = 0
  app.stage.addChild(shipLabel)

  // ── Fade overlay ──────────────────────────────────────────────────────────
  const fadeGfx = new Graphics()
  fadeGfx.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 1 })
  app.stage.addChild(fadeGfx)

  // ── Separation debris ─────────────────────────────────────────────────────
  const debris: DebrisItem[] = []
  let boostersSeparated = false
  let stageSeparated = false

  // ── Per-frame update ──────────────────────────────────────────────────────
  let rocketAltitude = 0
  let cameraY = 0
  let done = false
  let cloudDrift = 0

  function update(elapsed: number, dt: number) {
    if (done) return

    fadeGfx.alpha = elapsed < 0.5 ? Math.max(0, 1 - elapsed / 0.5) : 0

    const igniting = elapsed >= T.ignitionStart && elapsed < T.liftoff
    const flying   = elapsed >= T.liftoff
    const ignitionT = Math.max(0, Math.min(1, (elapsed - T.ignitionStart) / (T.liftoff - T.ignitionStart)))
    const accelT    = flying ? Math.min(1, (elapsed - T.liftoff) / 3.5) : 0
    const speed     = accelT * accelT * 340

    // Camera shake
    if (igniting || (flying && elapsed < T.liftoff + 0.6)) {
      const shakeAmt = igniting ? ignitionT * 3 : Math.max(0, 1 - (elapsed - T.liftoff) / 0.6) * 4
      rocketRoot.x = W / 2 + (Math.random() - 0.5) * shakeAmt
    } else {
      rocketRoot.x = W / 2
    }

    // Ascent
    if (flying) {
      rocketAltitude += speed * dt
      cameraY = Math.max(0, rocketAltitude - H * 0.7)
    }

    // Parallax
    padContainer.y       = -cameraY
    smokeContainer.y     = -cameraY
    highAtmosContainer.y = H * 0.12 - cameraY * 0.3
    rocketRoot.y         = H - 100 - rocketAltitude + cameraY

    // Cloud drift + parallax
    cloudDrift += dt
    for (let i = 0; i < cloudLayers.length; i++) {
      const layer = cloudLayers[i]
      layer.container.y = -cameraY * layer.parallax
      for (const puff of layer.puffs) {
        puff.g.x = ((puff.x + cloudDrift * layer.speed) % (W + 120)) - 60
      }
    }

    // Sky
    const skyT = Math.max(0, Math.min(1, (elapsed - T.upperAtmos) / (T.blackout - T.upperAtmos)))
    drawSky(skyT)
    cloudContainer.alpha    = Math.max(0, 1 - Math.max(0, (elapsed - 3.5) / 1.5))
    highAtmosContainer.alpha = Math.max(0, Math.min(0.8, (elapsed - 3.0) / 1.5))
      * Math.max(0, 1 - (elapsed - T.upperAtmos) / 1.0)

    // Stars
    starGfx.alpha = Math.max(0, (elapsed - T.upperAtmos) / (T.blackout - T.upperAtmos))
    if (starGfx.alpha > 0) {
      starGfx.clear()
      for (const star of stars) {
        const twinkle = 0.6 + Math.sin(elapsed * 2.4 + star.phase) * 0.4
        starGfx.circle(star.x, star.y, star.r).fill({ color: 0xffffff, alpha: twinkle * starGfx.alpha })
      }
    }

    // Plume
    const plumeAlpha = igniting ? ignitionT * 0.7 : flying ? Math.min(1, accelT + 0.3) : 0
    const plumeScale = igniting ? 0.4 + ignitionT * 0.6 : flying ? 0.8 + accelT * 0.5 : 0
    const plumeY     = rocketRoot.y + 40

    plumeGfx.clear()
    if (plumeAlpha > 0) {
      const ph = 80 * plumeScale
      const pw = 28 * plumeScale
      plumeGfx
        .rect(W / 2 - pw / 2, plumeY, pw, ph).fill({ color: 0xe0f8ff, alpha: plumeAlpha * 0.9 })
        .rect(W / 2 - pw, plumeY, pw * 2, ph * 1.3).fill({ color: C.cyan, alpha: plumeAlpha * 0.3 })
        .circle(W / 2, plumeY + ph * 0.3, pw * 1.4).fill({ color: C.amber, alpha: plumeAlpha * 0.25 })
      if (rocketAltitude < 60) {
        const glowR = (60 - rocketAltitude) * 2 * plumeScale
        plumeGfx.circle(W / 2, H - cameraY, glowR).fill({ color: C.amber, alpha: 0.18 * plumeAlpha })
      }
    }

    // Smoke
    if ((igniting || (flying && elapsed < T.liftoff + 3.5)) && elapsed % 0.06 < dt) {
      const rate = igniting ? 1 : Math.max(0, 1 - (elapsed - T.liftoff) / 3.5)
      if (Math.random() < rate) spawnSmoke(W / 2, plumeY + 30 * plumeScale)
    }
    for (let i = smokePool.length - 1; i >= 0; i--) {
      const p = smokePool[i]
      p.life -= dt
      if (p.life <= 0) { p.sprite.destroy(); smokePool.splice(i, 1); continue }
      const lr = p.life / p.maxLife
      p.sprite.x += p.vx * dt; p.sprite.y += p.vy * dt
      p.vy *= (1 - dt * 0.8)
      p.sprite.scale.set(p.baseScale * (1 + (1 - lr) * 1.5))
      p.sprite.alpha = lr * 0.55
    }

    // Booster separation — detach the real booster parts
    if (!boostersSeparated && elapsed >= T.boosterSep) {
      boostersSeparated = true
      for (const [boosterGfx, vx, rot] of [[boosterL, -55, 0.05], [boosterR, 55, -0.05]] as [Graphics, number, number][]) {
        const worldPos = boosterGfx.getGlobalPosition()
        const localPos = app.stage.toLocal(worldPos)
        rocketVisual.removeChild(boosterGfx)
        const wrap = new Container()
        wrap.addChild(boosterGfx)
        boosterGfx.position.set(0, 0)
        wrap.x = localPos.x; wrap.y = localPos.y
        app.stage.addChild(wrap)
        debris.push({ sprite: wrap, vx, vy: 30, rot, life: 3 })
      }
    }

    // Stage separation — detach the real lower-stage part
    if (!stageSeparated && elapsed >= T.stageSep) {
      stageSeparated = true
      const worldPos = lowerStage.getGlobalPosition()
      const localPos = app.stage.toLocal(worldPos)
      rocketVisual.removeChild(lowerStage)
      const wrap = new Container()
      wrap.addChild(lowerStage)
      lowerStage.position.set(0, 0)
      wrap.x = localPos.x; wrap.y = localPos.y
      app.stage.addChild(wrap)
      debris.push({ sprite: wrap, vx: (Math.random() - 0.5) * 15, vy: 70, rot: 0.02, life: 4 })
    }

    // Debris motion
    for (const d of debris) {
      d.life -= dt
      d.sprite.x += d.vx * dt; d.sprite.y += d.vy * dt
      d.sprite.rotation += d.rot
      d.sprite.alpha = Math.min(1, d.life * 0.8)
    }

    // HUD
    destLabel.alpha = elapsed > 1.2 ? Math.min(1, (elapsed - 1.2) / 0.6) : 0
    shipLabel.alpha = elapsed > 0.8 ? Math.min(1, (elapsed - 0.8) / 0.5) : 0

    // Fade out
    if (elapsed >= T.fadeOut) {
      fadeGfx.alpha = Math.min(1, (elapsed - T.fadeOut) / (T.done - T.fadeOut))
    }
    if (elapsed >= T.done && !done) {
      done = true
      opts.onComplete()
    }
  }

  return { update }
}
