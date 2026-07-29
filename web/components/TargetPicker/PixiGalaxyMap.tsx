'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { Mission, Target, TargetArchetype } from '@/lib/data'
import { RARE_TIER_MIN_ORBIT, EXOTIC_TIER_MIN_ORBIT } from '@/lib/data'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'

// ── Design token colours ─────────────────────────────────────────────────────
const LN_CYAN  = 0x3fa9ff
const LN_AMBER = 0xf5a623

// ── Body classification ──────────────────────────────────────────────────────
const PLANET_IDS    = new Set(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'neptune'])
// The belt is a region, not a Target — every body here is a real, individually
// pickable target (see lib/data/targets.ts); this set only groups them for the
// zoomed-in "belt view" rendering below.
const BELT_BODY_IDS = new Set(['ceres', 'vesta', 'eros', 'ryugu', 'psyche', 'bennu', 'lutetia', 'itokawa'])

// ── Orbital constants ────────────────────────────────────────────────────────
const MAP_CENTER = { x: 187, y: 180 }

const ANGLES: Record<string, number> = {
  mercury: 200, venus: 320, earth: 70, mars: 140,
  eros: 45, bennu: 170, itokawa: 10, ryugu: 230, vesta: 310, psyche: 85,
  ceres: 190, lutetia: 285,
  jupiter: 30, saturn: 340, neptune: 120,
}

const BELT_SPREAD_ANGLES: Record<string, number> = {
  ceres: 0, vesta: 45, eros: 90, ryugu: 135,
  psyche: 180, bennu: 225, lutetia: 270, itokawa: 315,
}

const RADII: Record<number, number> = { 1: 36, 2: 60, 3: 84, 4: 108, 5: 132, 6: 158, 7: 184, 8: 208 }
const BELT_MID_ORBIT_R = (RADII[3] + RADII[5]) / 2 // 108 — midpoint of belt zone

// ── Spectral palette ─────────────────────────────────────────────────────────
// Colors key off the target's real composition archetype (target.archetype,
// see lib/data/target-archetypes.ts) instead of a separately-maintained
// per-id map — the two can no longer drift out of sync.
const SPECTRAL_PALETTE: Record<TargetArchetype, { fill: number; low: number; stroke: number; mark: number }> = {
  C: { fill: 0x3c3a36, low: 0x1e1c1a, stroke: 0x5a5450, mark: 0x7a7268 },
  S: { fill: 0x8a6040, low: 0x4a3020, stroke: 0xaa8060, mark: 0xd0a880 },
  M: { fill: 0x8090a0, low: 0x3c4a56, stroke: 0xa8bccc, mark: 0xd0e0ec },
  icy: { fill: 0x7ec8dc, low: 0x2e4a54, stroke: 0x9ee0f0, mark: 0xd4f4fa },
  'gas-giant': { fill: 0xc8a060, low: 0x6f4f2a, stroke: 0xe0b870, mark: 0xf2d39a },
}
const PLANET_COLORS: Record<string, { fill: number; low: number; stroke: number; mark: number }> = {
  mercury: { fill: 0x8a7060, low: 0x4d4038, stroke: 0xa08070, mark: 0xc1a292 },
  venus:   { fill: 0xe8c870, low: 0x9f7434, stroke: 0xd4a840, mark: 0xfff0a8 },
  earth:   { fill: 0x2a6ea4, low: 0x123152, stroke: 0x4a9ec4, mark: 0x54b36a },
  mars:    { fill: 0xc1440e, low: 0x5e2414, stroke: 0xe05020, mark: 0xf08a45 },
  jupiter: { fill: 0xc8a060, low: 0x6f4f2a, stroke: 0xe0b870, mark: 0xf2d39a },
  saturn:  { fill: 0xe0c880, low: 0x8a7145, stroke: 0xc8a860, mark: 0xfff2b8 },
  neptune: { fill: 0x2040c0, low: 0x091d66, stroke: 0x4060e0, mark: 0x79a2ff },
}

