/**
 * Hub screen building scene — pure PixiJS scene logic, no React lifecycle.
 * Builds procedural Graphics for each structure type; sprite textures slot in
 * when available (all texture fields are nullable for graceful fallback).
 *
 * Coordinate convention: (0, 0) = center of building base (ground contact point).
 * Buildings extend upward (negative y). Caller positions the container.
 */
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'

// ─── Canvas dimensions (portrait canvas max) ─────────────────────────────────
export const HUB_W = 402
export const HUB_H = 874

// Ground y in PixiJS canvas coordinates (22% from bottom)
export const GROUND_Y = HUB_H * (1 - 0.22)

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  hull:    0x1e2d3d,
  panel:   0x2c4a6b,
  panelLt: 0x3a5e82,
  cyan:    0x00e5ff,
  cyanDim: 0x4ab8c1,
  amber:   0xf5a623,
  green:   0x39d36a,
  concrete:0x2a3a4a,
  dark:    0x0e1c2e,
  stripe:  0xd68a0d,
} as const

// ─── Texture bag ──────────────────────────────────────────────────────────────
export interface HubTextures {
  pad_base:       Texture | null
  pad_tower:      Texture | null
  pad_gantry:     Texture | null
  cmd_foundation: Texture | null
  cmd_building:   Texture | null
  cmd_antenna:    Texture | null
  depot_base:     Texture | null
  depot_tank:     Texture | null
  depot_pipes:    Texture | null
  scan_tripod:    Texture | null
  scan_dish:      Texture | null
}

export function nullTextures(): HubTextures {
  return {
    pad_base: null, pad_tower: null, pad_gantry: null,
    cmd_foundation: null, cmd_building: null, cmd_antenna: null,
    depot_base: null, depot_tank: null, depot_pipes: null,
    scan_tripod: null, scan_dish: null,
  }
}

// ─── Building renderers ───────────────────────────────────────────────────────

function makeSprite(tex: Texture | null, w: number, h: number, anchorX = 0.5, anchorY = 1.0): Sprite | null {
  if (!tex) return null
  const s = new Sprite(tex)
  s.width = w; s.height = h
  s.anchor.set(anchorX, anchorY)
  return s
}

function buildLaunchpad(hot: boolean, tex: HubTextures): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  // ── Base platform (128×20) ─────────────────────────────────────────────────
  const base = makeSprite(tex.pad_base, 128, 20)
  if (base) {
    root.addChild(base)
  } else {
    const g = new Graphics()
    g.rect(-64, -20, 128, 12).fill(C.concrete)
    g.rect(-60, -8,  120, 8).fill(C.panel)
    // flame trench slot
    g.rect(-16, -20, 32, 12).fill(C.dark)
    // corner hazard stripes
    g.rect(-64, -8, 12, 8).fill(C.stripe)
    g.rect(52, -8, 12, 8).fill(C.stripe)
    root.addChild(g)
  }

  // ── Support tower (16×140 centered at x=-30) ───────────────────────────────
  const tower = makeSprite(tex.pad_tower, 20, 140, 0.5, 1.0)
  if (tower) {
    tower.x = -30; root.addChild(tower)
  } else {
    const g = new Graphics()
    g.rect(-40, -140, 20, 140).fill(C.hull)
    g.rect(-38, -138, 6, 130).fill(C.panelLt)
    // ladder rungs
    for (let y = -130; y < -20; y += 16) {
      g.rect(-34, y, 14, 2).fill(C.cyanDim)
    }
    // crossbrace
    g.rect(-40, -100, 20, 4).fill(C.panel)
    g.rect(-40, -60, 20, 4).fill(C.panel)
    root.addChild(g)
  }

  // ── Gantry arm (horizontal, x=-30 to x=+30, at y=-130) ───────────────────
  const gantry = makeSprite(tex.pad_gantry, 70, 14, 0, 0.5)
  if (gantry) {
    gantry.x = -40; gantry.y = -136; root.addChild(gantry)
  } else {
    const g = new Graphics()
    g.rect(-40, -140, 70, 10).fill(C.panel)
    g.rect(28, -145, 4, 20).fill(C.hull)    // gantry tip
    g.rect(-42, -136, 6, 8).fill(C.panelLt) // connector
    root.addChild(g)
  }

  // ── Status beacon ──────────────────────────────────────────────────────────
  const beacon = new Graphics()
  beacon.circle(-30, -148, 4).fill(hot ? C.amber : C.green)
  beacon.x = 0; beacon.y = 0
  root.addChild(beacon)

  if (hot) {
    const glow = new Graphics()
    glow.circle(-30, -148, 14).fill({ color: C.amber, alpha: 0.2 })
    root.addChild(glow)
    anims.push({ kind: 'pulse', obj: glow, speed: 2.2, phase: 0 })
  }

  // ── Cyan trim strips ───────────────────────────────────────────────────────
  const trim = new Graphics()
  trim.rect(-40, -22, 20, 2).fill({ color: C.cyan, alpha: 0.7 })
  trim.rect(-40, -80, 2, 60).fill({ color: C.cyan, alpha: 0.5 })
  root.addChild(trim)

  return { root, animatables: anims }
}

