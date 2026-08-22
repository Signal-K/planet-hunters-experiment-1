/**
 * Hub screen building scene — pure PixiJS scene logic, no React lifecycle.
 *
 * Terrain corrected 2026-08-22 (KES-228). The KES-226 version drew only a
 * bare ground plane and plateau, deferring all visual weight to a giant
 * orbit-ring backdrop (`HubWorldBackground.tsx`) — but that ring was itself
 * a narrative mistake (Earth Base is a facility on Earth, not a space
 * station; see HubWorldBackground's doc comment) and its removal left this
 * screen with almost no landscape at all. This version draws actual
 * foreground terrain — a jagged ridge crest right at the ground line,
 * textured with hard-edged facets — that continues the CSS hill bands
 * behind it (`HubWorldBackground.tsx`) into the near ground the buildings
 * stand on, plus the raised plateau pad.
 *
 * Rendering rules unchanged: flat color fills, volume via 2–3 discrete
 * facets, hard-edged outline strokes, glows are the only permitted
 * softness — Out There: Ω Edition's dark palette, cyan primary accent,
 * pink used sparingly as a warm highlight.
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

// ─── Palette — flat-shaded structure colors, Out There: Ω Edition anchor ─────
const C = {
  hull:     0xdce6f0,  // lit face — pale blue-white metal (Out There hull tone)
  hullDark: 0xb7c8db,  // shaded face
  base:     0x9fb3c9,  // pad / foundation
  foot:     0xc7d5e3,  // outrigger feet, lightest facet
  outline:  0x1c2438,  // hard-edge stroke — thick dark ink (Crashlands linework)
  cyan:     0x70d9ea,  // window strips, trim, pad glow
  mint:     0x5ad07e,  // status lights
  pink:     0xe35fa0,  // ring-matched highlight, used sparingly
  moundLit: 0x2a3550,  // dirt collar, lit crown — dark blue-grey, not soil
  moundDim: 0x141c30,  // dirt collar, sunken edge
  grassRim: 0x70d9ea,  // cyan rim-light on the mound (no grass in this scene)
} as const

// ─── Ground palette — small, dark, sits inside the ring's hole ───────────────
const T = {
  groundLit: 0x0d1830,
  groundMid: 0x081120,
  deckLit:   0x121f3c,
  deckWall:  0x070c18,
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
 * Ground layer: a jagged foreground ridge crest at the ground line,
 * continuing the CSS hill silhouettes behind it (`HubWorldBackground.tsx`)
 * into real near-ground terrain, plus the raised plateau pad the
 * structures stand on.
 */
