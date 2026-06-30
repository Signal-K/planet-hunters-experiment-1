'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { Mission, Target } from '@/lib/data'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'

// ── Design token colours (must match globals.css) ───────────────────────────
const LN_CYAN   = 0x3fa9ff
const LN_AMBER  = 0xf5a623

// ── Which bodies belong to which view ───────────────────────────────────────
const PLANET_IDS   = new Set(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'neptune'])
const BELT_BODY_IDS = new Set(['ceres', 'vesta', 'eros', 'ryugu', 'psyche', 'bennu', 'lutetia', 'itokawa'])
// 'belt' is the zone marker shown in solar view — not a pickable body

// ── Orbital constants ───────────────────────────────────────────────────────
const MAP_CENTER = { x: 187, y: 180 }

const ANGLES: Record<string, number> = {
  mercury: 200, venus: 320, earth: 70,  mars: 140,
  eros: 45,     bennu: 170, itokawa: 10, ryugu: 230, vesta: 310, psyche: 85,
  ceres: 190, lutetia: 285,
  jupiter: 30,  saturn: 340, neptune: 120,
}

// Belt-view angles: spread asteroids evenly around a ring
const BELT_SPREAD_ANGLES: Record<string, number> = {
  ceres: 0, vesta: 45, eros: 90, ryugu: 135,
  psyche: 180, bennu: 225, lutetia: 270, itokawa: 315,
}

const RADII: Record<number, number> = { 1: 36, 2: 60, 3: 84, 4: 108, 5: 132, 6: 158, 7: 184, 8: 208 }

// ── Spectral types → visual palette ─────────────────────────────────────────
type SpectralClass = 'C' | 'S' | 'M' | 'planet'

const SPECTRAL: Record<string, SpectralClass> = {
  bennu: 'C', ryugu: 'C', ceres: 'C', lutetia: 'C',
  eros: 'S', itokawa: 'S', vesta: 'S',
  psyche: 'M',
  mercury: 'planet', venus: 'planet', earth: 'planet', mars: 'planet',
  jupiter: 'planet', saturn: 'planet', neptune: 'planet',
}

const SPECTRAL_PALETTE: Record<SpectralClass, { fill: number; low: number; stroke: number; mark: number }> = {
  C: { fill: 0x3c3a36, low: 0x1e1c1a, stroke: 0x5a5450, mark: 0x7a7268 },
  S: { fill: 0x8a6040, low: 0x4a3020, stroke: 0xaa8060, mark: 0xd0a880 },
  M: { fill: 0x8090a0, low: 0x3c4a56, stroke: 0xa8bccc, mark: 0xd0e0ec },
  planet: { fill: 0x607080, low: 0x283340, stroke: 0x809090, mark: 0xaab8bd },
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

// ── Asteroid silhouette variants ─────────────────────────────────────────────
const ASTEROID_SILHOUETTES: [number, number][][] = [
  [[-0.62, -0.88], [0.58, -0.74], [0.96, -0.14], [0.66, 0.78], [-0.14, 0.94], [-0.92, 0.42]],
  [[-0.88, -0.44], [0.20, -0.92], [1.02, -0.28], [0.82, 0.40], [0.12, 0.88], [-0.78, 0.60], [-1.04, 0.06]],
  [[-0.48, -0.96], [0.30, -0.82], [0.94, -0.50], [1.04, 0.16], [0.60, 0.88], [-0.10, 0.98], [-0.72, 0.52], [-0.90, -0.20]],
  [[-0.72, -0.56], [0.00, -0.94], [0.72, -0.64], [0.98, 0.08], [0.68, 0.72], [0.00, 0.98], [-0.64, 0.68], [-0.94, 0.04]],
  [[-0.80, -0.30], [0.40, -0.90], [1.00, 0.00], [0.30, 0.82], [-0.90, 0.50]],
]

// ── Orbit ring zone tints ─────────────────────────────────────────────────────
function orbitRingColor(orbit: number, reachable: boolean): { color: number; alpha: number } {
  if (!reachable) return { color: 0xff5a6a, alpha: 0.22 }
  if (orbit <= 2) return { color: 0xc8a060, alpha: 0.18 }
  if (orbit <= 5) return { color: LN_CYAN,  alpha: 0.14 }
  return               { color: 0x4060c0,  alpha: 0.16 }
}

// ── Deterministic hash seeded from body ID ────────────────────────────────────
function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = (Math.imul(h, 0x01000193) >>> 0)
  }
  return h >>> 0
}

