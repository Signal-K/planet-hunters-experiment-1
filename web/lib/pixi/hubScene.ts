/**
 * Hub screen building scene — pure PixiJS scene logic, no React lifecycle.
 *
 * Art reworked 2026-07-26 against the Open Design mockup
 * `landnam-earth-base-v2.html`. Rendering rules from that spec:
 *   - flat color fills, volume via 2–3 discrete facets, never gradient-as-texture
 *   - bold silhouettes with hard-edged 1–1.4px outline strokes
 *   - no amber anywhere on this screen; accents are cyan + mint only
 *   - glows are the only permitted softness
 *
 * Each structure also gets a dirt mound collar and pad glow drawn beneath it,
 * so the feet break the ground plane instead of sitting on top of it. Those
 * live here rather than in the DOM layer because the DOM sits *above* this
 * canvas — a CSS mound would occlude the building it's supposed to sit behind.
 *
 * Coordinate convention: (0, 0) = center of building base (ground contact
 * point). Buildings extend upward (negative y). Caller positions the container.
 */
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'

// ─── Canvas dimensions (portrait canvas max) ─────────────────────────────────
export const HUB_W = 402
export const HUB_H = 874

// Ground y in PixiJS canvas coordinates (22% from bottom). Must stay in
// agreement with HubWorldBackground's layout and the DOM plot positions.
export const GROUND_Y = HUB_H * (1 - 0.22)

// ─── Palette — mockup's flat-shaded structure colors ─────────────────────────
const C = {
  hull:     0x324a6c,  // lit face
  hullDark: 0x2a3e5c,  // shaded face
  base:     0x22334e,  // pad / foundation
  foot:     0x3a4a66,  // outrigger feet, lightest facet
  outline:  0x1c2c44,  // hard-edge stroke
  cyan:     0x6cd4ff,  // window strips, trim
  mint:     0x2fbf6a,  // status lights
  moundLit: 0x33501f,  // dirt collar, lit crown
  moundDim: 0x1c2f14,  // dirt collar, sunken edge
  grassRim: 0x8cc85a,  // lit grass lip on the mound
} as const

// Natural art width in scene units, per kind — the container is scaled so the
// silhouette fills the caller's requested `w`.
const ART_W: Record<string, number> = {
  launchpad: 60,
  refinery: 62,
  'scan-station': 58,
  'satellite-monitoring-station': 60,
  command: 60,
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSprite(tex: Texture | null, w: number, h: number, anchorX = 0.5, anchorY = 1.0): Sprite | null {
  if (!tex) return null
  const s = new Sprite(tex)
  s.width = w; s.height = h
  s.anchor.set(anchorX, anchorY)
  return s
}

/** Hard-edged panel: flat fill + 1.4px outline, the mockup's core shape unit. */
function panel(g: Graphics, x: number, y: number, w: number, h: number, fill: number, strokeW = 1.4): Graphics {
  g.rect(x, y, w, h).fill(fill).stroke({ width: strokeW, color: C.outline, alignment: 0.5 })
  return g
}

/**
 * Dirt collar + pad glow the structure is embedded into. Drawn first so it
 * renders behind the building. Mirrors `.structure-mound` / `.pad-glow`.
 */
function buildMound(width: number): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []
  const rx = width * 0.60
  const ry = Math.max(7, width * 0.155)

  const mound = new Graphics()
  mound.ellipse(0, -ry * 0.35, rx, ry).fill(C.moundDim)
  mound.ellipse(0, -ry * 0.55, rx * 0.82, ry * 0.72).fill(C.moundLit)
  root.addChild(mound)

  // Lit grass lip across the crown of the mound
  const rim = new Graphics()
  rim.ellipse(0, -ry * 0.95, rx * 0.68, Math.max(1.5, ry * 0.13)).fill({ color: C.grassRim, alpha: 0.55 })
  root.addChild(rim)

  // Soft cyan pad glow — the only permitted softness in the structure stack
  const glow = new Graphics()
  glow.ellipse(0, -ry * 0.6, rx * 0.78, ry * 0.62).fill({ color: C.cyan, alpha: 0.30 })
  root.addChild(glow)
  anims.push({ kind: 'pulse', obj: glow, speed: 1.4, phase: 0, min: 0.35, max: 0.75 })

  return { root, animatables: anims }
}

