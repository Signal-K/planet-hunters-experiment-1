'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { capDpr } from '@/lib/engine/pixiDisplay'
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { Mission, Target, TargetArchetype } from '@/lib/data'
import { RARE_TIER_MIN_ORBIT, EXOTIC_TIER_MIN_ORBIT } from '@/lib/data'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'

// ── Design token colours ─────────────────────────────────────────────────────
// Light blueprint: paper ground, ink outlines, cyan/teal/ice accents only (SSL-426).
const LN_CYAN  = 0x1f78c1
const LN_AMBER = 0x42a6df
const LN_INK   = 0x0f2436
const LN_PAPER = 0xeef3f8

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
  S: { fill: 0x408a88, low: 0x204a47, stroke: 0x60aaa8, mark: 0x80cdd0 },
  M: { fill: 0x8090a0, low: 0x3c4a56, stroke: 0xa8bccc, mark: 0xd0e0ec },
  icy: { fill: 0x7ec8dc, low: 0x2e4a54, stroke: 0x9ee0f0, mark: 0xd4f4fa },
  'gas-giant': { fill: 0x60b8c8, low: 0x2a6a6f, stroke: 0x70cce0, mark: 0x9be1f1 },
}
const PLANET_COLORS: Record<string, { fill: number; low: number; stroke: number; mark: number }> = {
  mercury: { fill: 0x8a7060, low: 0x4d4038, stroke: 0xa08070, mark: 0xc1a292 },
  venus:   { fill: 0x70c8e8, low: 0x34909f, stroke: 0x40b1d4, mark: 0xfff0a8 },
  earth:   { fill: 0x2a6ea4, low: 0x123152, stroke: 0x4a9ec4, mark: 0x54b36a },
  mars:    { fill: 0x1ab59e, low: 0x145e4d, stroke: 0x21dfb9, mark: 0x4fe6de },
  jupiter: { fill: 0x60b8c8, low: 0x2a6a6f, stroke: 0x70cce0, mark: 0x9be1f1 },
  saturn:  { fill: 0x80c5e0, low: 0x457e8a, stroke: 0x60b0c8, mark: 0xfff2b8 },
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
  if (!reachable) return { color: LN_INK, alpha: 0.16 }
  if (orbit < RARE_TIER_MIN_ORBIT) return { color: 0x42a6df, alpha: 0.5 }
  if (orbit < EXOTIC_TIER_MIN_ORBIT) return { color: 0x1f78c1, alpha: 0.45 }
  return { color: 0x168a80, alpha: 0.45 }
}

function hashId(id: string): number {
  let h = 0x1c5a9dc5
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = (Math.imul(h, 0x01000193) >>> 0) }
  return h >>> 0
}