function seededFloat(seed: number, index: number): number {
  let h = seed ^ (index * 0x9e3779b9)
  h = ((h >> 16) ^ h) * 0x45d9f3b
  h = ((h >> 16) ^ h) * 0x45d9f3b
  h = (h >> 16) ^ h
  return (h >>> 0) / 0xffffffff
}

// ── Body colour resolver ──────────────────────────────────────────────────────
function bodyColors(target: Target): { fill: number; low: number; stroke: number; mark: number } {
  if (PLANET_COLORS[target.id]) return PLANET_COLORS[target.id]
  const spectral = SPECTRAL[target.id] ?? 'C'
  return SPECTRAL_PALETTE[spectral]
}

function asteroidSilhouette(id: string): [number, number][] {
  const seed = hashId(id)
  return ASTEROID_SILHOUETTES[seed % ASTEROID_SILHOUETTES.length]
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawBackground(layer: Container, width: number, height: number) {
  layer.removeChildren().forEach(c => c.destroy({ children: true }))
  const bg = new Graphics()
  bg.rect(0, 0, width, height).fill(0x03060a)
  bg.circle(width * 0.5, height * 0.5, Math.max(width, height) * 0.45).fill({ color: 0x0a1422, alpha: 0.88 })
  layer.addChild(bg)

  const stars = new Graphics()
  const starSeeds: [number, number, number, number][] = [
    [0.08, 0.12, 1.0, 0.45], [0.18, 0.66, 0.9, 0.28], [0.27, 0.25, 1.3, 0.34],
    [0.38, 0.82, 1.0, 0.22], [0.46, 0.18, 0.8, 0.30], [0.58, 0.30, 1.4, 0.42],
    [0.69, 0.72, 1.0, 0.28], [0.76, 0.44, 0.8, 0.24], [0.84, 0.76, 1.1, 0.32],
    [0.91, 0.18, 1.0, 0.25], [0.22, 0.88, 0.7, 0.22], [0.79, 0.92, 0.9, 0.28],
  ]
  for (const [x, y, radius, alpha] of starSeeds) {
    stars.circle(x * width, y * height, radius).fill({ color: 0xffffff, alpha })
  }
  layer.addChild(stars)

  const grid = new Graphics()
  for (let x = 0; x <= width; x += 40) {
    grid.moveTo(x, 0).lineTo(x, height).stroke({ width: 1, color: 0x87cffa, alpha: 0.06 })
  }
  for (let y = 0; y <= height; y += 40) {
    grid.moveTo(0, y).lineTo(width, y).stroke({ width: 1, color: 0x87cffa, alpha: 0.06 })
  }
  layer.addChild(grid)
}

function drawOrbits(layer: Container, props: PixiGalaxyMapProps, centerX: number, centerY: number, scale: number, transition: number) {
  layer.removeChildren().forEach(c => c.destroy({ children: true }))
  const g = new Graphics()

  // In belt view only show belt-range orbits (1-5), hide outer ones
  const maxShown = transition > 0.5 ? 5 : 8
  for (let orbit = 1; orbit <= maxShown; orbit++) {
    const hasTarget = props.targets.some(t => t.orbit === orbit)
    const reachable = hasTarget && orbit <= props.mission.requires.max_orbit
    const { color, alpha } = orbitRingColor(orbit, reachable)
    const adjAlpha = orbit > 5 ? alpha * Math.max(0, 1 - transition * 3) : alpha
    g.circle(centerX, centerY, (RADII[orbit] ?? 84) * scale).stroke({ width: 1, color, alpha: adjAlpha })
  }
  const maxOrbitRadius = (RADII[props.mission.requires.max_orbit] ?? 132) * scale + 12
  if (props.mission.requires.max_orbit <= 5 || transition < 0.5) {
    g.circle(centerX, centerY, maxOrbitRadius).stroke({ width: 1, color: LN_AMBER, alpha: 0.4 })
  }

  const sun = new Graphics()
  sun.circle(centerX, centerY, 22).fill(0xffe1a8)
  sun.circle(centerX, centerY, 28).stroke({ width: 1.5, color: LN_AMBER, alpha: 0.5 })

  layer.addChild(g, sun)
}

function drawSingleBody(
  layer: Container,
  target: Target,
  screenX: number,
  screenY: number,
  isCompatible: boolean,
  isPicked: boolean,
  alpha: number,
  onPick: (id: string) => void,
) {
  const marker = new Container()
  marker.x = screenX
  marker.y = screenY
  marker.alpha = alpha * (isCompatible ? 1 : 0.28)
  marker.eventMode = (isCompatible && alpha > 0.3) ? 'static' : 'none'
  marker.cursor = isCompatible ? 'pointer' : 'default'
  if (isCompatible && alpha > 0.3) marker.on('pointertap', () => onPick(target.id))

  const radius = BELT_BODY_IDS.has(target.id) ? 14 : 13
  const colors = bodyColors(target)
  const seed = hashId(target.id)

  if (isPicked) {
    const glow = new Graphics()
    glow.circle(0, 0, radius + 9).fill({ color: LN_CYAN, alpha: 0.18 })
    glow.circle(0, 0, radius + 5).stroke({ width: 2, color: LN_CYAN, alpha: 0.95 })
    marker.addChild(glow)
  }

  const g = new Graphics()
  if (BELT_BODY_IDS.has(target.id)) {
    const silhouette = asteroidSilhouette(target.id)
    const pts = silhouette.flatMap(([sx, sy]) => [sx * radius, sy * radius])
    g.poly(pts).fill(colors.fill).stroke({ width: 1.5, color: colors.stroke, alpha: 0.95 })
    const cx1 = (seededFloat(seed, 1) - 0.5) * radius * 0.5
    const cy1 = (seededFloat(seed, 2) - 0.5) * radius * 0.5
    const cr1 = seededFloat(seed, 3) * radius * 0.18 + radius * 0.08
    const cx2 = (seededFloat(seed, 4) - 0.5) * radius * 0.7
    const cy2 = (seededFloat(seed, 5) - 0.5) * radius * 0.7
    const cr2 = seededFloat(seed, 6) * radius * 0.12 + radius * 0.06
    g.circle(cx1, cy1, cr1).fill({ color: colors.low, alpha: 0.52 })
    g.circle(cx2, cy2, cr2).fill({ color: colors.mark, alpha: 0.36 })
  } else {
    g.circle(0, 0, radius).fill(colors.fill).stroke({ width: 1.5, color: colors.stroke, alpha: 0.95 })
    g.circle(-radius * 0.25, -radius * 0.28, radius * 0.42).fill({ color: colors.mark, alpha: 0.28 })
    g.circle(radius * 0.18, radius * 0.22, radius * 0.35).fill({ color: colors.low, alpha: 0.36 })
    if (target.id === 'saturn') {
      g.ellipse(0, 0, radius * 1.65, radius * 0.38).stroke({ width: 1.5, color: colors.stroke, alpha: 0.65 })
    }
  }
  marker.addChild(g)

  const label = new Text({
    text: target.name,
    style: {
      fontFamily: 'var(--ln-font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 10,
      fill: isPicked ? LN_CYAN : 0xcde4ff,
      letterSpacing: 0.6,
    },
  })
  label.anchor.set(0.5, 0)
  label.y = radius + 5
  const labelBg = new Graphics()
  labelBg.roundRect(-(label.width + 10) / 2, radius + 3, label.width + 10, 15, 3)
    .fill({ color: 0x080c16, alpha: 0.74 })
  marker.addChild(labelBg, label)
  layer.addChild(marker)
}

function drawScene(
  layer: Container,
  props: PixiGalaxyMapProps,
  bodies: EntityData[],
  width: number,
  height: number,
  orbitPhase: number,
  transition: number,
  onBeltZoneClick: () => void,
) {
  layer.removeChildren().forEach(c => c.destroy({ children: true }))

  const centerX = width / 2
  const centerY = height / 2

  // Scale lerp: solar uses orbit-8 radius as max; belt zooms to orbit-4
  const solarMaxR = RADII[8] ?? 208
  const beltMaxR  = RADII[4] ?? 108
  const lerpedMaxR = solarMaxR + (beltMaxR - solarMaxR) * transition
  const availableRadius = Math.max(72, Math.min(width * 0.46, height * 0.42))
  const scale = availableRadius / lerpedMaxR

  const eased = transition < 0.5 ? 2 * transition * transition : 1 - Math.pow(-2 * transition + 2, 2) / 2
  const planetAlpha = 1 - eased
  const beltAlpha   = eased

  // ── Belt zone marker (solar view only) ─────────────────────────────────────
  if (planetAlpha > 0.02) {
    const beltMidR = (RADII[3] + RADII[5]) / 2 * scale
    const beltBandW = (RADII[5] - RADII[3]) * scale

    const beltZone = new Graphics()
    // Shaded band for the asteroid belt region
    beltZone.circle(centerX, centerY, beltMidR).stroke({ width: beltBandW, color: 0x5a4a2a, alpha: 0.18 * planetAlpha })

    // Scatter a few micro-rock dots to give texture
    const microSeeds = [
      [0.18, 0.34], [0.55, 0.78], [0.82, 0.12], [0.27, 0.61], [0.71, 0.45],
      [0.44, 0.89], [0.93, 0.27], [0.12, 0.70], [0.63, 0.15], [0.38, 0.52],
    ]
    for (const [a, r] of microSeeds) {
      const angle = a * Math.PI * 2
      const rad = (beltMidR - beltBandW * 0.4) + r * beltBandW * 0.8
      beltZone.circle(centerX + Math.cos(angle) * rad, centerY + Math.sin(angle) * rad, 1.2)
        .fill({ color: 0x8a7a5a, alpha: 0.55 * planetAlpha })
    }

    // Clickable transparent hit area over the belt ring
    const hitArea = new Graphics()
    hitArea.circle(centerX, centerY, beltMidR + beltBandW * 0.6).fill({ color: 0xffffff, alpha: 0 })
    hitArea.circle(centerX, centerY, Math.max(0, beltMidR - beltBandW * 0.6)).fill({ color: 0x000000, alpha: 0 })
    hitArea.eventMode = 'static'
    hitArea.cursor = 'pointer'
    hitArea.on('pointertap', onBeltZoneClick)
    hitArea.alpha = planetAlpha

    // Label at top of belt ring
    const beltLabelAngle = -Math.PI / 2 // top
    const lx = centerX + Math.cos(beltLabelAngle) * beltMidR
    const ly = centerY + Math.sin(beltLabelAngle) * beltMidR
    const beltLabel = new Text({
      text: 'ASTEROID BELT  ›',
      style: {
        fontFamily: 'var(--ln-font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 10,
        fill: 0xb0a070,
        letterSpacing: 1.2,
      },
    })
    beltLabel.anchor.set(0.5, 0.5)
    beltLabel.x = lx
    beltLabel.y = ly
    beltLabel.alpha = planetAlpha

    const beltLabelBg = new Graphics()
    beltLabelBg.roundRect(lx - (beltLabel.width + 12) / 2, ly - 9, beltLabel.width + 12, 18, 5)
      .fill({ color: 0x080c14, alpha: 0.82 * planetAlpha })

    layer.addChild(beltZone, hitArea, beltLabelBg, beltLabel)
  }

  // ── Planets (solar view) ─────────────────────────────────────────────────────
  if (planetAlpha > 0.02) {
    for (const target of props.targets) {
      if (!PLANET_IDS.has(target.id)) continue
      const baseAngle = (ANGLES[target.id] ?? 0) * Math.PI / 180
      const drift = orbitPhase / Math.sqrt(target.orbit)
      const angle = baseAngle + drift
      let pos: { x: number; y: number }
      const body = bodies.find(b => b.id === target.id)
      if (body) {
        pos = { x: body.transform.position.x - MAP_CENTER.x, y: body.transform.position.y - MAP_CENTER.y }
      } else {
        const r = RADII[target.orbit] ?? 84
        pos = { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
      }
      const screenX = centerX + pos.x * scale
      const screenY = centerY + pos.y * scale
      const isCompatible = props.compatibleIds.has(target.id)
      const isPicked = target.id === props.pickedId
      drawSingleBody(layer, target, screenX, screenY, isCompatible, isPicked, planetAlpha, props.onPick)
    }
  }

  // ── Belt asteroids (belt view) ───────────────────────────────────────────────
  if (beltAlpha > 0.02) {
    const beltTargets = props.targets.filter(t => BELT_BODY_IDS.has(t.id))
    const n = beltTargets.length || 1
    beltTargets.forEach((target, i) => {
      // Spread evenly around belt radius, using seeded offset per body
      const spreadAngle = (BELT_SPREAD_ANGLES[target.id] ?? (i / n) * 360) * Math.PI / 180
      const drift = orbitPhase * 0.5 / Math.sqrt(target.orbit)
      const angle = spreadAngle + drift
      // Use orbit 4 as belt ring (all belt bodies at ~same radius for clarity)
      const r = RADII[Math.min(target.orbit, 4)] ?? RADII[4]
      const screenX = centerX + Math.cos(angle) * r * scale
      const screenY = centerY + Math.sin(angle) * r * scale
      const isCompatible = props.compatibleIds.has(target.id)
      const isPicked = target.id === props.pickedId
      drawSingleBody(layer, target, screenX, screenY, isCompatible, isPicked, beltAlpha, props.onPick)
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

export default function PixiGalaxyMap(props: PixiGalaxyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<MapView>('solar')
  const transitionRef    = useRef(0)   // 0 = solar, 1 = belt; animated by ticker
  const transitionTargetRef = useRef(0)
  const setViewRef = useRef(setView)
  setViewRef.current = setView

  const redrawOrbitRef = useRef<(() => void) | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props

  const compatibleKey = useMemo(() => [...props.compatibleIds].sort().join(','), [props.compatibleIds])

  const goToBelt = () => {
    transitionTargetRef.current = 1
    setViewRef.current('belt')
  }
  const goToSolar = () => {
    transitionTargetRef.current = 0
    setViewRef.current('solar')
  }
  const goToBeltRef  = useRef(goToBelt)
  const goToSolarRef = useRef(goToSolar)
  goToBeltRef.current  = goToBelt
  goToSolarRef.current = goToSolar

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
    let width  = Math.max(280, parent.clientWidth)
    let height = Math.max(240, parent.clientHeight)

    function getScale() {
      const lerpedMaxR = (RADII[8] ?? 208) + ((RADII[4] ?? 108) - (RADII[8] ?? 208)) * transitionRef.current
      const availableRadius = Math.max(72, Math.min(width * 0.46, height * 0.42))
      return availableRadius / lerpedMaxR
    }

    const redrawStatic = () => {
      if (!initialized || destroyed) return
      width  = Math.max(280, parent.clientWidth)
      height = Math.max(240, parent.clientHeight)
      app.renderer.resize(width, height)
      const scale = getScale()
      drawBackground(bgLayer, width, height)
      drawOrbits(orbitLayer, propsRef.current, width / 2, height / 2, scale, transitionRef.current)
    }
    redrawOrbitRef.current = redrawStatic

    const observer = new ResizeObserver(redrawStatic)

    ;(async () => {
      try {
        const dpr = window.devicePixelRatio || 1
        await app.init({
          canvas, width, height,
          background: 0x03060a,
          antialias: true,
          autoDensity: true,
          preserveDrawingBuffer: true,
          resolution: dpr,
        })
        if (destroyed) { try { app.destroy() } catch (_) { /* pixi v8 cleanup */ } canvas.remove(); return }

        app.stage.addChild(bgLayer, orbitLayer, bodyLayer)
        initialized = true
        observer.observe(parent)

        app.ticker.add(ticker => {
          if (destroyed) return
          // Animate transition
          const tTarget  = transitionTargetRef.current
          const tCurrent = transitionRef.current
          const diff = tTarget - tCurrent
          if (Math.abs(diff) > 0.001) {
            const speed = 0.038 * ticker.deltaTime
            transitionRef.current = Math.abs(diff) <= speed ? tTarget : tCurrent + Math.sign(diff) * speed
            // Rebuild orbit rings as scale changes
            const scale = getScale()
            drawOrbits(orbitLayer, propsRef.current, width / 2, height / 2, scale, transitionRef.current)
          }

          orbitPhase += 0.00042 * ticker.deltaTime
          drawScene(
            bodyLayer, propsRef.current, bodies, width, height,
            orbitPhase, transitionRef.current,
            () => goToBeltRef.current(),
          )
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
      if (initialized) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
        canvas.remove()
      }
    }
  }, [])

  // Refire static redraw when mission/targets/compat change
  useEffect(() => {
    redrawOrbitRef.current?.()
  }, [props.mission.requires.max_orbit, props.pickedId, compatibleKey, props.targets])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {/* Belt drill-down back button */}
      {view === 'belt' && (
        <button
          onClick={() => goToSolarRef.current()}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
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
          }}
        >
          <span style={{ fontSize: 12 }}>‹</span> Solar System
        </button>
      )}
    </div>
  )
}