// ─── Building renderers ───────────────────────────────────────────────────────

/**
 * Launchpad — direct port of the mockup's inline SVG (viewBox 0 0 100 130,
 * feet at y=114). Converted to the (0,0)-at-ground-center convention by
 * x' = x - 50, y' = y - 114.
 */
function buildLaunchpad(hot: boolean, tex: HubTextures): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  const base = makeSprite(tex.pad_base, 48, 12)
  const tower = makeSprite(tex.pad_tower, 8, 80, 0.5, 1.0)
  const gantry = makeSprite(tex.pad_gantry, 40, 6, 0.5, 0.5)

  if (base && tower && gantry) {
    tower.y = -16; root.addChild(base, tower, gantry)
  } else {
    const g = new Graphics()
    // Mast + crown
    panel(g, -3, -101, 6, 8, C.hullDark, 1)      // antenna housing
    panel(g, -20, -93, 40, 6, C.hullDark, 1)     // gantry crossarm
    panel(g, -4, -93, 8, 80, C.hull, 1.4)        // support tower
    // Launch pad + outrigger feet
    panel(g, -24, -16, 48, 12, C.base, 1.4)
    g.rect(-30, -6, 14, 6).fill(C.foot)
    g.rect(16, -6, 14, 6).fill(C.foot)
    root.addChild(g)

    // Cyan window strips up the tower, alternating brightness
    const strips = new Graphics()
    const ys = [-86, -75, -64, -53, -42, -31]
    ys.forEach((y, i) => {
      strips.rect(-1.5, y, 3, 6).fill({ color: C.cyan, alpha: i % 2 === 0 ? 0.8 : 0.6 })
    })
    root.addChild(strips)
  }

  // Status beacon — mint idle, brighter + haloed when a launch is pending
  const beacon = new Graphics()
  beacon.circle(0, -104, 3).fill(C.mint)
  root.addChild(beacon)
  anims.push({ kind: 'blink', obj: beacon, speed: hot ? 3.2 : 1.3, phase: 0 })

  if (hot) {
    const halo = new Graphics()
    halo.circle(0, -104, 9).fill({ color: C.mint, alpha: 0.28 })
    root.addChild(halo)
    anims.push({ kind: 'pulse', obj: halo, speed: 2.2, phase: 0, min: 0.2, max: 0.7 })
  }

  return { root, animatables: anims }
}

/** Refinery — stacked flat facets, twin stacks, mint vent lights (no amber). */
function buildRefinery(tex: HubTextures): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  const body = makeSprite(tex.depot_tank, 56, 44, 0.5, 1.0)
  if (body) {
    root.addChild(body)
  } else {
    const g = new Graphics()
    panel(g, -31, -10, 62, 10, C.base, 1.4)      // foundation
    panel(g, -26, -54, 52, 44, C.hullDark, 1.4)  // main block, shaded face
    panel(g, -26, -54, 22, 44, C.hull, 1.4)      // lit left facet
    panel(g, -26, -34, 52, 7, C.base, 1)         // pipe run
    // Twin stacks, unequal height
    panel(g, -19, -96, 11, 42, C.hull, 1.4)
    panel(g, 8, -84, 11, 30, C.hull, 1.4)
    panel(g, -22, -100, 17, 5, C.hullDark, 1)    // caps
    panel(g, 5, -88, 17, 5, C.hullDark, 1)
    root.addChild(g)

    const trim = new Graphics()
    trim.rect(-24, -50, 48, 2).fill({ color: C.cyan, alpha: 0.55 })
    root.addChild(trim)
  }

  const v1 = new Graphics()
  v1.circle(-13.5, -103, 2.6).fill(C.mint)
  root.addChild(v1)
  anims.push({ kind: 'pulse', obj: v1, speed: 2.6, phase: 0, min: 0.35, max: 1 })

  const v2 = new Graphics()
  v2.circle(13.5, -91, 2.6).fill(C.mint)
  root.addChild(v2)
  anims.push({ kind: 'pulse', obj: v2, speed: 2.6, phase: Math.PI, min: 0.35, max: 1 })

  return { root, animatables: anims }
}