function buildCommandCenter(tex: HubTextures): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  // ── Foundation ─────────────────────────────────────────────────────────────
  const fnd = makeSprite(tex.cmd_foundation, 96, 14)
  if (fnd) {
    root.addChild(fnd)
  } else {
    const g = new Graphics()
    g.rect(-48, -14, 96, 14).fill(C.concrete)
    g.rect(-44, -8, 88, 8).fill(C.hull)
    root.addChild(g)
  }

  // ── Main building ──────────────────────────────────────────────────────────
  const bld = makeSprite(tex.cmd_building, 88, 90, 0.5, 1.0)
  if (bld) {
    bld.y = -14; root.addChild(bld)
  } else {
    const g = new Graphics()
    // main block
    g.rect(-44, -104, 88, 90).fill(C.hull)
    // panel lines
    g.rect(-42, -102, 84, 2).fill(C.panelLt)
    g.rect(-42, -70, 84, 2).fill(C.panelLt)
    // windows (2 rows)
    for (let i = 0; i < 3; i++) {
      g.rect(-30 + i * 20, -92, 12, 16).fill(C.cyanDim)
      g.rect(-30 + i * 20, -62, 12, 12).fill({ color: C.cyanDim, alpha: 0.6 })
    }
    // door
    g.rect(-10, -34, 20, 34).fill(C.dark)
    g.rect(-8, -32, 16, 32).fill(C.panel)
    root.addChild(g)
  }

  // ── Antenna array ──────────────────────────────────────────────────────────
  const ant = makeSprite(tex.cmd_antenna, 60, 40, 0.5, 1.0)
  if (ant) {
    ant.y = -104; root.addChild(ant)
  } else {
    const g = new Graphics()
    // dish
    g.ellipse(20, -120, 18, 10).fill({ color: C.cyanDim, alpha: 0.8 })
    g.rect(16, -130, 8, 12).fill(C.hull)
    // mast
    g.rect(-2, -140, 4, 36).fill(C.panelLt)
    // cross piece
    g.rect(-14, -128, 28, 3).fill(C.hull)
    root.addChild(g)
  }

  // ── Status blink light ─────────────────────────────────────────────────────
  const light = new Graphics()
  light.circle(-2, -142, 3).fill(C.amber)
  root.addChild(light)
  anims.push({ kind: 'blink', obj: light, speed: 1.4, phase: 0 })

  // ── Cyan trim ──────────────────────────────────────────────────────────────
  const trim = new Graphics()
  trim.rect(-44, -104, 88, 3).fill({ color: C.cyan, alpha: 0.6 })
  trim.rect(-44, -14, 88, 3).fill({ color: C.cyan, alpha: 0.4 })
  root.addChild(trim)

  return { root, animatables: anims }
}

function buildRefinery(tex: HubTextures): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  // ── Foundation ─────────────────────────────────────────────────────────────
  const fnd = makeSprite(tex.depot_base, 88, 12)
  if (fnd) {
    root.addChild(fnd)
  } else {
    const g = new Graphics()
    g.rect(-44, -12, 88, 12).fill(C.concrete)
    root.addChild(g)
  }

  // ── Main body ──────────────────────────────────────────────────────────────
  const body = makeSprite(tex.depot_tank, 88, 60, 0.5, 1.0)
  if (body) {
    body.y = -12; root.addChild(body)
  } else {
    const g = new Graphics()
    g.rect(-44, -72, 88, 60).fill(C.hull)
    g.rect(-42, -70, 84, 2).fill(C.panelLt)
    g.rect(-42, -40, 84, 2).fill(C.panelLt)
    // pipes
    g.rect(-44, -55, 88, 6).fill(C.panel)
    root.addChild(g)
  }

  // ── Left chimney ───────────────────────────────────────────────────────────
  const pipes = makeSprite(tex.depot_pipes, 60, 70, 0.5, 1.0)
  if (pipes) {
    pipes.y = -72; root.addChild(pipes)
  } else {
    const g = new Graphics()
    g.rect(-30, -140, 14, 70).fill(C.panelLt)
    g.rect(16, -120, 14, 50).fill(C.panelLt)
    // caps
    g.rect(-34, -140, 22, 6).fill(C.hull)
    g.rect(12, -120, 22, 6).fill(C.hull)
    // connector pipe
    g.rect(-30, -100, 60, 8).fill(C.panel)
    root.addChild(g)
  }

  // ── Amber vent lights ──────────────────────────────────────────────────────
  const v1 = new Graphics()
  v1.circle(-23, -142, 4).fill(C.amber)
  root.addChild(v1)
  anims.push({ kind: 'pulse', obj: v1, speed: 3.1, phase: 0 })

  const v2 = new Graphics()
  v2.circle(23, -122, 4).fill(C.amber)
  root.addChild(v2)
  anims.push({ kind: 'pulse', obj: v2, speed: 3.1, phase: Math.PI })

  // ── Cyan trim ──────────────────────────────────────────────────────────────
  const trim = new Graphics()
  trim.rect(-44, -72, 88, 3).fill({ color: C.cyan, alpha: 0.5 })
  root.addChild(trim)

  return { root, animatables: anims }
}