function buildTerrain(w: number, h: number, groundY: number): Container {
  const root = new Container()

  // ── Ground plane — base fill behind the ridge crest ─────────────────────
  const ground = new Graphics()
  ground.rect(0, groundY, w, h - groundY).fill(T.groundLit)
  root.addChild(ground)

  // ── Foreground ridge crest — a jagged hard-edged silhouette breaking the
  // ground line, textured with alternating lit/shaded facets so it reads as
  // real terrain rather than a flat rectangle. Continues the CSS hill bands
  // that sit above/behind this canvas layer. ────────────────────────────────
  const steps = 16
  const crest = heightField(steps, [[1, 1.6, 0.4], [0.55, 3.7, 2.1], [0.3, 6.5, 0.9]])
  const ridge = new Graphics()
  const crestH = h * 0.05
  const points: number[] = []
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w
    const y = groundY - crest[i] * crestH
    points.push(x, y)
  }
  points.push(w, groundY + h * 0.02, 0, groundY + h * 0.02)
  ridge.poly(points).fill(T.groundMid)
  root.addChild(ridge)

  // Facet bands across the ridge — alternating shade, hard vertical seams,
  // the same "2-3 discrete facets" language the buildings use.
  for (let i = 0; i < steps; i += 1) {
    if (i % 2 !== 0) continue
    const x0 = (i / steps) * w
    const x1 = ((i + 1) / steps) * w
    const topY = groundY - crest[i] * crestH
    ridge.rect(x0, topY, x1 - x0, groundY + h * 0.02 - topY).fill({ color: T.groundLit, alpha: 0.5 })
  }

  // Thin cyan rim-light tracing the crest, echoing the CSS hill rim-light.
  const rim = new Graphics()
  for (let i = 0; i < steps; i++) {
    const x = (i / steps) * w
    const y = groundY - crest[i] * crestH
    if (i === 0) rim.moveTo(x, y)
    else rim.lineTo(x, y)
  }
  rim.stroke({ width: 1.5, color: C.cyan, alpha: 0.35 })
  root.addChild(rim)

  // ── Plateau — the raised pad the structures stand on ────────────────────
  // A shallow chamfered deck, seen at a glancing angle: thin top face, lit
  // front wall below it. Same geometry as before, recolored dark with a
  // cyan kerb light instead of a grass lip.
  const padW = Math.min(w * 0.74, 900)
  const padX = (w - padW) / 2
  const deckY = groundY + h * 0.030
  const deckFaceH = h * 0.055
  const deckTopH = h * 0.016
  const chamfer = padW * 0.06

  const pad = new Graphics()

  pad.moveTo(padX + chamfer, deckY - deckTopH)
  pad.lineTo(padX + padW - chamfer, deckY - deckTopH)
  pad.lineTo(padX + padW, deckY)
  pad.lineTo(padX + padW - chamfer * 0.6, deckY + deckTopH * 0.5)
  pad.lineTo(padX + chamfer * 0.6, deckY + deckTopH * 0.5)
  pad.lineTo(padX, deckY)
  pad.closePath()
  pad.fill(T.deckLit)

  const faceTop = deckY + deckTopH * 0.5
  pad.moveTo(padX, deckY)
  pad.lineTo(padX + chamfer * 0.6, faceTop)
  pad.lineTo(padX + padW - chamfer * 0.6, faceTop)
  pad.lineTo(padX + padW, deckY)
  pad.lineTo(padX + padW - chamfer * 0.35, deckY + deckFaceH)
  pad.lineTo(padX + chamfer * 0.35, deckY + deckFaceH)
  pad.closePath()
  pad.fill(T.deckWall)

  // Cyan kerb light along the deck edge — the scene's one grounded accent,
  // echoing the ring above rather than a grass lip.
  pad.rect(padX + chamfer * 0.6, faceTop - 2, padW - chamfer * 1.2, 2.5)
  pad.fill({ color: C.cyan, alpha: 0.4 })
  root.addChild(pad)

  const padTop = deckY - deckTopH
  const padBottom = deckY + deckFaceH

  // ── A handful of landing lights along the pad edge — sparse, not a full
  // service-site diorama. Small points of life, nothing more. ─────────────
  const lights = new Graphics()
  for (let i = 0; i < 6; i++) {
    const x = padX + padW * (0.08 + i * 0.168)
    lights.circle(x, padTop + 3, 1.6).fill({ color: C.cyan, alpha: 0.7 })
    lights.circle(x, padBottom - 3, 1.6).fill({ color: C.pink, alpha: 0.55 })
  }
  root.addChild(lights)

  return root
}


// Natural art width in scene units, per kind — the container is scaled so the
// silhouette fills the caller's requested `w`.
const ART_W: Record<string, number> = {
  launchpad: 60,
  refinery: 62,
  'scan-station': 58,
  'astronaut-academy': 60,
  command: 60,
}

// The modular launchpad's sprites (STS-611) are authored at a much larger
// natural footprint (mast-to-mast ~206 units — see buildLaunchpad) than the
// 60-wide envelope every other building silhouette, and this building's own
// Graphics fallback, assume. Rather than change ART_W (which would also
// rescale the unrelated Graphics fallback against existing expectations),
// the textured sprite group is pre-shrunk by this factor so it occupies the
// same ~60-wide footprint as everything else once the holder applies its own
// `def.w / ART_W.launchpad` scale.
const LAUNCHPAD_SPRITE_SCALE = 60 / 206