/** Scanning Station — tripod mast + tilted dish, cyan ribs. */
function buildScanStation(hot: boolean, tex: HubTextures): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  const dish = makeSprite(tex.scan_dish, 46, 30, 0.5, 1.0)
  if (dish) {
    dish.y = -52; root.addChild(dish)
  } else {
    const g = new Graphics()
    // Tripod — two discrete facets so the legs read as a solid volume
    g.poly([-29, 0, 0, -52, 29, 0]).fill(C.hullDark).stroke({ width: 1.4, color: C.outline })
    g.poly([-29, 0, -1.5, -50, -14, 0]).fill(C.hull)
    panel(g, -1.5, -54, 3, 54, C.hull, 1)        // mast
    g.rect(-29, -5, 9, 5).fill(C.foot)           // feet
    g.rect(20, -5, 9, 5).fill(C.foot)
    // Dish bowl
    g.ellipse(3, -74, 26, 16).fill(C.hull).stroke({ width: 1.4, color: C.outline })
    g.ellipse(3, -74, 22, 12.5).fill(C.hullDark)
    root.addChild(g)

    const ribs = new Graphics()
    for (let i = -2; i <= 2; i++) ribs.rect(3 + i * 8 - 0.75, -86, 1.5, 24).fill({ color: C.cyan, alpha: 0.34 })
    root.addChild(ribs)
  }

  const beacon = new Graphics()
  beacon.circle(0, -56, 2.6).fill(C.mint)
  root.addChild(beacon)
  anims.push({ kind: 'blink', obj: beacon, speed: hot ? 4.0 : 1.0, phase: 0 })

  return { root, animatables: anims }
}

/** Satellite Monitoring Station — parabolic uplink dish on a squat block. */
function buildSatelliteStation(tex: HubTextures): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  const bld = makeSprite(tex.cmd_building, 52, 36, 0.5, 1.0)
  if (bld) {
    root.addChild(bld)
  } else {
    const g = new Graphics()
    panel(g, -30, -10, 60, 10, C.base, 1.4)      // foundation
    panel(g, -24, -44, 48, 34, C.hullDark, 1.4)  // block, shaded
    panel(g, -24, -44, 19, 34, C.hull, 1.4)      // lit facet
    panel(g, -6, -24, 12, 24, C.base, 1)         // door
    panel(g, -2.5, -92, 5, 48, C.hull, 1.2)      // mast
    // Uplink dish — open parabola, cyan-lined interior
    g.poly([-22, -92, 22, -92, 12, -112, -12, -112]).fill(C.hullDark).stroke({ width: 1.4, color: C.outline })
    g.poly([-17, -94, 17, -94, 9, -108, -9, -108]).fill({ color: C.cyan, alpha: 0.30 })
    root.addChild(g)

    const win = new Graphics()
    for (let i = 0; i < 3; i++) win.rect(-17 + i * 12, -38, 8, 8).fill({ color: C.cyan, alpha: i === 1 ? 0.75 : 0.5 })
    root.addChild(win)
  }

  const light = new Graphics()
  light.circle(0, -115, 2.6).fill(C.mint)
  root.addChild(light)
  anims.push({ kind: 'blink', obj: light, speed: 1.4, phase: 0 })

  return { root, animatables: anims }
}