function seededFloat(seed: number, index: number): number {
  let h = seed ^ (index * 0x374b9eb9)
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
  bg.rect(0, 0, w, h).fill(LN_PAPER)
  layer.addChild(bg)
  const grid = new Graphics()
  for (let x = 0; x <= w; x += 40) grid.moveTo(x, 0).lineTo(x, h).stroke({ width: 1, color: LN_INK, alpha: 0.07 })
  for (let y = 0; y <= h; y += 40) grid.moveTo(0, y).lineTo(w, y).stroke({ width: 1, color: LN_INK, alpha: 0.07 })
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
    g.circle(cx, cy, (RADII[orbit] ?? 84) * scale).stroke({ width: reachable ? 2 : 1, color, alpha: adjAlpha })
  }
  const maxR = (RADII[props.mission.requires.max_orbit] ?? 132) * scale + 12
  g.circle(cx, cy, maxR).stroke({ width: 2, color: LN_AMBER, alpha: 0.7 })
  const sun = new Graphics()
  sun.circle(cx, cy, 22).fill(0xdff1fa).stroke({ width: 2.5, color: LN_INK })
  sun.circle(cx, cy, 28).stroke({ width: 1.5, color: LN_AMBER, alpha: 0.7 })
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
  marker.alpha = alpha * (isCompatible ? 1 : 0.5)
  marker.eventMode = 'none' // all click handling via native canvas listener

  const radius = BELT_BODY_IDS.has(target.id) ? 17 : 16
  const colors = bodyColors(target)
  const seed = hashId(target.id)

  if (isPicked) {
    const glow = new Graphics()
    glow.circle(0, 0, radius + 10).fill({ color: LN_CYAN, alpha: 0.2 })
    glow.circle(0, 0, radius + 6).stroke({ width: 3, color: LN_CYAN })
    marker.addChild(glow)
  } else if (isCompatible) {
    // Amber ring on compatible-but-not-yet-selected bodies so they're discoverable
    const ring = new Graphics()
    ring.circle(0, 0, radius + 10).fill({ color: LN_AMBER, alpha: 0.22 })
    ring.circle(0, 0, radius + 6).stroke({ width: 3, color: LN_AMBER })
    marker.addChild(ring)
  }

  const g = new Graphics()
  if (BELT_BODY_IDS.has(target.id)) {
    const sil = asteroidSilhouette(target.id)
    g.poly(sil.flatMap(([x, y]) => [x * radius, y * radius])).fill(colors.fill).stroke({ width: 2.5, color: LN_INK })
    g.circle((seededFloat(seed,1)-0.5)*radius*0.5, (seededFloat(seed,2)-0.5)*radius*0.5, seededFloat(seed,3)*radius*0.18+radius*0.08).fill({ color: colors.low, alpha: 0.52 })
    g.circle((seededFloat(seed,4)-0.5)*radius*0.7, (seededFloat(seed,5)-0.5)*radius*0.7, seededFloat(seed,6)*radius*0.12+radius*0.06).fill({ color: colors.mark, alpha: 0.36 })
  } else {
    g.circle(0, 0, radius).fill(colors.fill).stroke({ width: 2.5, color: LN_INK })
    g.circle(-radius*0.25, -radius*0.28, radius*0.42).fill({ color: colors.mark, alpha: 0.28 })
    g.circle(radius*0.18, radius*0.22, radius*0.35).fill({ color: colors.low, alpha: 0.36 })
    if (target.id === 'saturn') g.ellipse(0, 0, radius*1.65, radius*0.38).stroke({ width: 2.5, color: LN_INK, alpha: 0.8 })
  }
  marker.addChild(g)

  const label = new Text({ text: target.name, style: { fontFamily: 'var(--ln-font-display), ui-sans-serif, system-ui, sans-serif', fontSize: 14, fontWeight: '700', fill: isPicked ? LN_CYAN : LN_INK, letterSpacing: 0.6 } })
  label.anchor.set(0.5, 0)
  label.y = radius + 7
  const labelBg = new Graphics()
  labelBg.roundRect(-(label.width + 14) / 2, radius + 4, label.width + 14, 22, 5).fill({ color: 0xffffff, alpha: 0.96 }).stroke({ width: 1.5, color: LN_INK, alpha: 0.5 })
  marker.addChild(labelBg, label)
  layer.addChild(marker)

  hits.push({ id: target.id, x: sx, y: sy, r: Math.max(22, radius + 8), compatible: isCompatible })
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
    zone.circle(cx, cy, beltMidR).stroke({ width: beltBandW, color: 0x42a6df, alpha: 0.1 * planetAlpha })
    const microSeeds = [[0.18,0.34],[0.55,0.78],[0.82,0.12],[0.27,0.61],[0.71,0.45],[0.44,0.89],[0.93,0.27],[0.12,0.70],[0.63,0.15],[0.38,0.52]]
    for (const [a, r] of microSeeds) {
      const ang = a * Math.PI * 2
      const rad = (beltMidR - beltBandW * 0.4) + r * beltBandW * 0.8
      zone.circle(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 1.2).fill({ color: LN_INK, alpha: 0.4 * planetAlpha })
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
  const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 3200)
    return () => window.clearTimeout(id)
  }, [notice])
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
        const dpr = capDpr()
        await app.init({ canvas, width: w, height: h, background: LN_PAPER, antialias: true, autoDensity: true, resolution: dpr })
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
          const hit = hitsRef.current.find(b => Math.hypot(mx - b.x, my - b.y) <= b.r)
          if (!hit) return
          if (hit.compatible) { propsRef.current.onPick(hit.id); setNotice(null); return }
          const t = propsRef.current.targets.find(x => x.id === hit.id)
          const tooFar = !!t && t.orbit > propsRef.current.mission.requires.max_orbit
          setNotice(`${t?.name ?? 'That target'}: ${tooFar ? 'too far, needs more fuel' : 'does not fit this mission'}`)
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
            padding: '0 14px',
            minHeight: 44,
            background: '#fff',
            border: '2px solid #0f2436',
            boxShadow: '3px 3px 0 #42a6df',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'var(--ln-font-display), ui-sans-serif, system-ui, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            color: '#0f2436',
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
            top: 10,
            left: 10,
            zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '0 14px 0 10px',
            minHeight: 44,
            background: '#fff',
            border: '2px solid #0f2436',
            boxShadow: '3px 3px 0 #42a6df',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'var(--ln-font-display), ui-sans-serif, system-ui, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            color: '#0f2436',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            pointerEvents: 'auto',
          }}
        >
          <span style={{ fontSize: 16 }}>‹</span> Solar System
          {compatSolarCount > 0 && (
            <span style={{ marginLeft: 4, background: '#dff1fa', border: '1.5px solid #1f78c1', borderRadius: 4, padding: '1px 6px', color: '#17639f', fontSize: 14 }}>
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
          background: '#fff',
          border: '2px solid #0f2436',
          boxShadow: '3px 3px 0 #42a6df',
          borderRadius: 10,
          padding: '10px 14px',
          fontFamily: 'var(--ln-font-body), system-ui, sans-serif',
          fontSize: 14,
          color: '#17639f',
          lineHeight: 1.4,
          pointerEvents: 'none',
        }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>No targets here</span>
          <br/>
          <span style={{ color: '#48596a' }}>This mission needs minerals not found in the asteroid belt. Return to the solar system to pick a compatible target.</span>
        </div>
      )}
      {notice && (
        <div role="status" data-testid="map-blocked-reason" style={{
          position: 'absolute', bottom: 16, left: 12, right: 12, zIndex: 11,
          background: '#fff', border: '2px solid #0f2436', boxShadow: '3px 3px 0 #42a6df',
          borderRadius: 10, padding: '12px 14px', fontFamily: 'var(--ln-font-body), system-ui, sans-serif',
          fontSize: 14, fontWeight: 600, color: '#0f2436', pointerEvents: 'none',
        }}>{notice}</div>
      )}
    </div>
  )
}