// ─── Texture bag ──────────────────────────────────────────────────────────────
export interface HubTextures {
  /** Modular launchpad — six independent sprites (STS-611), not one baked pad.
   *  Deck stands alone as an idle-but-built pad; the rest lets the scene
   *  position/animate gantries, arm, clamps, masts and tank independently. */
  pad_deck:         Texture | null
  pad_gantry_frame: Texture | null
  /** Hinge at the sprite's LEFT edge, vertically centred — rendered that way
   *  so anchor(0, 0.5) rotates it about the tower without the pivot drifting. */
  pad_swing_arm:    Texture | null
  pad_clamp:        Texture | null
  pad_mast:         Texture | null
  pad_tank:         Texture | null
  cmd_foundation:   Texture | null
  cmd_building:     Texture | null
  cmd_antenna:      Texture | null
  depot_base:       Texture | null
  depot_tank:       Texture | null
  depot_pipes:      Texture | null
  /** Full refinery render, added for KES-145 art parity. Kept separate from
   * the original tank so older manifests retain their procedural fallback. */
  refinery_modular: Texture | null
  scan_tripod:      Texture | null
  scan_dish:        Texture | null
  /** Full tripod + dish render, added for KES-145 art parity. */
  scan_station_modular: Texture | null
  /** The player's rocket, shown standing on the pad when a launch is pending
   *  (KES-88). Authored horizontally (Hangar/Purchase screens lay ships on
   *  their side) — `buildLaunchpad` rotates it 90°, the same trick
   *  `launchScene.ts`'s `rocketSprite` already uses for the same art. */
  ship_sr1:         Texture | null
  ship_sr2:         Texture | null
}

export function nullTextures(): HubTextures {
  return {
    pad_deck: null, pad_gantry_frame: null, pad_swing_arm: null,
    pad_clamp: null, pad_mast: null, pad_tank: null,
    cmd_foundation: null, cmd_building: null, cmd_antenna: null,
    depot_base: null, depot_tank: null, depot_pipes: null, refinery_modular: null,
    scan_tripod: null, scan_dish: null, scan_station_modular: null,
    ship_sr1: null, ship_sr2: null,
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
 * Launchpad — modular (STS-611): deck, twin gantry frames, swing arm, clamps,
 * masts and tank as six independent sprites instead of one baked pad, so the
 * arm can retract and the pad can stand built-but-empty. Positions are the
 * Blender models' own authored dimensions (tools/blender/models/launchpad.py
 * `layout` tuples: deck 72x18, frame 28x96, arm 34x10, clamp 12x16, mast 6x72,
 * tank 20x24) at the exact relative offsets from
 * tools/blender/make_preview.py's reviewed composite, divided by that script's
 * 3x render scale. `pad_gantry_frame` is not mirrored — the model's bracing
 * is already left-right symmetric (only front/back shading differs), which
 * is also why make_preview.py places two identical copies rather than a
 * flipped pair. Falls back to the original single-silhouette Graphics port of
 * the mockup's inline SVG (viewBox 0 0 100 130, feet at y=114, converted by
 * x' = x - 50, y' = y - 114) when any modular texture is missing.
 */
