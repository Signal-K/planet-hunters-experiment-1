/**
 * Pixi scene graph for the rocket launch cinematic (SSL-295).
 *
 * Starts on a visible Earth launchpad, flies the staged stack UP through the
 * sky, then inserts into parking orbit and burns for the target. Camera math
 * lives in launchCamera.ts so the "hit the top / pad shoved down" failure
 * can be unit-tested without WebGL.
 *
 * The side-view mining-ship sprite is intentionally not used here: it is a
 * single texture, so booster/stage separation cannot run, and rotated it
 * reads as a shapeless blob. Launch always uses a composed stack that
 * matches rocket-composition.ts (boosters + core + upper stage).
 *
 * SSL-455/456: the composed stack is the rocket sprites v2 sheets
 * (public/game/assets/rockets/launch). The procedural Graphics stack below
 * is the fallback when those textures fail to load.
 */
import { Application, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import {
  launchAltitude,
  launchCameraY,
  launchPadLayout,
  launchPadOffsetY,
  launchRocketScreenY,
  lerpColor,
} from './launchCamera'
import { LAUNCH_TIMELINE } from './launchTimeline'
import {
  buildHookSchedule,
  padSmokeSpawnTimes,
  prefersReducedMotion,
  type ScheduledHook,
} from './launchSpriteAnim'
import {
  FxLayer,
  createSpriteStack,
  loadLaunchSheets,
  type LaunchSheets,
  type SpriteStack,
} from './launchSprites'
import { drawPlanet } from './transitScene'

export { LAUNCH_TIMELINE, LAUNCH_W, LAUNCH_H, launchFrameDt } from './launchTimeline'
export {
  launchAltitude,
  launchAscentFrame,
  launchCameraY,
  launchPadLayout,
  launchRocketScreenY,
} from './launchCamera'

const C = {
  void: 0x0a0a0c,
  cyan: 0x70d9ea,
  cyanBright: 0xa3ecf5,
  cyanPress: 0x3fb8cc,
  amber: 0xf5a623,
  text: 0xe8e8ed,
  hull: 0xd5dde8,
  hullShade: 0x8a96a8,
  panel: 0x25252a,
  panel2: 0x303036,
  booster: 0x3a3a42,
  grass: 0x6fae63,
  dirt: 0x6f6f4e,
  dirtDark: 0x4e4e38,
  mountainFar: 0x7a8a9a,
  mountainNear: 0x5a6a78,
  pad: 0x3a3a42,
  padLite: 0x4a4a54,
  skyTop: 0x4f9bda,
  skyHorizon: 0xd5ecf7,
} as const

interface SmokeParticle {
  sprite: Sprite
  vx: number
  vy: number
  life: number
  maxLife: number
  baseScale: number
}

interface DebrisItem {
  sprite: Container
  vx: number
  vy: number
  rot: number
  life: number
}

interface CloudPuff {
  g: Graphics
  x: number
  y: number
}

function makeSoftCircleTexture(app: Application, radius: number): Texture {
  const g = new Graphics()
  const steps = 5
  for (let i = steps; i >= 1; i--) {
    const t = i / steps
    g.circle(radius, radius, radius * t).fill({ color: 0xdfe8f2, alpha: 0.16 * (1 - t) + 0.04 })
  }
  return app.renderer.generateTexture(g)
}

interface LaunchStack {
  root: Container
  boosterL: Container
  boosterR: Container
  lowerStage: Container
}

function buildLaunchStack(variant: 'explorer' | 'prospector', sheets: LaunchSheets | null): LaunchStack & { sprites: SpriteStack | null } {
  if (sheets) {
    const sprites = createSpriteStack(sheets)
    return { root: sprites.root, boosterL: sprites.boosterL, boosterR: sprites.boosterR, lowerStage: sprites.lowerStage, sprites }
  }
  return { ...buildProceduralLaunchStack(variant), sprites: null }
}

function buildProceduralLaunchStack(variant: 'explorer' | 'prospector'): LaunchStack {
  const root = new Container()
  const wide = variant === 'prospector' ? 20 : 16
  const boosterH = variant === 'prospector' ? 168 : 152

  const lowerStage = new Container()
  const core = new Graphics()
  // Core first stage. Origin is engine exit (y=0); nose is negative Y.
  core.rect(-wide, -148, wide * 2, 120).fill(C.hull)
  core.rect(-wide, -148, 5, 120).fill({ color: 0xffffff, alpha: 0.28 })
  core.rect(wide - 4, -148, 4, 120).fill({ color: C.hullShade, alpha: 0.7 })
  core.rect(-wide, -148, wide * 2, 5).fill(C.panel)
  core.rect(-wide, -34, wide * 2, 6).fill(C.cyan) // interstage / sep ring
  core.rect(-wide + 3, -110, 4, 36).fill({ color: C.cyanBright, alpha: 0.55 })
  if (variant === 'prospector') {
    core.rect(-wide, -88, wide * 2, 3).fill(C.cyanPress)
  }
  lowerStage.addChild(core)

  const fins = new Graphics()
  fins.poly([-wide, -40, -wide - 14, 4, -wide, 4]).fill(C.panel)
  fins.poly([wide, -40, wide + 14, 4, wide, 4]).fill(C.panel)
  lowerStage.addChild(fins)

  const bell = new Graphics()
  bell.poly([-wide + 2, -28, wide - 2, -28, wide + 6, 0, -wide - 6, 0]).fill(C.panel)
  bell.poly([-wide + 4, -28, wide - 4, -28, wide, -10, -wide, -10]).fill(C.panel2)
  bell.rect(-6, -18, 12, 8).fill({ color: C.cyan, alpha: 0.35 })
  lowerStage.addChild(bell)
  root.addChild(lowerStage)

  const upper = new Graphics()
  upper.rect(-wide + 1, -198, (wide - 1) * 2, 50).fill(C.hull)
  upper.rect(-wide + 1, -198, 4, 50).fill({ color: 0xffffff, alpha: 0.3 })
  upper.rect(-wide + 1, -198, (wide - 1) * 2, 3).fill(C.panel)
  upper.rect(-4, -188, 8, 18).fill({ color: C.cyanBright, alpha: 0.45 })
  // Fairing / nose
  upper.poly([-wide + 1, -198, 0, -248, wide - 1, -198]).fill(C.panel2)
  upper.poly([-6, -200, 0, -240, 6, -200]).fill({ color: C.cyanBright, alpha: 0.5 })
  root.addChild(upper)

  function makeBooster(side: 1 | -1): Graphics {
    const g = new Graphics()
    const cx = side * (wide + 12)
    g.rect(-7, -boosterH, 14, boosterH - 8).fill(C.booster)
    g.rect(-7, -boosterH, 14, 4).fill(C.hull)
    g.rect(-2, -boosterH + 16, 4, boosterH - 40).fill({ color: C.hull, alpha: 0.55 })
    g.poly([-7, -boosterH, 0, -boosterH - 22, 7, -boosterH]).fill(C.panel)
    g.poly([-7, -12, 7, -12, 9, 0, -9, 0]).fill(C.panel)
    g.x = cx
    return g
  }
  const boosterL = makeBooster(-1)
  const boosterR = makeBooster(1)
  root.addChild(boosterL)
  root.addChild(boosterR)

  return { root, boosterL, boosterR, lowerStage }
}

export function buildLaunchScene(
  app: Application,
  opts: { rocketName: string; rocketImageSrc?: string; targetName: string; onComplete: () => void },
) {
  const W = app.screen.width
  const H = app.screen.height
  const T = LAUNCH_TIMELINE
  const layout = launchPadLayout(W, H)
  const variant: 'explorer' | 'prospector' = /prospector/i.test(opts.rocketName) ? 'prospector' : 'explorer'

  const skyGfx = new Graphics()
  app.stage.addChild(skyGfx)
  const sunGfx = new Graphics()
  sunGfx.circle(W * 0.82, H * 0.12, Math.min(W, H) * 0.045).fill({ color: 0xffeb96, alpha: 0.95 })
  sunGfx.circle(W * 0.82, H * 0.12, Math.min(W, H) * 0.09).fill({ color: 0xffeb96, alpha: 0.18 })
  app.stage.addChild(sunGfx)

  function drawSky(skyT: number) {
    skyGfx.clear()
    const bands = 12
    const bandH = H / bands + 1
    for (let i = 0; i < bands; i++) {
      const localT = i / (bands - 1)
      const day = lerpColor(C.skyTop, C.skyHorizon, localT)
      skyGfx.rect(0, i * (H / bands), W, bandH).fill(lerpColor(day, C.void, skyT))
    }
  }
  drawSky(0)

  const starGfx = new Graphics()
  starGfx.alpha = 0
  app.stage.addChild(starGfx)
  const stars = Array.from({ length: 200 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.85,
    r: Math.random() * 1.4 + 0.3,
    phase: Math.random() * Math.PI * 2,
  }))

  const orbitCenter = { x: W * 0.5, y: H * 0.58 }
  const orbitRadius = Math.min(W * 0.28, H * 0.28)
  const orbitScene = new Graphics()
  orbitScene.alpha = 0
  app.stage.addChild(orbitScene)

  const padContainer = new Container()
  app.stage.addChild(padContainer)

  const mountains = new Graphics()
  const farPeaks: number[] = [0, layout.groundTop]
  const farHeights = [0.22, 0.34, 0.18, 0.40, 0.26, 0.36, 0.20, 0.32, 0.24]
  for (let i = 0; i <= 8; i++) {
    farPeaks.push((W * i) / 8, layout.groundTop - H * farHeights[i] * 0.55)
  }
  farPeaks.push(W, layout.groundTop, W, H, 0, H)
  mountains.poly(farPeaks).fill(C.mountainFar)
  const nearPeaks: number[] = [0, layout.groundTop]
  const nearHeights = [0.14, 0.22, 0.10, 0.26, 0.16, 0.20, 0.12]
  for (let i = 0; i <= 6; i++) {
    nearPeaks.push((W * i) / 6, layout.groundTop - H * nearHeights[i] * 0.42)
  }
  nearPeaks.push(W, layout.groundTop, W, H, 0, H)
  mountains.poly(nearPeaks).fill(C.mountainNear)
  padContainer.addChild(mountains)

  const groundGfx = new Graphics()
  groundGfx.rect(0, layout.groundTop, W, layout.groundHeight + 4).fill(C.dirt)
  groundGfx.rect(0, layout.groundTop, W, 14).fill(C.grass)
  groundGfx.rect(0, layout.groundTop + 14, W, 4).fill(C.dirtDark)
  const padW = Math.min(W * 0.38, 320)
  const padX = W / 2 - padW / 2
  groundGfx.rect(padX - 18, layout.padDeckY - 4, padW + 36, 22).fill(C.dirtDark)
  groundGfx.rect(padX, layout.padDeckY - 10, padW, 20).fill(C.pad)
  groundGfx.rect(padX, layout.padDeckY - 12, padW, 3).fill(C.padLite)
  groundGfx.rect(W / 2 - 16, layout.padDeckY - 4, 32, 22).fill(0x121214)
  groundGfx.rect(padX + 12, layout.padDeckY - 10, 14, 5).fill({ color: C.amber, alpha: 0.7 })
  groundGfx.rect(padX + padW - 26, layout.padDeckY - 10, 14, 5).fill({ color: C.amber, alpha: 0.7 })
  padContainer.addChild(groundGfx)

  const towerGfx = new Graphics()
  function drawTower(x: number, height: number, armDir: 1 | -1) {
    const top = layout.padDeckY - height
    towerGfx.rect(x - 5, top, 10, height).fill(C.panel)
    for (let y = top + 16; y < layout.padDeckY - 8; y += 18) {
      towerGfx.rect(x - 14, y, 28, 2).fill(C.panel2)
    }
    towerGfx.rect(x, top + height * 0.38, armDir * 36, 4).fill(C.panel2)
    towerGfx.rect(x, top + height * 0.62, armDir * 28, 3).fill(C.panel2)
    towerGfx.circle(x, top - 3, 3).fill({ color: C.amber, alpha: 0.9 })
  }
  drawTower(layout.towerLeftX, layout.towerHeight, 1)
  drawTower(layout.towerRightX, layout.towerHeight, -1)
  padContainer.addChild(towerGfx)

  const gear = new Graphics()
  gear.circle(layout.towerLeftX - 28, layout.padDeckY - 18, 14).fill(C.panel)
  gear.circle(layout.towerLeftX - 28, layout.padDeckY - 18, 10).fill(C.panel2)
  gear.rect(layout.towerRightX + 16, layout.padDeckY - 28, 22, 28).fill(C.panel)
  gear.rect(layout.towerRightX + 18, layout.padDeckY - 26, 18, 4).fill({ color: C.cyan, alpha: 0.4 })
  padContainer.addChild(gear)

  const cloudContainer = new Container()
  app.stage.addChild(cloudContainer)
  const cloudLayers: { container: Container; puffs: CloudPuff[]; speed: number; parallax: number }[] = []
  const layerDefs = [
    { count: 5, yMin: 0.42, yMax: 0.62, rMin: 28, rMax: 52, alpha: 0.72, speed: 6, parallax: 0.25 },
    { count: 4, yMin: 0.22, yMax: 0.42, rMin: 20, rMax: 36, alpha: 0.55, speed: 10, parallax: 0.45 },
    { count: 3, yMin: 0.08, yMax: 0.24, rMin: 14, rMax: 24, alpha: 0.4, speed: 14, parallax: 0.7 },
  ]
  for (const def of layerDefs) {
    const container = new Container()
    const puffs: CloudPuff[] = []
    for (let i = 0; i < def.count; i++) {
      const x = Math.random() * W
      const y = H * (def.yMin + Math.random() * (def.yMax - def.yMin))
      const r = def.rMin + Math.random() * (def.rMax - def.rMin)
      const g = new Graphics()
      g.circle(0, 0, r).fill({ color: 0xffffff, alpha: def.alpha })
      g.circle(r * 0.6, r * 0.12, r * 0.7).fill({ color: 0xffffff, alpha: def.alpha })
      g.circle(-r * 0.55, r * 0.1, r * 0.55).fill({ color: 0xf2f7ff, alpha: def.alpha * 0.9 })
      g.x = x
      g.y = y
      container.addChild(g)
      puffs.push({ g, x, y })
    }
    cloudContainer.addChild(container)
    cloudLayers.push({ container, puffs, speed: def.speed, parallax: def.parallax })
  }

  const highAtmosContainer = new Container()
  highAtmosContainer.y = H * 0.08
  highAtmosContainer.alpha = 0
  app.stage.addChild(highAtmosContainer)
  for (let i = 0; i < 6; i++) {
    const t = i / 5
    const band = new Graphics()
    band.rect(0, i * 12, W, 14).fill({ color: C.cyan, alpha: 0.28 * (1 - t) })
    highAtmosContainer.addChild(band)
  }

  const smokeTexture = makeSoftCircleTexture(app, 24)
  const smokePool: SmokeParticle[] = []
  const smokeContainer = new Container()
  app.stage.addChild(smokeContainer)

  function spawnSmoke(x: number, y: number) {
    const s = new Sprite(smokeTexture)
    s.anchor.set(0.5, 0.5)
    const scale = 0.7 + Math.random() * 0.9
    s.scale.set(scale)
    s.x = x + (Math.random() - 0.5) * 36
    s.y = y
    s.alpha = 0.75
    smokeContainer.addChild(s)
    smokePool.push({
      sprite: s,
      vx: (Math.random() - 0.5) * 28,
      vy: -12 - Math.random() * 18,
      life: 1.6 + Math.random() * 1.0,
      maxLife: 2.6,
      baseScale: scale,
    })
    if (smokePool.length > 70) {
      const old = smokePool.shift()!
      old.sprite.destroy()
    }
  }

  const rocketRoot = new Container()
  rocketRoot.x = W / 2
  rocketRoot.y = layout.rocketPadY
  rocketRoot.scale.set(layout.rocketScale)
  app.stage.addChild(rocketRoot)

  const plumeContainer = new Container()
  rocketRoot.addChildAt(plumeContainer, 0)
  const plumeGfx = new Graphics()
  plumeContainer.addChild(plumeGfx)

  // SSL-455/456: the stack mounts once the v2 sheets settle (hidden until then, so there is
  // no procedural-to-sprite pop). A failed or slow load mounts the procedural stack instead.
  const reducedMotion = prefersReducedMotion()
  let stack: LaunchStack | null = null
  let sprites: SpriteStack | null = null
  let hookSchedule: ScheduledHook[] = []
  const firedHooks = new Set<string>()
  let padFx: FxLayer | null = null
  let sepFx: FxLayer | null = null
  const padSmokeTimes = padSmokeSpawnTimes(T.ignitionStart, T.liftoff)
  let padSmokeNext = 0

  // The baked flame must not draw over the pad deck: clip everything in the rocket
  // container below the deck line while the camera is still on the pad.
  const flameMask = new Graphics()
  flameMask.rect(-W, -H * 40, W * 3, H * 40).fill(0xffffff)
  flameMask.y = layout.padDeckY
  app.stage.addChild(flameMask)
  rocketRoot.mask = flameMask
  let flameMaskOn = true

  function mountStack(sheets: LaunchSheets | null) {
    if (rocketRoot.destroyed || stack) return
    const built = buildLaunchStack(variant, sheets)
    stack = built
    sprites = built.sprites
    rocketRoot.addChild(built.root)
    if (sheets && sprites) {
      hookSchedule = buildHookSchedule(sheets.meta, T)
      padFx = new FxLayer(sheets)
      sepFx = new FxLayer(sheets)
      // Sprite sheets resolve asynchronously. Cypress can advance away from
      // the launch scene before this continuation runs, which removes the
      // root from the stage and made getChildIndex throw during M1/visual QA.
      const rootIndex = app.stage.children.indexOf(rocketRoot)
      if (rootIndex < 0) return
      const at = rootIndex + 1
      app.stage.addChildAt(padFx.container, at)
      app.stage.addChildAt(sepFx.container, at + 1)
    }
  }
  void loadLaunchSheets(variant).then(mountStack)

  const hudStyle = new TextStyle({
    fontFamily: '"Oxanium", "Turret Road", monospace',
    fontSize: 10,
    fontWeight: '800',
    fill: C.cyan,
    letterSpacing: 2,
  })
  const destLabel = new Text({ text: `TRANSIT → ${opts.targetName.toUpperCase()}`, style: hudStyle })
  destLabel.anchor.set(0.5, 0)
  destLabel.x = W / 2
  destLabel.y = H * 0.90
  destLabel.alpha = 0
  app.stage.addChild(destLabel)

  const shipLabel = new Text({
    text: opts.rocketName.toUpperCase(),
    style: new TextStyle({ ...hudStyle, fill: C.text, fontSize: 8, letterSpacing: 1.5 }),
  })
  shipLabel.anchor.set(0.5, 1)
  shipLabel.x = W / 2
  shipLabel.y = Math.max(22, H * 0.07)
  shipLabel.alpha = 0
  app.stage.addChild(shipLabel)

  const phaseLabel = new Text({
    text: 'AUTOMATED COUNTDOWN',
    style: new TextStyle({ ...hudStyle, fill: C.text, fontSize: 9, letterSpacing: 1.8 }),
  })
  phaseLabel.anchor.set(0.5, 0)
  phaseLabel.x = W / 2
  phaseLabel.y = shipLabel.y + 8
  app.stage.addChild(phaseLabel)

  const automationLabel = new Text({
    text: 'ATTITUDE  AUTO  ·  THROTTLE  AUTO  ·  STAGING  AUTO',
    style: new TextStyle({ ...hudStyle, fill: C.text, fontSize: 7, letterSpacing: 1.1 }),
  })
  automationLabel.anchor.set(0.5, 0)
  automationLabel.x = W / 2
  automationLabel.y = phaseLabel.y + 16
  automationLabel.alpha = 0.55
  app.stage.addChild(automationLabel)

  const fadeGfx = new Graphics()
  fadeGfx.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 1 })
  app.stage.addChild(fadeGfx)

  const debris: DebrisItem[] = []
  let boostersSeparated = false
  let stageSeparated = false
  let done = false
  let cloudDrift = 0

  function detachPart(part: Container, vx: number, vy: number, rot: number, life: number) {
    const worldPos = part.getGlobalPosition()
    const localPos = app.stage.toLocal(worldPos)
    if (part.parent) part.parent.removeChild(part)
    const wrap = new Container()
    wrap.addChild(part)
    part.position.set(0, 0)
    wrap.x = localPos.x
    wrap.y = localPos.y
    wrap.scale.set(layout.rocketScale)
    app.stage.addChild(wrap)
    debris.push({ sprite: wrap, vx, vy, rot, life })
  }

  // fx-sheet frames are authored at the same 2 px per author unit as the stack sheets.
  const fxScale = layout.rocketScale * 0.5

  function spawnPadSmoke() {
    if (!padFx) return
    const padW = Math.min(W * 0.38, 320)
    padFx.spawn({
      anim: 'fx/pad-smoke',
      x: W / 2 + (Math.random() - 0.5) * padW * 0.6,
      y: layout.padDeckY - 2,
      scale: fxScale * (0.85 + Math.random() * 0.5),
      vx: (Math.random() - 0.5) * 36,
      flipX: Math.random() < 0.5,
      alpha: 0.9,
    })
  }

  // Runtime copies of the fx that are also baked into the separate frames, layered on top
  // for the clamp tumble and extra debris the bake can't move.
  function spawnBoosterSepFx() {
    if (!sepFx || !sprites) return
    const s = layout.rocketScale
    const wide = sprites.authorWide
    for (const side of [-1, 1] as const) {
      const x = rocketRoot.x + side * (wide + 4) * s
      sepFx.spawn({ anim: 'fx/sep-puff', x, y: rocketRoot.y - 30 * s, scale: fxScale, vx: side * 40, vy: 55, flipX: side < 0, alpha: 0.9 })
      sepFx.spawn({ anim: 'fx/debris', x, y: rocketRoot.y - 70 * s, scale: fxScale, vx: side * 60, vy: 70 })
      sepFx.spawn({ anim: 'fx/clamp-tumble', x: rocketRoot.x + side * wide * s, y: rocketRoot.y - 60 * s, scale: fxScale, vx: side * 110, vy: 40, life: 1.1, flipX: side < 0 })
    }
  }

  function spawnStageSepFx() {
    if (!sepFx || !sprites) return
    const s = layout.rocketScale
    const wide = sprites.authorWide
    const y = rocketRoot.y - 148 * s
    sepFx.spawn({ anim: 'fx/stage-sep-flash', x: rocketRoot.x, y, scale: fxScale })
    sepFx.spawn({ anim: 'fx/debris', x: rocketRoot.x, y, scale: fxScale, vy: 90 })
    for (const side of [-1, 1] as const) {
      sepFx.spawn({ anim: 'fx/sep-puff', x: rocketRoot.x + side * (wide + 2) * s, y, scale: fxScale, vx: side * 50, vy: 90, flipX: side < 0, alpha: 0.9 })
    }
  }

  function update(elapsed: number, dt: number) {
    if (done) return

    fadeGfx.alpha = elapsed < 0.5 ? Math.max(0, 1 - elapsed / 0.5) : 0

    if (sprites) {
      for (const hook of hookSchedule) {
        if (elapsed >= hook.t && !firedHooks.has(hook.name)) {
          firedHooks.add(hook.name)
          sprites.fire(hook, reducedMotion)
        }
      }
      if (!reducedMotion) {
        sprites.tick(dt)
        padFx?.tick(dt)
        sepFx?.tick(dt)
        while (padSmokeNext < padSmokeTimes.length && elapsed >= padSmokeTimes[padSmokeNext]) {
          padSmokeNext++
          spawnPadSmoke()
        }
      }
    }

    const igniting = elapsed >= T.ignitionStart && elapsed < T.liftoff
    const flying = elapsed >= T.liftoff
    const ignitionT = Math.max(0, Math.min(1, (elapsed - T.ignitionStart) / (T.liftoff - T.ignitionStart)))
    const altitude = launchAltitude(elapsed)
    const cameraY = flying ? launchCameraY(altitude, layout.followStart) : 0

    if (!reducedMotion && (igniting || (flying && elapsed < T.liftoff + 0.5))) {
      const shakeAmt = igniting ? ignitionT * 3 : Math.max(0, 1 - (elapsed - T.liftoff) / 0.5) * 4
      rocketRoot.x = W / 2 + (Math.random() - 0.5) * shakeAmt
    } else if (elapsed < T.orbit) {
      rocketRoot.x = W / 2
    }

    const orbitActive = elapsed >= T.orbit
    padContainer.y = launchPadOffsetY(cameraY)
    smokeContainer.y = launchPadOffsetY(cameraY)
    if (padFx) padFx.container.y = padContainer.y
    flameMask.y = padContainer.y + layout.padDeckY
    highAtmosContainer.y = H * 0.08 + cameraY * 0.25
    rocketRoot.y = launchRocketScreenY(altitude, cameraY, layout.rocketPadY)

    if (orbitActive) {
      const orbitT = elapsed - T.orbit
      const departureT = Math.max(0, elapsed - T.departureBurn)
      const radius = orbitRadius + departureT * departureT * 78
      const theta = -Math.PI * 0.58 + orbitT * 1.25
      rocketRoot.scale.set(layout.rocketScale * 0.72)
      rocketRoot.x = orbitCenter.x + Math.cos(theta) * radius
      rocketRoot.y = orbitCenter.y + Math.sin(theta) * radius
      rocketRoot.rotation = theta + Math.PI / 2
      if (flameMaskOn) { rocketRoot.mask = null; flameMaskOn = false }
      padContainer.alpha = 0
      smokeContainer.alpha = 0
      cloudContainer.alpha = 0
      highAtmosContainer.alpha = 0
      sunGfx.alpha = 0
      orbitScene.alpha = Math.min(1, orbitT / 0.4)
      orbitScene.clear()
      drawPlanet(orbitScene, orbitCenter.x, orbitCenter.y, orbitRadius * 0.54, 'earth', orbitT * 0.35)
      orbitScene.circle(orbitCenter.x, orbitCenter.y, radius).stroke({ color: C.cyan, alpha: 0.28, width: 1 })
    } else {
      rocketRoot.rotation = 0
      rocketRoot.scale.set(layout.rocketScale)
      if (!flameMaskOn) { rocketRoot.mask = flameMask; flameMaskOn = true }
      padContainer.alpha = 1
      smokeContainer.alpha = 1
      orbitScene.alpha = 0
    }

    cloudDrift += dt
    for (const layer of cloudLayers) {
      layer.container.y = cameraY * layer.parallax
      for (const puff of layer.puffs) {
        puff.g.x = ((puff.x + cloudDrift * layer.speed) % (W + 120)) - 60
      }
    }

    const skyT = Math.max(0, Math.min(1, (elapsed - T.upperAtmos + 1.6) / (T.blackout - T.upperAtmos + 1.6)))
    drawSky(skyT)
    sunGfx.alpha = orbitActive ? 0 : Math.max(0, 1 - skyT * 1.4)
    cloudContainer.alpha = orbitActive ? 0 : Math.max(0, 1 - Math.max(0, (elapsed - T.liftoff - 0.4) / 2.2))
    highAtmosContainer.alpha = Math.max(0, Math.min(0.8, (elapsed - T.liftoff) / 1.6))
      * Math.max(0, 1 - (elapsed - T.upperAtmos) / 1.0)

    starGfx.alpha = Math.max(0, skyT)
    if (starGfx.alpha > 0) {
      starGfx.clear()
      for (const star of stars) {
        const twinkle = 0.6 + Math.sin(elapsed * 2.4 + star.phase) * 0.4
        starGfx.circle(star.x, star.y, star.r).fill({ color: 0xffffff, alpha: twinkle * starGfx.alpha })
      }
    }

    const plumeAlpha = orbitActive
      ? (elapsed >= T.departureBurn ? 0.75 : 0)
      : (igniting ? ignitionT * 0.7 : flying ? 0.85 : 0)
    const plumeScale = igniting ? 0.45 + ignitionT * 0.7 : flying ? 1.05 : 0
    plumeGfx.clear()
    plumeGfx.visible = !sprites // the sprite sheets bake their own flame
    if (plumeAlpha > 0 && !sprites) {
      const ph = 70 * plumeScale
      const pw = 16 * plumeScale
      plumeGfx
        .poly([-pw * 0.35, 0, pw * 0.35, 0, pw * 0.18, ph, -pw * 0.18, ph]).fill({ color: 0xe0f8ff, alpha: plumeAlpha })
        .poly([-pw * 0.7, 0, pw * 0.7, 0, pw * 0.3, ph * 1.25, -pw * 0.3, ph * 1.25]).fill({ color: C.cyan, alpha: plumeAlpha * 0.4 })
        .circle(0, ph * 0.2, pw * 0.9).fill({ color: C.amber, alpha: plumeAlpha * 0.35 })
      if (!boostersSeparated && flying) {
        plumeGfx
          .circle(-(16 + 12) * (variant === 'prospector' ? 1.1 : 1), 4, pw * 0.45).fill({ color: C.amber, alpha: plumeAlpha * 0.4 })
          .circle((16 + 12) * (variant === 'prospector' ? 1.1 : 1), 4, pw * 0.45).fill({ color: C.amber, alpha: plumeAlpha * 0.4 })
      }
    }

    const worldPlumeY = rocketRoot.y + 8
    if (!sprites && !reducedMotion && (igniting || (flying && elapsed < T.liftoff + 3.2)) && elapsed % 0.05 < dt) {
      const rate = igniting ? 1 : Math.max(0, 1 - (elapsed - T.liftoff) / 3.2)
      if (Math.random() < rate) spawnSmoke(W / 2, worldPlumeY - padContainer.y + 18 * plumeScale)
    }
    for (let i = smokePool.length - 1; i >= 0; i--) {
      const p = smokePool[i]
      p.life -= dt
      if (p.life <= 0) { p.sprite.destroy(); smokePool.splice(i, 1); continue }
      const lr = p.life / p.maxLife
      p.sprite.x += p.vx * dt
      p.sprite.y += p.vy * dt
      p.vy *= (1 - dt * 0.8)
      p.sprite.scale.set(p.baseScale * (1 + (1 - lr) * 1.5))
      p.sprite.alpha = lr * 0.55
    }

    if (!boostersSeparated && elapsed >= T.boosterSep) {
      boostersSeparated = true
      if (stack) {
        // Spin signs follow the sheet's `detach` data: tops lean outward about the nozzle.
        // (The procedural stack had them inverted, which swung the sprite tops under the core.)
        detachPart(stack.boosterL, -70, 55, -0.9, 3.4)
        detachPart(stack.boosterR, 70, 55, 0.9, 3.4)
      }
      if (sprites && !reducedMotion) spawnBoosterSepFx()
    }

    if (!stageSeparated && elapsed >= T.stageSep) {
      stageSeparated = true
      if (stack) detachPart(stack.lowerStage, (Math.random() - 0.5) * 18, 90, 0.45, 4.2)
      if (sprites && !reducedMotion) spawnStageSepFx()
    }

    for (const d of debris) {
      d.life -= dt
      d.sprite.x += d.vx * dt
      d.sprite.y += d.vy * dt
      d.sprite.rotation += d.rot * dt
      d.sprite.alpha = Math.min(1, d.life * 0.85)
    }

    if (elapsed < T.ignitionStart) {
      phaseLabel.text = `AUTOMATED COUNTDOWN · T-${Math.max(0, Math.ceil(T.ignitionStart - elapsed))}`
    } else if (elapsed < T.liftoff) {
      phaseLabel.text = 'IGNITION · GUIDANCE LOCKED'
    } else if (elapsed < T.boosterSep) {
      phaseLabel.text = 'ASCENT · BOOSTERS NOMINAL'
    } else if (elapsed < T.stageSep) {
      phaseLabel.text = 'BOOSTER SEPARATION · AUTOMATED'
    } else if (elapsed < T.orbit) {
      phaseLabel.text = 'STAGE SEPARATION · INSERTION'
    } else if (elapsed < T.departureBurn) {
      phaseLabel.text = 'EARTH ORBIT · GUIDANCE HOLD'
    } else {
      phaseLabel.text = `DEPARTURE BURN · ${opts.targetName.toUpperCase()}`
    }
    destLabel.alpha = elapsed > T.liftoff ? Math.min(1, (elapsed - T.liftoff) / 0.6) : 0
    shipLabel.alpha = elapsed > 0.8 ? Math.min(1, (elapsed - 0.8) / 0.5) : 0

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
