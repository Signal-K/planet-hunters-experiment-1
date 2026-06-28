/**
 * Pure scene logic for the rocket launch sequence.
 * No React, no PixiJS Application lifecycle — just scene graph construction
 * and a per-frame update function returned to the caller.
 */
import { Application, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'

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

// ─── Texture bag (all nullable — scene uses procedural fallbacks) ─────────────
export interface LaunchTextures {
  body:       Texture | null
  nose:       Texture | null
  boosterL:   Texture | null
  stageLower: Texture | null
  engineBell: Texture | null
  plumeCore:  Texture | null
  plumeOuter: Texture | null
  smoke:      Texture | null
  bgPad:      Texture | null
  bgClouds:   Texture | null
  bgHighAtmos:Texture | null
}

interface SmokeParticle {
  sprite: Sprite
  vx: number; vy: number
  life: number; maxLife: number
  baseScale: number
}

interface DebrisItem {
  sprite: Sprite | Container
  vx: number; vy: number; rot: number
  life: number
}

// ─── buildLaunchScene ─────────────────────────────────────────────────────────
// Sets up the full PixiJS scene graph, returns an update(elapsed, dt) function
// and a destroy() for cleanup. Caller owns the Application lifecycle.
export function buildLaunchScene(
  app: Application,
  tex: LaunchTextures,
  opts: { rocketName: string; targetName: string; onComplete: () => void },
) {
  const W = LAUNCH_W
  const H = LAUNCH_H
  const T = LAUNCH_TIMELINE

  // ── Sky ───────────────────────────────────────────────────────────────────
  const skyGfx = new Graphics()
  app.stage.addChild(skyGfx)

  function drawSky(progress: number) {
    const upper = Math.min(1, progress / 0.8)
    const strips = 32
    skyGfx.clear()
    for (let i = 0; i < strips; i++) {
      const frac = i / strips
      const r = Math.round((6  + (10 - 6)  * frac) * (1 - upper))
      const g = Math.round((12 + (24 - 12) * frac) * (1 - upper))
      const b = Math.round((28 + (60 - 28) * frac) * (1 - upper))
      const color = (r << 16) | (g << 8) | b
      skyGfx.rect(0, (i / strips) * H, W, H / strips + 1).fill({ color })
    }
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

  // ── Launchpad background ──────────────────────────────────────────────────
  const padContainer = new Container()
  app.stage.addChild(padContainer)

  if (tex.bgPad) {
    const s = new Sprite(tex.bgPad)
    s.width = W; s.height = 120; s.y = H - 120
    padContainer.addChild(s)
  }

  // Procedural launchpad ground + towers (always rendered under/over bg sprite)
  const groundGfx = new Graphics()
  groundGfx.rect(0, H - 60, W, 60).fill({ color: 0x0a1628 })
  groundGfx.rect(0, H - 62, W, 2).fill({ color: 0x1a3a5e })
  padContainer.addChild(groundGfx)

  const towerGfx = new Graphics()
  towerGfx.rect(W * 0.15,      H - 240, 8, 220).fill({ color: 0x1a2d42 })
  towerGfx.rect(W * 0.75,      H - 260, 8, 240).fill({ color: 0x1a2d42 })
  towerGfx.rect(W * 0.15 + 8,  H - 180, 40, 3).fill({ color: 0x1e3a52 })
  towerGfx.rect(W * 0.75 - 40, H - 200, 40, 3).fill({ color: 0x1e3a52 })
  towerGfx.circle(W * 0.15 + 4, H - 242, 3).fill({ color: 0xf5a623, alpha: 0.9 })
  towerGfx.circle(W * 0.75 + 4, H - 262, 3).fill({ color: 0xf5a623, alpha: 0.9 })
  padContainer.addChild(towerGfx)

  // ── Cloud layers ──────────────────────────────────────────────────────────
  const cloudContainer = new Container()
  cloudContainer.y = H * 0.35
  app.stage.addChild(cloudContainer)

  if (tex.bgClouds) {
    const c1 = new Sprite(tex.bgClouds); c1.width = W; c1.height = 90
    const c2 = new Sprite(tex.bgClouds); c2.width = W; c2.height = 90; c2.x = W
    cloudContainer.addChild(c1, c2)
  } else {
    for (let i = 0; i < 6; i++) {
      const cg = new Graphics()
      cg.circle((i / 6) * W + 20, Math.random() * 30, 20 + Math.random() * 30)
        .fill({ color: 0x1a2a4e, alpha: 0.7 })
      cloudContainer.addChild(cg)
    }
  }

  // ── High atmosphere ───────────────────────────────────────────────────────
  const highAtmosContainer = new Container()
  highAtmosContainer.y = H * 0.12
  highAtmosContainer.alpha = 0
  app.stage.addChild(highAtmosContainer)

  if (tex.bgHighAtmos) {
    const ha = new Sprite(tex.bgHighAtmos); ha.width = W; ha.height = 70
    highAtmosContainer.addChild(ha)
  }

  // ── Smoke pool ────────────────────────────────────────────────────────────
  const smokePool: SmokeParticle[] = []
  const smokeContainer = new Container()
  app.stage.addChild(smokeContainer)

  function spawnSmoke(x: number, y: number) {
    const s = tex.smoke ? new Sprite(tex.smoke) : (() => {
      const p = new Sprite(Texture.WHITE)
      p.tint = 0x2a3a4e; p.width = 24; p.height = 24; p.anchor.set(0.5, 0.5)
      return p
    })()
    if (tex.smoke) (s as Sprite).anchor.set(0.5, 0.5)
    const scale = 0.4 + Math.random() * 0.6
    s.scale.set(scale)
    s.x = x + (Math.random() - 0.5) * 30
    s.y = y
    s.alpha = 0.7
    smokeContainer.addChild(s)
    smokePool.push({
      sprite: s as Sprite,
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

  // ── Rocket (single sprite — stageLower is the best full-rocket art) ─────────
  // Only stageLower and body have black backgrounds suitable for screen blending.
  // All other assets (nose, boosterL, engineBell) have white/grey bgs and must not be used.
  const rocketRoot = new Container()
  rocketRoot.x = W / 2
  rocketRoot.y = H - 100
  app.stage.addChild(rocketRoot)

  const rocketTex = tex.stageLower ?? tex.body
  if (rocketTex) {
    const rocketImg = new Sprite(rocketTex)
    rocketImg.anchor.set(0.5, 1)
    rocketImg.width = 88
    rocketImg.height = 240
    rocketImg.blendMode = 'screen'
    rocketRoot.addChild(rocketImg)
  } else {
    // Procedural fallback: blue silhouette
    const g = new Graphics()
    g.rect(-16, -220, 32, 220).fill(0x1e3a5a)
    g.poly([-16, -220, 0, -268, 16, -220]).fill(0x2a4d6e)
    g.rect(-26, -175, 10, 115).fill(0x142236)
    g.rect(16, -175, 10, 115).fill(0x142236)
    rocketRoot.addChild(g)
  }

  // Procedural debris shapes (replace sprite-based debris from old multi-part assembly)
  function makeDebrisRect(color: number, w: number, h: number): Graphics {
    const g = new Graphics()
    g.rect(-w / 2, -h / 2, w, h).fill({ color, alpha: 0.85 })
    return g
  }

  // ── Plume ─────────────────────────────────────────────────────────────────
  const plumeContainer = new Container()
  app.stage.addChildAt(plumeContainer, app.stage.children.indexOf(rocketRoot))
  const plumeGfx = new Graphics()

  const plumeOuter = tex.plumeOuter ? (() => {
    const s = new Sprite(tex.plumeOuter!)
    s.anchor.set(0.5, 0); s.width = 80; s.height = 120; s.alpha = 0
    plumeContainer.addChild(s); return s
  })() : null

  const plumeCore = tex.plumeCore ? (() => {
    const s = new Sprite(tex.plumeCore!)
    s.anchor.set(0.5, 0); s.width = 36; s.height = 90; s.alpha = 0
    plumeContainer.addChild(s); return s
  })() : null

  plumeContainer.addChild(plumeGfx)

  // ── HUD ───────────────────────────────────────────────────────────────────
  const hudStyle = new TextStyle({
    fontFamily: '"Oxanium", "Turret Road", monospace',
    fontSize: 10, fontWeight: '800',
    fill: 0x3fa9ff, letterSpacing: 2,
  })
  const destLabel = new Text({ text: `TRANSIT → ${opts.targetName.toUpperCase()}`, style: hudStyle })
  destLabel.anchor.set(0.5, 0); destLabel.x = W / 2; destLabel.y = H * 0.88; destLabel.alpha = 0
  app.stage.addChild(destLabel)

  const shipLabel = new Text({
    text: opts.rocketName.toUpperCase(),
    style: new TextStyle({ ...hudStyle, fill: 0xe6efff, fontSize: 8, letterSpacing: 1.5 }),
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
    cloudContainer.y     = H * 0.35 - cameraY * 0.55
    highAtmosContainer.y = H * 0.12 - cameraY * 0.3
    rocketRoot.y         = H - 100 - rocketAltitude + cameraY

    // Sky
    const skyT = Math.max(0, Math.min(1, (elapsed - T.upperAtmos) / (T.blackout - T.upperAtmos)))
    drawSky(skyT)
    cloudContainer.alpha     = Math.max(0, 1 - Math.max(0, (elapsed - 3.5) / 1.5))
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
        .rect(W / 2 - pw, plumeY, pw * 2, ph * 1.3).fill({ color: 0x3fa9ff, alpha: plumeAlpha * 0.3 })
        .circle(W / 2, plumeY + ph * 0.3, pw * 1.4).fill({ color: 0xf5a623, alpha: plumeAlpha * 0.25 })
      if (rocketAltitude < 60) {
        const glowR = (60 - rocketAltitude) * 2 * plumeScale
        plumeGfx.circle(W / 2, H - cameraY, glowR).fill({ color: 0xf5a623, alpha: 0.18 * plumeAlpha })
      }
    }

    if (plumeOuter) { plumeOuter.alpha = plumeAlpha * 0.7; plumeOuter.scale.set(plumeScale); plumeOuter.y = plumeY }
    if (plumeCore)  { plumeCore.alpha  = plumeAlpha;       plumeCore.scale.set(plumeScale * 0.8); plumeCore.y = plumeY }

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

    // Booster separation — procedural debris rectangles
    if (!boostersSeparated && elapsed >= T.boosterSep) {
      boostersSeparated = true
      for (const [vx, vy, rot] of [[-55, 30, 0.05], [55, 30, -0.05]] as [number, number, number][]) {
        const d = makeDebrisRect(0x2a4060, 10, 60)
        d.x = rocketRoot.x + vx * 0.15
        d.y = rocketRoot.y - 80
        app.stage.addChild(d)
        debris.push({ sprite: d, vx, vy, rot, life: 3 })
      }
    }

    // Stage separation — procedural debris
    if (!stageSeparated && elapsed >= T.stageSep) {
      stageSeparated = true
      const lower = makeDebrisRect(0x1e3250, 32, 55)
      lower.x = rocketRoot.x; lower.y = rocketRoot.y - 10
      app.stage.addChild(lower)
      debris.push({ sprite: lower, vx: (Math.random() - 0.5) * 15, vy: 70, rot: 0.02, life: 4 })
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