function buildLaunchpad(
  hot: boolean,
  tex: HubTextures,
  rocketVariant: 'explorer' | 'prospector' = 'explorer',
): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  const deck = makeSprite(tex.pad_deck, 72, 18)
  const frameL = makeSprite(tex.pad_gantry_frame, 28, 96)
  const frameR = makeSprite(tex.pad_gantry_frame, 28, 96)
  const arm = makeSprite(tex.pad_swing_arm, 34, 10, 0, 0.5)
  const clampL = makeSprite(tex.pad_clamp, 12, 16)
  const clampR = makeSprite(tex.pad_clamp, 12, 16)
  const mastL = makeSprite(tex.pad_mast, 6, 72)
  const mastR = makeSprite(tex.pad_mast, 6, 72)
  const tankL = makeSprite(tex.pad_tank, 20, 24)
  const tankR = makeSprite(tex.pad_tank, 20, 24)

  let beaconY = -104

  if (deck && frameL && frameR && arm && clampL && clampR && mastL && mastR && tankL && tankR) {
    const DECK_TOP = -13.33  // frames/clamps stand on the deck, not the ground
    mastL.x = -100; mastR.x = 100
    tankL.x = -63.33; tankR.x = 63.33
    frameL.x = -26; frameL.y = DECK_TOP
    frameR.x = 26; frameR.y = DECK_TOP
    clampL.x = -8.67; clampL.y = DECK_TOP
    clampR.x = 8.67; clampR.y = DECK_TOP
    // Hinge sits inboard of the left frame, stowed-open reaching toward where
    // a vehicle would stand at deck centre. Swung clear when `hot`.
    arm.x = -17.33; arm.y = -80
    arm.rotation = hot ? -1.1 : 0

    const padGroupChildren: (Sprite | Graphics)[] = []

    // The rocket, standing between the clamps, only while a launch is
    // pending. `ship_sr1`/`ship_sr2` are authored horizontally (Hangar/
    // Purchase screens lay ships on their side) — rotated 90° here, the same
    // trick `launchScene.ts`'s `rocketSprite` already uses for the same art.
    // Known gap: `rocketVariant` isn't wired to the player's actual rocket
    // config yet (Player has no rocket-config field reachable from HubScreen
    // without new plumbing) — defaults to Explorer (sr1) whenever a launch
    // is pending. Follow-up, not silently "done".
    const shipTex = rocketVariant === 'prospector' ? tex.ship_sr2 : tex.ship_sr1
    if (hot && shipTex) {
      const ship = new Sprite(shipTex)
      ship.anchor.set(0.5, 0.5)
      // 80 (2026-08-03) rendered at ~23px on screen once `LAUNCHPAD_SPRITE_SCALE`
      // (0.291) is applied — too small for the hull's own detail (wings,
      // canopy, nozzle) to read at all, which is what actually made the
      // ship look like a bare tube in-game, not a hull-geometry problem.
      // Bumped 40%; ship is the last child added (see below), so it draws
      // in front of the gantry frames/clamps and can safely be wider than
      // the gap between them without a literal clipping bug.
      const SHIP_DISPLAY_W = 112
      ship.width = SHIP_DISPLAY_W; ship.height = SHIP_DISPLAY_W / (160 / 60)
      ship.rotation = Math.PI / 2  // nose (authored pointing left) turns to point up
      ship.x = 0
      ship.y = DECK_TOP - SHIP_DISPLAY_W / 2  // half the rotated sprite's height, base flush with the deck
      padGroupChildren.push(ship)

      // Flame at the base — nested glow, cyan/mint rather than amber (amber
      // is reserved for payout emphasis, not effects; the engine nozzle
      // elsewhere in this pipeline uses the same cyan-glow language).
      const flameGlow = new Graphics()
      flameGlow.ellipse(0, DECK_TOP + 2, 14, 22).fill({ color: C.mint, alpha: 0.35 })
      padGroupChildren.push(flameGlow)
      anims.push({ kind: 'pulse', obj: flameGlow, speed: 5.5, phase: 0, min: 0.25, max: 0.6 })

      const flameCore = new Graphics()
      flameCore.ellipse(0, DECK_TOP + 4, 6, 11).fill({ color: C.cyan, alpha: 0.9 })
      padGroupChildren.push(flameCore)
      anims.push({ kind: 'pulse', obj: flameCore, speed: 8, phase: 1.4, min: 0.6, max: 1 })
    }

    // Pre-shrunk to the shared ~60-wide envelope — see LAUNCHPAD_SPRITE_SCALE.
    const padGroup = new Container()
    padGroup.scale.set(LAUNCHPAD_SPRITE_SCALE)
    padGroup.addChild(mastL, mastR, tankL, tankR, frameL, frameR, deck, clampL, clampR, arm, ...padGroupChildren)
    root.addChild(padGroup)
    beaconY = (-13.33 - 96) * LAUNCHPAD_SPRITE_SCALE - 2  // just above the frame tops
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
  beacon.circle(0, beaconY, 3).fill(C.mint)
  root.addChild(beacon)
  anims.push({ kind: 'blink', obj: beacon, speed: hot ? 3.2 : 1.3, phase: 0 })

  if (hot) {
    const halo = new Graphics()
    halo.circle(0, beaconY, 9).fill({ color: C.mint, alpha: 0.28 })
    root.addChild(halo)
    anims.push({ kind: 'pulse', obj: halo, speed: 2.2, phase: 0, min: 0.2, max: 0.7 })
  }

  return { root, animatables: anims }
}