const ASTEROID_SILHOUETTES: [number, number][][] = [
  [[-0.62, -0.88], [0.58, -0.74], [0.96, -0.14], [0.66, 0.78], [-0.14, 0.94], [-0.92, 0.42]],
  [[-0.88, -0.44], [0.20, -0.92], [1.02, -0.28], [0.82, 0.40], [0.12, 0.88], [-0.78, 0.60], [-1.04, 0.06]],
  [[-0.48, -0.96], [0.30, -0.82], [0.94, -0.50], [1.04, 0.16], [0.60, 0.88], [-0.10, 0.98], [-0.72, 0.52], [-0.90, -0.20]],
  [[-0.72, -0.56], [0.00, -0.94], [0.72, -0.64], [0.98, 0.08], [0.68, 0.72], [0.00, 0.98], [-0.64, 0.68], [-0.94, 0.04]],
  [[-0.80, -0.30], [0.40, -0.90], [1.00, 0.00], [0.30, 0.82], [-0.90, 0.50]],
]

// Ring colour bands mirror the real mineral-rarity gates in target-archetypes
// (rare at orbit >= 2, exotic at orbit >= 4). They previously broke at <=2/<=5,
// which taught players a distance-to-reward mapping the game does not use.
function orbitRingColor(orbit: number, reachable: boolean): { color: number; alpha: number } {
  if (!reachable) return { color: 0xff5a6a, alpha: 0.22 }
  if (orbit < RARE_TIER_MIN_ORBIT) return { color: 0xc8a060, alpha: 0.18 }
  if (orbit < EXOTIC_TIER_MIN_ORBIT) return { color: LN_CYAN, alpha: 0.14 }
  return { color: 0x4060c0, alpha: 0.16 }
}

function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = (Math.imul(h, 0x01000193) >>> 0) }
  return h >>> 0
}

function seededFloat(seed: number, index: number): number {
  let h = seed ^ (index * 0x9e3779b9)
  h = ((h >> 16) ^ h) * 0x45d9f3b; h = ((h >> 16) ^ h) * 0x45d9f3b; h = (h >> 16) ^ h
  return (h >>> 0) / 0xffffffff
}

function bodyColors(target: Target) {
  if (PLANET_COLORS[target.id]) return PLANET_COLORS[target.id]
  return SPECTRAL_PALETTE[target.archetype ?? 'C']
}

function asteroidSilhouette(id: string): [number, number][] {
  return ASTEROID_SILHOUETTES[hashId(id) % ASTEROID_SILHOUETTES.length]
}

// ── Compute scale from canvas size and transition ────────────────────────────
function computeScale(width: number, height: number, transition: number): number {
  const maxR = (RADII[8] ?? 208) + ((RADII[4] ?? 108) - (RADII[8] ?? 208)) * transition
  const available = Math.max(72, Math.min(width * 0.46, height * 0.42))
  return available / maxR
}

// ── Draw background (stars + grid) ───────────────────────────────────────────
function drawBackground(layer: Container, w: number, h: number) {
  layer.removeChildren().forEach(c => c.destroy({ children: true }))
  const bg = new Graphics()
  bg.rect(0, 0, w, h).fill(0x03060a)
  bg.circle(w * 0.5, h * 0.5, Math.max(w, h) * 0.45).fill({ color: 0x0a1422, alpha: 0.88 })
  layer.addChild(bg)
  const stars = new Graphics()
  const ss: [number, number, number, number][] = [
    [0.08,0.12,1.0,0.45],[0.18,0.66,0.9,0.28],[0.27,0.25,1.3,0.34],
    [0.38,0.82,1.0,0.22],[0.46,0.18,0.8,0.30],[0.58,0.30,1.4,0.42],
    [0.69,0.72,1.0,0.28],[0.76,0.44,0.8,0.24],[0.84,0.76,1.1,0.32],
    [0.91,0.18,1.0,0.25],[0.22,0.88,0.7,0.22],[0.79,0.92,0.9,0.28],
  ]
  for (const [x, y, r, a] of ss) stars.circle(x * w, y * h, r).fill({ color: 0xffffff, alpha: a })
  layer.addChild(stars)
  const grid = new Graphics()
  for (let x = 0; x <= w; x += 40) grid.moveTo(x, 0).lineTo(x, h).stroke({ width: 1, color: 0x87cffa, alpha: 0.06 })
  for (let y = 0; y <= h; y += 40) grid.moveTo(0, y).lineTo(w, y).stroke({ width: 1, color: 0x87cffa, alpha: 0.06 })
  layer.addChild(grid)
}