function buildScanStation(hot: boolean, tex: HubTextures): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  // ── Tripod base ────────────────────────────────────────────────────────────
  const tripod = makeSprite(tex.scan_tripod, 80, 60, 0.5, 1.0)
  if (tripod) {
    root.addChild(tripod)
  } else {
    const g = new Graphics()
    // leg spread
    g.poly([-40, 0, 0, -60, 40, 0]).fill(C.hull)
    g.poly([-40, 0, -2, -58, -38, 0]).fill(C.panel)
    // legs
    g.rect(-2, -60, 4, 60).fill(C.panelLt)
    g.rect(-40, -4, 6, 4).fill(C.panelLt)
    g.rect(34, -4, 6, 4).fill(C.panelLt)
    root.addChild(g)
  }

  // ── Dish ───────────────────────────────────────────────────────────────────
  const dish = makeSprite(tex.scan_dish, 70, 50, 0.5, 1.0)
  if (dish) {
    dish.y = -60; dish.rotation = -0.3; root.addChild(dish)
  } else {
    const g = new Graphics()
    // dish bowl (ellipse tilted)
    g.ellipse(6, -90, 36, 22).fill({ color: C.cyanDim, alpha: 0.85 })
    g.ellipse(6, -90, 34, 20).fill({ color: C.dark, alpha: 0.6 })
    // ribs
    for (let i = -3; i <= 3; i++) {
      g.rect(6 + i * 10 - 1, -108, 2, 36).fill({ color: C.cyan, alpha: 0.3 })
    }
    // arm/mount
    g.rect(-2, -82, 4, 22).fill(C.panelLt)
    root.addChild(g)
  }

  // ── Status light ───────────────────────────────────────────────────────────
  const beacon = new Graphics()
  beacon.circle(0, -60, 3).fill(hot ? C.amber : C.green)
  root.addChild(beacon)
  anims.push({ kind: 'blink', obj: beacon, speed: hot ? 4.0 : 1.0, phase: 0 })

  // ── Cyan trim ──────────────────────────────────────────────────────────────
  const trim = new Graphics()
  trim.rect(-42, -4, 84, 2).fill({ color: C.cyan, alpha: 0.4 })
  root.addChild(trim)

  return { root, animatables: anims }
}

// ─── Animation state ──────────────────────────────────────────────────────────
interface AnimState {
  kind: 'pulse' | 'blink' | 'rotate'
  obj: Graphics | Sprite
  speed: number
  phase: number
}

// ─── Public building definition ───────────────────────────────────────────────
export interface HubBuildingDef {
  kind: string
  plotX: number
  w: number
  hot?: boolean
  status?: 'ok' | 'warn' | 'info'
}

// ─── Main scene builder ───────────────────────────────────────────────────────
export function buildHubScene(
  app: Application,
  buildings: HubBuildingDef[],
  tex: HubTextures,
): { update: (elapsed: number, dt: number) => void; destroy: () => void } {
  const root = new Container()
  app.stage.addChild(root)

  const allAnims: AnimState[] = []
  const buildingContainers: Container[] = []

  for (const def of buildings) {
    const hot = !!def.hot
    let result: { root: Container; animatables: AnimState[] }

    switch (def.kind) {
      case 'launchpad':    result = buildLaunchpad(hot, tex); break
      case 'command':      result = buildCommandCenter(tex); break
      case 'refinery':     result = buildRefinery(tex); break
      case 'scan-station': result = buildScanStation(hot, tex); break
      default:             result = buildCommandCenter(tex); break
    }

    // Position: center of building at plotX + w/2, ground at GROUND_Y
    result.root.x = def.plotX + def.w / 2
    result.root.y = GROUND_Y
    root.addChild(result.root)
    buildingContainers.push(result.root)
    allAnims.push(...result.animatables)
  }

  function update(_elapsed: number, dt: number) {
    for (const anim of allAnims) {
      anim.phase += dt * anim.speed

      if (anim.kind === 'pulse') {
        anim.obj.alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(anim.phase))
      } else if (anim.kind === 'blink') {
        anim.obj.alpha = Math.sin(anim.phase) > 0 ? 1 : 0.1
      } else if (anim.kind === 'rotate') {
        anim.obj.rotation += dt * anim.speed * 0.05
      }
    }
  }

  function destroy() {
    app.stage.removeChild(root)
    root.destroy({ children: true })
  }

  return { update, destroy }
}
