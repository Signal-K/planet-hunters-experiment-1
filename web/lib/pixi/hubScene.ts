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

// ─── Terrain palette ─────────────────────────────────────────────────────────
// Each band carries a lit tone and a shade tone. The shade is painted onto the
// lee (descending) flank of every crest as a hard-edged facet — that is what
// gives the ranges volume without gradients, grain or noise, per the design
// language's chunky cel-shaded direction.
const T = {
  ridge: [
    { lit: 0x7d99b2, shade: 0x66839d },
    { lit: 0x638098, shade: 0x506d85 },
    { lit: 0x4c6a76, shade: 0x3c5a67 },
    { lit: 0x3f6050, shade: 0x315043 },
    { lit: 0x2f4a38, shade: 0x243c2d },
  ],
  tree: [0x294a2a, 0x1d3a22, 0x142b19],
  groundLit: 0x23421f,
  groundMid: 0x1a3620,
  groundDark: 0x0d2015,
  soilLit: 0x4a3318,
  soilMid: 0x3a2810,
  soilDeep: 0x241606,
  stone: 0x1b1008,
} as const

type Sine = readonly [number, number, number]

/** Summed-sine height field in 0..1. Low freqs = massing, high freqs = crags. */
function heightField(steps: number, sines: readonly Sine[], floor = 0): number[] {
  const total = sines.reduce((sum, [amp]) => sum + amp, 0)
  const out: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    let h = 0
    for (const [amp, freq, phase] of sines) h += amp * Math.sin(t * Math.PI * 2 * freq + phase)
    out.push(Math.max(floor, Math.min(1, (h / total + 1) / 2)))
  }
  return out
}

/**
 * One mountain range: flat silhouette, then a hard shade facet on every
 * descending span. No stroke — the tonal step between neighbouring bands is
 * what separates them, the same way the mockup's flat shapes read.
 */
function drawRidge(g: Graphics, w: number, baseY: number, height: number, sines: readonly Sine[], band: { lit: number; shade: number }) {
  const STEPS = 168
  const h = heightField(STEPS, sines)
  const yAt = (i: number) => baseY - h[i] * height

  g.moveTo(0, baseY)
  for (let i = 0; i <= STEPS; i++) g.lineTo((i / STEPS) * w, yAt(i))
  g.lineTo(w, baseY)
  g.closePath()
  g.fill(band.lit)

  for (let i = 0; i < STEPS; i++) {
    if (h[i + 1] >= h[i]) continue
    const x0 = (i / STEPS) * w
    const x1 = ((i + 1) / STEPS) * w
    g.moveTo(x0, yAt(i))
    g.lineTo(x1, yAt(i + 1))
    g.lineTo(x1, baseY)
    g.lineTo(x0, baseY)
    g.closePath()
  }
  g.fill({ color: band.shade, alpha: 0.5 })
}

/** A conifer row — same generator weighted to high frequencies for a spiky edge. */
function drawTreeRow(g: Graphics, w: number, baseY: number, height: number, seed: number, color: number) {
  const STEPS = 300
  const h = heightField(STEPS, [
    [0.42, 5.5, seed + 0.30], [0.24, 12.5, seed + 1.10], [0.16, 24, seed + 0.75],
    [0.10, 40, seed + 1.90], [0.05, 65, seed + 0.50], [0.03, 100, seed + 2.30],
  ], 0.10)

  g.moveTo(0, baseY)
  for (let i = 0; i <= STEPS; i++) g.lineTo((i / STEPS) * w, baseY - h[i] * height)
  g.lineTo(w, baseY)
  g.closePath()
  g.fill(color)
}

/**
 * Terrain layer: ranges, treeline, faceted ground plane and the soil strata
 * beneath it. Drawn in renderer pixels (not the 402-wide authoring space), so
 * it fills desktop widths instead of being squeezed into the left edge.
 *
 * Lives in PixiJS rather than the DOM background so the ground and the
 * structures standing on it are shaded by one system — the DOM layer keeps
 * only what Pixi is bad at: the sky gradient, starfield and horizon haze.
 */