// ── Draw orbit rings ─────────────────────────────────────────────────────────
function drawOrbits(layer: Container, props: PixiGalaxyMapProps, cx: number, cy: number, scale: number, transition: number) {
  layer.removeChildren().forEach(c => c.destroy({ children: true }))
  const g = new Graphics()
  const maxShown = 8
  for (let orbit = 1; orbit <= maxShown; orbit++) {
    const hasTarget = props.targets.some(t => t.orbit === orbit)
    const reachable = hasTarget && orbit <= props.mission.requires.max_orbit
    const { color, alpha } = orbitRingColor(orbit, reachable)
    const adjAlpha = orbit > 5 ? alpha * Math.max(0, 1 - transition * 3) : alpha
    g.circle(cx, cy, (RADII[orbit] ?? 84) * scale).stroke({ width: 1, color, alpha: adjAlpha })
  }
  const maxR = (RADII[props.mission.requires.max_orbit] ?? 132) * scale + 12
  g.circle(cx, cy, maxR).stroke({ width: 1, color: LN_AMBER, alpha: 0.4 })
  const sun = new Graphics()
  sun.circle(cx, cy, 22).fill(0xffe1a8)
  sun.circle(cx, cy, 28).stroke({ width: 1.5, color: LN_AMBER, alpha: 0.5 })
  layer.addChild(g, sun)
}

interface HitRegion { id: string; x: number; y: number; r: number; compatible: boolean }