/** Command Center — also the fallback art for any unrecognised structure kind. */
function buildCommandCenter(tex: HubTextures): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  const bld = makeSprite(tex.cmd_building, 56, 56, 0.5, 1.0)
  if (bld) {
    bld.y = -10; root.addChild(bld)
  } else {
    const g = new Graphics()
    panel(g, -30, -10, 60, 10, C.base, 1.4)
    panel(g, -26, -66, 52, 56, C.hullDark, 1.4)
    panel(g, -26, -66, 20, 56, C.hull, 1.4)
    panel(g, -7, -26, 14, 26, C.base, 1)         // door
    panel(g, -2, -96, 4, 30, C.hull, 1.2)        // mast
    g.ellipse(13, -82, 12, 7).fill(C.hull).stroke({ width: 1.2, color: C.outline })
    root.addChild(g)

    const win = new Graphics()
    for (let i = 0; i < 3; i++) {
      win.rect(-19 + i * 13, -58, 9, 11).fill({ color: C.cyan, alpha: 0.7 })
      win.rect(-19 + i * 13, -42, 9, 8).fill({ color: C.cyan, alpha: 0.45 })
    }
    root.addChild(win)
  }

  const light = new Graphics()
  light.circle(0, -99, 2.6).fill(C.mint)
  root.addChild(light)
  anims.push({ kind: 'blink', obj: light, speed: 1.4, phase: 0 })

  return { root, animatables: anims }
}

// ─── Animation state ──────────────────────────────────────────────────────────
interface AnimState {
  kind: 'pulse' | 'blink' | 'rotate'
  obj: Graphics | Sprite
  speed: number
  phase: number
  /** `pulse` alpha floor / ceiling. Defaults preserve the previous 0.3–1.0 swing. */
  min?: number
  max?: number
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
  opts: { groundY?: number; scaleX?: number } = {},
): { update: (elapsed: number, dt: number) => void; destroy: () => void } {
  const groundY = opts.groundY ?? GROUND_Y
  // scaleX converts scene-authored plotX (defined in the fixed HUB_W=402
  // coordinate space) to the app's actual render width, which on desktop is
  // the real container width, not HUB_W. Without this, buildings render at
  // their raw 402-space x — squeezed into the first ~402px of a much wider
  // canvas — while the DOM plot labels position via CSS percentage and
  // stretch correctly, so the two visibly disagree on wide screens.
  const scaleX = opts.scaleX ?? 1
  const root = new Container()
  app.stage.addChild(root)

  const allAnims: AnimState[] = []
  const buildingContainers: Container[] = []

  for (const def of buildings) {
    const hot = !!def.hot
    let result: { root: Container; animatables: AnimState[] }

    switch (def.kind) {
      case 'launchpad':                     result = buildLaunchpad(hot, tex); break
      case 'refinery':                      result = buildRefinery(tex); break
      case 'scan-station':                  result = buildScanStation(hot, tex); break
      case 'satellite-monitoring-station':  result = buildSatelliteStation(tex); break
      case 'command':                       result = buildCommandCenter(tex); break
      default:                              result = buildCommandCenter(tex); break
    }

    // Scale the art so its natural silhouette fills the requested width.
    const artW = ART_W[def.kind] ?? 60
    const scale = def.w / artW

    const holder = new Container()
    holder.x = def.plotX * scaleX
    holder.y = groundY
    holder.scale.set(scale)

    // Mound first so the collar renders behind the structure it embeds.
    const mound = buildMound(artW)
    holder.addChild(mound.root, result.root)

    root.addChild(holder)
    buildingContainers.push(holder)
    allAnims.push(...mound.animatables, ...result.animatables)
  }

  function update(_elapsed: number, dt: number) {
    for (const anim of allAnims) {
      anim.phase += dt * anim.speed

      if (anim.kind === 'pulse') {
        const min = anim.min ?? 0.3
        const max = anim.max ?? 1
        anim.obj.alpha = min + (max - min) * (0.5 + 0.5 * Math.sin(anim.phase))
      } else if (anim.kind === 'blink') {
        anim.obj.alpha = Math.sin(anim.phase) > 0 ? 1 : 0.45
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