/** Refinery — stacked flat facets, twin stacks, mint vent lights (no amber). */
function buildRefinery(tex: HubTextures): { root: Container; animatables: AnimState[] } {
  const root = new Container()
  const anims: AnimState[] = []

  const body = makeSprite(tex.refinery_modular ?? tex.depot_tank, tex.refinery_modular ? 76 : 56, tex.refinery_modular ? 53 : 44, 0.5, 1.0)
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

  const dish = makeSprite(tex.scan_station_modular ?? tex.scan_dish, tex.scan_station_modular ? 48 : 46, tex.scan_station_modular ? 76 : 30, 0.5, 1.0)
  if (dish) {
    dish.y = tex.scan_station_modular ? 0 : -52; root.addChild(dish)
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
  /**
   * Post-tutorial Hub prominence pass (STS-631): the Launchpad is the only
   * `unlocksAt: 'always'` structure and should always read as the base's
   * primary structure. Telescope buildings that are unlocked but still in
   * their early "not yet actively producing" state (Deep Space Telescope
   * before it's built) are marked `dimmed` so they recede behind
   * the Launchpad rather than compete with it for attention.
   */
  dimmed?: boolean
  /** Which ship stands on the pad while `hot` (launch pending). Defaults to
   *  Explorer — see buildLaunchpad's comment on why this isn't wired
   *  to the player's actual rocket config yet. */
  rocketVariant?: 'explorer' | 'prospector'
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
  // Make the intended world layering explicit. This protects the structure
  // silhouettes from later terrain/prop additions and from Pixi's child-order
  // changes during rebuilds.
  root.sortableChildren = true
  app.stage.addChild(root)

  // Terrain first so every structure stands in front of the ground it sits on.
  // Uses renderer pixels directly — unlike buildings, terrain is not authored
  // in the fixed HUB_W space and must not be scaled by scaleX.
  const terrain = buildTerrain(app.renderer.width, app.renderer.height, groundY)
  terrain.label = 'terrain'
  terrain.zIndex = 0
  root.addChild(terrain)

  const allAnims: AnimState[] = []
  const buildingContainers: Container[] = []

  for (const def of buildings) {
    const hot = !!def.hot
    let result: { root: Container; animatables: AnimState[] }

    switch (def.kind) {
      case 'launchpad':                     result = buildLaunchpad(hot, tex, def.rocketVariant); break
      case 'refinery':                      result = buildRefinery(tex); break
      case 'scan-station':                  result = buildScanStation(hot, tex); break
      case 'command':                       result = buildCommandCenter(tex); break
      default:                              result = buildCommandCenter(tex); break
    }

    // Scale the art so its natural silhouette fills the requested width.
    const artW = ART_W[def.kind] ?? 60
    const scale = def.w / artW

    const holder = new Container()
    holder.label = 'building'
    // Launchpad renders above every other structure (STS-631 Hub prominence
    // pass) so it never reads as visually subordinate to a telescope/
    // satellite building sharing the same ground line.
    holder.zIndex = def.kind === 'launchpad' ? 20 : 10
    holder.alpha = def.dimmed ? 0.55 : 1
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