// ── Draw a single body (NO pixi interaction — native canvas hit test handles it)
function drawBody(
  layer: Container,
  target: Target,
  sx: number, sy: number,
  isCompatible: boolean, isPicked: boolean,
  alpha: number,
  hits: HitRegion[],
) {
  const marker = new Container()
  marker.x = sx; marker.y = sy
  marker.alpha = alpha * (isCompatible ? 1 : 0.28)
  marker.eventMode = 'none' // all click handling via native canvas listener

  const radius = BELT_BODY_IDS.has(target.id) ? 14 : 13
  const colors = bodyColors(target)
  const seed = hashId(target.id)

  if (isPicked) {
    const glow = new Graphics()
    glow.circle(0, 0, radius + 9).fill({ color: LN_CYAN, alpha: 0.18 })
    glow.circle(0, 0, radius + 5).stroke({ width: 2, color: LN_CYAN, alpha: 0.95 })
    marker.addChild(glow)
  } else if (isCompatible) {
    // Amber ring on compatible-but-not-yet-selected bodies so they're discoverable
    const ring = new Graphics()
    ring.circle(0, 0, radius + 6).stroke({ width: 1.5, color: LN_AMBER, alpha: 0.7 })
    ring.circle(0, 0, radius + 10).fill({ color: LN_AMBER, alpha: 0.06 })
    marker.addChild(ring)
  }

  const g = new Graphics()
  if (BELT_BODY_IDS.has(target.id)) {
    const sil = asteroidSilhouette(target.id)
    g.poly(sil.flatMap(([x, y]) => [x * radius, y * radius])).fill(colors.fill).stroke({ width: 1.5, color: colors.stroke, alpha: 0.95 })
    g.circle((seededFloat(seed,1)-0.5)*radius*0.5, (seededFloat(seed,2)-0.5)*radius*0.5, seededFloat(seed,3)*radius*0.18+radius*0.08).fill({ color: colors.low, alpha: 0.52 })
    g.circle((seededFloat(seed,4)-0.5)*radius*0.7, (seededFloat(seed,5)-0.5)*radius*0.7, seededFloat(seed,6)*radius*0.12+radius*0.06).fill({ color: colors.mark, alpha: 0.36 })
  } else {
    g.circle(0, 0, radius).fill(colors.fill).stroke({ width: 1.5, color: colors.stroke, alpha: 0.95 })
    g.circle(-radius*0.25, -radius*0.28, radius*0.42).fill({ color: colors.mark, alpha: 0.28 })
    g.circle(radius*0.18, radius*0.22, radius*0.35).fill({ color: colors.low, alpha: 0.36 })
    if (target.id === 'saturn') g.ellipse(0, 0, radius*1.65, radius*0.38).stroke({ width: 1.5, color: colors.stroke, alpha: 0.65 })
  }
  marker.addChild(g)

  const label = new Text({ text: target.name, style: { fontFamily: 'var(--ln-font-mono), ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, fill: isPicked ? LN_CYAN : 0xcde4ff, letterSpacing: 0.6 } })
  label.anchor.set(0.5, 0)
  label.y = radius + 5
  const labelBg = new Graphics()
  labelBg.roundRect(-(label.width + 10) / 2, radius + 3, label.width + 10, 15, 3).fill({ color: 0x080c16, alpha: 0.74 })
  marker.addChild(labelBg, label)
  layer.addChild(marker)

  hits.push({ id: target.id, x: sx, y: sy, r: (BELT_BODY_IDS.has(target.id) ? 14 : 13) + 10, compatible: isCompatible })
}

// ── Draw the full scene ───────────────────────────────────────────────────────
function drawScene(
  layer: Container,
  props: PixiGalaxyMapProps,
  bodies: EntityData[],
  w: number, h: number,
  orbitPhase: number,
  transition: number,
  hits: HitRegion[],
) {
  layer.removeChildren().forEach(c => c.destroy({ children: true }))
  hits.length = 0 // reset hit regions each frame
  const cx = w / 2, cy = h / 2
  const scale = computeScale(w, h, transition)
  const eased = transition < 0.5 ? 2 * transition * transition : 1 - Math.pow(-2 * transition + 2, 2) / 2
  const planetAlpha = 1 - eased
  const beltAlpha   = eased

  // ── Belt zone decoration (no interaction — click handled by DOM button) ───────
  if (planetAlpha > 0.02) {
    const beltMidR = BELT_MID_ORBIT_R * scale
    const beltBandW = (RADII[5] - RADII[3]) * scale
    const zone = new Graphics()
    zone.circle(cx, cy, beltMidR).stroke({ width: beltBandW, color: 0x5a4a2a, alpha: 0.18 * planetAlpha })
    const microSeeds = [[0.18,0.34],[0.55,0.78],[0.82,0.12],[0.27,0.61],[0.71,0.45],[0.44,0.89],[0.93,0.27],[0.12,0.70],[0.63,0.15],[0.38,0.52]]
    for (const [a, r] of microSeeds) {
      const ang = a * Math.PI * 2
      const rad = (beltMidR - beltBandW * 0.4) + r * beltBandW * 0.8
      zone.circle(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 1.2).fill({ color: 0x8a7a5a, alpha: 0.55 * planetAlpha })
    }
    zone.eventMode = 'none'
    layer.addChild(zone)
  }

  // ── Solar-view bodies ────────────────────────────────────────────────────────
  if (planetAlpha > 0.02) {
    for (const target of props.targets) {
      if (BELT_BODY_IDS.has(target.id)) continue
      const knownAngle = ANGLES[target.id]
      const baseAngle = (knownAngle ?? (hashId(target.id) % 360)) * Math.PI / 180
      const drift = orbitPhase / Math.sqrt(Math.max(1, target.orbit))
      const angle = baseAngle + drift
      let pos: { x: number; y: number }
      const body = bodies.find(b => b.id === target.id)
      if (body) {
        pos = { x: body.transform.position.x - MAP_CENTER.x, y: body.transform.position.y - MAP_CENTER.y }
      } else {
        const orbR = RADII[target.orbit] ?? 84
        pos = { x: Math.cos(angle) * orbR, y: Math.sin(angle) * orbR }
      }
      drawBody(layer, target, cx + pos.x * scale, cy + pos.y * scale, props.compatibleIds.has(target.id), target.id === props.pickedId, planetAlpha, hits)
    }
  }

  // ── Belt asteroids ────────────────────────────────────────────────────────────
  if (beltAlpha > 0.02) {
    const beltTargets = props.targets.filter(t => BELT_BODY_IDS.has(t.id))
    beltTargets.forEach((target, i) => {
      const spreadAngle = (BELT_SPREAD_ANGLES[target.id] ?? (i / Math.max(1, beltTargets.length)) * 360) * Math.PI / 180
      const drift = orbitPhase * 0.5 / Math.sqrt(target.orbit)
      const angle = spreadAngle + drift
      const orbR = RADII[Math.min(target.orbit, 4)] ?? RADII[4]
      drawBody(layer, target, cx + Math.cos(angle) * orbR * scale, cy + Math.sin(angle) * orbR * scale, props.compatibleIds.has(target.id), target.id === props.pickedId, beltAlpha, hits)
    })
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PixiGalaxyMapProps {
  mission: Mission
  targets: Target[]
  compatibleIds: Set<string>
  pickedId: string
  onPick: (id: string) => void
  // Screen-owned content already starts below the reserved tutorial rail
  // (see TUTORIAL_CONTENT_TOP), but that budget assumes a single-line coach
  // step. Steps with both body and action text (e.g. "Choose a Destination")
  // render taller than the budget at narrow viewports, so this button's own
  // top:10 can still land under the coach card. Nudge it down further while
  // a coach step is active on this screen.
  hasCoach?: boolean
}

type MapView = 'solar' | 'belt'

// Belt button label position in pixels, computed from canvas size
interface BeltLabelPos { x: number; y: number }

function preferredView(compatibleIds: Set<string>): MapView {
  const ids = [...compatibleIds]
  if (ids.length > 0 && ids.every(id => BELT_BODY_IDS.has(id))) return 'belt'
  return 'solar'
}

export default function PixiGalaxyMap(props: PixiGalaxyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialView = preferredView(props.compatibleIds)
  const [view, setView] = useState<MapView>(initialView)
  const [beltLabelPos, setBeltLabelPos] = useState<BeltLabelPos | null>(null)
  const transitionRef       = useRef(initialView === 'belt' ? 1 : 0)
  const transitionTargetRef = useRef(initialView === 'belt' ? 1 : 0)
  const redrawOrbitRef = useRef<((t?: number) => void) | null>(null)
  const hitsRef = useRef<HitRegion[]>([])
  const propsRef = useRef(props)
  propsRef.current = props

  const compatibleKey = useMemo(() => [...props.compatibleIds].sort().join(','), [props.compatibleIds])

  const goToBelt = () => { transitionTargetRef.current = 1; setView('belt') }
  const goToSolar = () => { transitionTargetRef.current = 0; setView('solar') }

  // Compute belt label position for DOM button overlay
  function updateBeltPos(w: number, h: number) {
    const scale = computeScale(w, h, 0) // solar-view scale
    const beltMidR = BELT_MID_ORBIT_R * scale
    setBeltLabelPos({ x: w / 2, y: h / 2 - beltMidR })
  }

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;'
    canvas.dataset.testid = 'target-picker-pixi-map'
    parent.appendChild(canvas)

    const app = new Application()
    const bgLayer    = new Container()
    const orbitLayer = new Container()
    const bodyLayer  = new Container()

    let bodies: EntityData[] = []
    let orbitPhase = 0
    let initialized = false
    let destroyed = false
    let w = Math.max(280, parent.clientWidth)
    let h = Math.max(240, parent.clientHeight)

    const redrawStatic = (t?: number) => {
      t = t ?? transitionRef.current
      if (!initialized || destroyed) return
      w = Math.max(280, parent.clientWidth)
      h = Math.max(240, parent.clientHeight)
      app.renderer.resize(w, h)
      const scale = computeScale(w, h, t)
      drawBackground(bgLayer, w, h)
      drawOrbits(orbitLayer, propsRef.current, w / 2, h / 2, scale, t)
      updateBeltPos(w, h)
    }
    redrawOrbitRef.current = redrawStatic

    const observer = new ResizeObserver(() => redrawStatic())

    ;(async () => {
      try {
        const dpr = window.devicePixelRatio || 1
        await app.init({ canvas, width: w, height: h, background: 0x03060a, antialias: true, autoDensity: true, preserveDrawingBuffer: true, resolution: dpr })
        if (destroyed) { try { app.destroy() } catch (_) { /* pixi v8 */ } canvas.remove(); return }

        app.stage.addChild(bgLayer, orbitLayer, bodyLayer)
        initialized = true
        observer.observe(parent)

        app.ticker.add(ticker => {
          if (destroyed) return
          // Animate transition
          const tTarget = transitionTargetRef.current
          const diff = tTarget - transitionRef.current
          if (Math.abs(diff) > 0.001) {
            const step = 0.038 * ticker.deltaTime
            transitionRef.current = Math.abs(diff) <= step ? tTarget : transitionRef.current + Math.sign(diff) * step
            const scale = computeScale(w, h, transitionRef.current)
            drawOrbits(orbitLayer, propsRef.current, w / 2, h / 2, scale, transitionRef.current)
          }
          orbitPhase += 0.00042 * ticker.deltaTime
          drawScene(bodyLayer, propsRef.current, bodies, w, h, orbitPhase, transitionRef.current, hitsRef.current)
        })

        // Single native hit-test handler — bypasses PixiJS interactive objects
        // (which break when markers are destroyed+recreated every frame).
        canvas.addEventListener('pointerdown', e => {
          const rect = canvas.getBoundingClientRect()
          const dprLocal = window.devicePixelRatio || 1
          const mx = (e.clientX - rect.left) * (w / rect.width)
          const my = (e.clientY - rect.top) * (h / rect.height)
          void dprLocal
          const hit = hitsRef.current.find(b => b.compatible && Math.hypot(mx - b.x, my - b.y) <= b.r)
          if (hit) propsRef.current.onPick(hit.id)
        })

        Scene.load('/game/scenes/target-picker.scene.json')
          .then(data => { if (!destroyed) { bodies = data.entities ?? []; redrawStatic() } })
          .catch(() => redrawStatic())

        redrawStatic()
      } catch (err) {
        console.error('[PixiGalaxyMap] init failed:', err)
      }
    })()

    return () => {
      destroyed = true
      redrawOrbitRef.current = null
      observer.disconnect()
      if (initialized) { try { app.destroy() } catch { /* pixi v8 */ } canvas.remove() }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    redrawOrbitRef.current?.()
  }, [props.mission.requires.max_orbit, props.pickedId, compatibleKey, props.targets])

  useEffect(() => {
    const nextView = preferredView(props.compatibleIds)
    transitionTargetRef.current = nextView === 'belt' ? 1 : 0
    setView(nextView)
  }, [compatibleKey, props.compatibleIds])

  // How many compatible targets are belt asteroids vs solar bodies?
  const compatBeltCount = [...props.compatibleIds].filter(id => BELT_BODY_IDS.has(id)).length
  const compatSolarCount = [...props.compatibleIds].filter(id => !BELT_BODY_IDS.has(id)).length

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {/* Belt zone click — DOM button positioned over the belt ring label */}
      {view === 'solar' && beltLabelPos && (
        <button
          onClick={goToBelt}
          style={{
            position: 'absolute',
            left: beltLabelPos.x,
            top: beltLabelPos.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px',
            background: 'rgba(8,12,20,0.86)',
            border: '1px solid rgba(176,160,112,0.5)',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: 'var(--ln-font-mono), ui-monospace, monospace',
            fontSize: 10,
            fontWeight: 700,
            color: '#b0a070',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            pointerEvents: 'auto',
          }}
        >
          Asteroid Belt <span style={{ opacity: 0.8 }}>›</span>
        </button>
      )}

      {/* Back to solar system */}
      {view === 'belt' && (
        <button
          onClick={goToSolar}
          style={{
            position: 'absolute',
            top: props.hasCoach ? 74 : 10,
            left: 10,
            zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 11px 5px 8px',
            background: 'rgba(8,16,28,0.88)',
            border: '1px solid rgba(135,207,250,0.3)',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'var(--ln-font-mono), ui-monospace, monospace',
            fontSize: 10,
            fontWeight: 700,
            color: '#87cffa',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            pointerEvents: 'auto',
          }}
        >
          <span style={{ fontSize: 12 }}>‹</span> Solar System
          {compatSolarCount > 0 && (
            <span style={{ marginLeft: 4, background: 'rgba(245,166,35,0.2)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 4, padding: '1px 5px', color: '#f5a623', fontSize: 9 }}>
              {compatSolarCount} target{compatSolarCount !== 1 ? 's' : ''} there
            </span>
          )}
        </button>
      )}

      {/* Belt empty state — no compatible targets in the asteroid belt for this mission */}
      {view === 'belt' && compatBeltCount === 0 && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 12,
          right: 12,
          zIndex: 10,
          background: 'rgba(8,12,20,0.92)',
          border: '1px solid rgba(245,166,35,0.3)',
          borderRadius: 10,
          padding: '10px 14px',
          fontFamily: 'var(--ln-font-body), system-ui, sans-serif',
          fontSize: 12,
          color: '#f5a623',
          lineHeight: 1.4,
          pointerEvents: 'none',
        }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>No targets here</span>
          <br/>
          <span style={{ color: '#a9b8ce' }}>This mission needs minerals not found in the asteroid belt. Return to the solar system to pick a compatible target.</span>
        </div>
      )}
    </div>
  )
}