function buildTerrain(w: number, h: number, groundY: number): Container {
  const root = new Container()

  const far = new Graphics()
  drawRidge(far, w, groundY - h * 0.055, h * 0.20, [[0.30, 1.1, 0.20], [0.28, 2.3, 0.80], [0.22, 3.8, 1.50], [0.12, 5.9, 0.40], [0.08, 8.2, 1.20]], T.ridge[0])
  drawRidge(far, w, groundY - h * 0.045, h * 0.17, [[0.35, 1.6, 0.60], [0.28, 3.2, 1.30], [0.20, 5.5, 0.20], [0.12, 8.0, 1.90], [0.05, 12.0, 0.80]], T.ridge[1])
  drawRidge(far, w, groundY - h * 0.035, h * 0.14, [[0.40, 2.2, 1.10], [0.27, 4.1, 0.50], [0.18, 7.0, 1.70], [0.10, 10.5, 0.30], [0.05, 15.0, 2.10]], T.ridge[2])
  root.addChild(far)

  const near = new Graphics()
  drawRidge(near, w, groundY - h * 0.020, h * 0.115, [[0.44, 2.8, 0.40], [0.28, 5.2, 1.80], [0.16, 8.6, 0.60], [0.08, 13.0, 2.40], [0.04, 19.0, 0.90]], T.ridge[3])
  drawRidge(near, w, groundY - h * 0.008, h * 0.085, [[0.46, 3.5, 1.60], [0.26, 6.8, 0.20], [0.16, 11.0, 1.40], [0.08, 16.5, 0.80], [0.04, 24.0, 1.10]], T.ridge[4])
  root.addChild(near)

  const trees = new Graphics()
  drawTreeRow(trees, w, groundY + 1, h * 0.055, 0.0, T.tree[0])
  drawTreeRow(trees, w, groundY + 1, h * 0.040, 1.3, T.tree[1])
  drawTreeRow(trees, w, groundY + 1, h * 0.027, 2.7, T.tree[2])
  root.addChild(trees)

  // ── Ground plane — chunky facets rather than a flat fill ────────────────
  const ground = new Graphics()
  const FACETS = 9
  const crest = heightField(FACETS, [[1, 1.4, 0.6], [0.5, 3.1, 1.9]])
  const topAt = (i: number) => groundY - crest[i] * h * 0.045

  ground.moveTo(0, topAt(0))
  for (let i = 1; i <= FACETS; i++) ground.lineTo((i / FACETS) * w, topAt(i))
  ground.lineTo(w, h)
  ground.lineTo(0, h)
  ground.closePath()
  ground.fill(T.groundLit)

  // Alternate facet tone panel-by-panel so the plane reads as folded ground.
  for (let i = 0; i < FACETS; i += 2) {
    ground.moveTo((i / FACETS) * w, topAt(i))
    ground.lineTo(((i + 1) / FACETS) * w, topAt(i + 1))
    ground.lineTo(((i + 1) / FACETS) * w, h)
    ground.lineTo((i / FACETS) * w, h)
    ground.closePath()
  }
  ground.fill({ color: T.groundMid, alpha: 0.75 })
  root.addChild(ground)

  // ── Soil strata under the turf — banded, with embedded stone facets ─────
  const soilTop = groundY + h * 0.075
  const soil = new Graphics()
  soil.rect(0, soilTop, w, h - soilTop).fill(T.soilMid)
  soil.rect(0, soilTop, w, h * 0.018).fill(T.soilLit)
  soil.rect(0, soilTop + h * 0.075, w, h - soilTop - h * 0.075).fill(T.soilDeep)

  // Angular stones — deterministic placement, faceted triangles not blobs.
  const stones = heightField(22, [[1, 2.7, 0.4], [0.6, 6.3, 1.7]])
  for (let i = 0; i < stones.length; i++) {
    const sx = ((i + 0.5) / stones.length) * w
    const sy = soilTop + h * 0.012 + stones[i] * h * 0.085
    const sw = 5 + stones[i] * 11
    soil.moveTo(sx - sw, sy)
    soil.lineTo(sx, sy - sw * 0.62)
    soil.lineTo(sx + sw, sy)
    soil.closePath()
  }
  soil.fill({ color: T.stone, alpha: 0.55 })
  root.addChild(soil)

  // ── Plateau — the octagonal build platform structures stand on ──────────
  // Moved out of the DOM background: with terrain now drawn in Pixi, a DOM
  // plateau sitting behind the canvas would be painted over by the ground.
  // Geometry mirrors the v2 mockup's clip-path exactly.
  const padH = h * 0.22
  const padBottom = h - h * 0.034
  const padTop = padBottom - padH
  const padW = Math.min(w * 0.74, 900)
  const padX = (w - padW) / 2
  const oct: [number, number][] = [
    [0.04, 0.22], [0.22, 0.04], [0.78, 0.04], [0.96, 0.22],
    [0.96, 0.78], [0.78, 0.96], [0.22, 0.96], [0.04, 0.78],
  ]
  const pad = new Graphics()
  pad.moveTo(padX + oct[0][0] * padW, padTop + oct[0][1] * padH)
  for (let i = 1; i < oct.length; i++) pad.lineTo(padX + oct[i][0] * padW, padTop + oct[i][1] * padH)
  pad.closePath()
  pad.fill(0x2c4d28)
  pad.stroke({ color: 0x6cd4ff, width: 2, alpha: 0.26 })

  // Lower half in shade — same two-tone facet treatment as the ranges.
  pad.moveTo(padX + 0.96 * padW, padTop + 0.5 * padH)
  pad.lineTo(padX + 0.96 * padW, padTop + 0.78 * padH)
  pad.lineTo(padX + 0.78 * padW, padTop + 0.96 * padH)
  pad.lineTo(padX + 0.22 * padW, padTop + 0.96 * padH)
  pad.lineTo(padX + 0.04 * padW, padTop + 0.78 * padH)
  pad.lineTo(padX + 0.04 * padW, padTop + 0.5 * padH)
  pad.closePath()
  pad.fill({ color: 0x1c331c, alpha: 0.9 })
  root.addChild(pad)

  return root
}

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

  // Terrain first so every structure stands in front of the ground it sits on.
  // Uses renderer pixels directly — unlike buildings, terrain is not authored
  // in the fixed HUB_W space and must not be scaled by scaleX.
  const terrain = buildTerrain(app.renderer.width, app.renderer.height, groundY)
  terrain.label = 'terrain'
  root.addChild(terrain)

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
    holder.label = 'building'
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
