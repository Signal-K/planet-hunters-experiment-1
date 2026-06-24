'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { Mission, Target } from '@/lib/data'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'

// ── Design token colours (must match globals.css) ───────────────────────────
const LN_CYAN   = 0x3fa9ff
const LN_AMBER  = 0xf5a623

// ── Orbital constants ───────────────────────────────────────────────────────
const MAP_CENTER = { x: 187, y: 180 }

const ANGLES: Record<string, number> = {
  mercury: 200, venus: 320, earth: 70,  mars: 140,
  eros: 45,     bennu: 170, itokawa: 10, ryugu: 230, vesta: 310, psyche: 85,
  belt: 250,    ceres: 190, lutetia: 285,
  jupiter: 30,  saturn: 340, neptune: 120,
}

const RADII: Record<number, number> = { 1: 36, 2: 60, 3: 84, 4: 108, 5: 132, 6: 158, 7: 184, 8: 208 }

// ── Spectral types → visual palette ─────────────────────────────────────────
type SpectralClass = 'C' | 'S' | 'M' | 'planet'

const SPECTRAL: Record<string, SpectralClass> = {
  // C-type: dark carbonaceous
  bennu: 'C', ryugu: 'C', ceres: 'C', lutetia: 'C', belt: 'C',
  // S-type: warm stone
  eros: 'S', itokawa: 'S', vesta: 'S',
  // M-type: metallic
  psyche: 'M',
  // planets
  mercury: 'planet', venus: 'planet', earth: 'planet', mars: 'planet',
  jupiter: 'planet', saturn: 'planet', neptune: 'planet',
}

const SPECTRAL_PALETTE: Record<SpectralClass, { fill: number; low: number; stroke: number; mark: number }> = {
  // dark grey/charcoal (C-type)
  C: { fill: 0x3c3a36, low: 0x1e1c1a, stroke: 0x5a5450, mark: 0x7a7268 },
  // warm stone/ochre (S-type)
  S: { fill: 0x8a6040, low: 0x4a3020, stroke: 0xaa8060, mark: 0xd0a880 },
  // silvery metallic (M-type)
  M: { fill: 0x8090a0, low: 0x3c4a56, stroke: 0xa8bccc, mark: 0xd0e0ec },
  // per-planet colours as fallback
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
// Each variant is an array of [x, y] normalized to unit radius (multiply by actual radius)
const ASTEROID_SILHOUETTES: [number, number][][] = [
  // 0 — chunky potato
  [[-0.62, -0.88], [0.58, -0.74], [0.96, -0.14], [0.66, 0.78], [-0.14, 0.94], [-0.92, 0.42]],
  // 1 — elongated rocky
  [[-0.88, -0.44], [0.20, -0.92], [1.02, -0.28], [0.82, 0.40], [0.12, 0.88], [-0.78, 0.60], [-1.04, 0.06]],
  // 2 — angular irregular
  [[-0.48, -0.96], [0.30, -0.82], [0.94, -0.50], [1.04, 0.16], [0.60, 0.88], [-0.10, 0.98], [-0.72, 0.52], [-0.90, -0.20]],
  // 3 — fat lumpy
  [[-0.72, -0.56], [0.00, -0.94], [0.72, -0.64], [0.98, 0.08], [0.68, 0.72], [0.00, 0.98], [-0.64, 0.68], [-0.94, 0.04]],
  // 4 — wedge/crescent
  [[-0.80, -0.30], [0.40, -0.90], [1.00, 0.00], [0.30, 0.82], [-0.90, 0.50]],
]

// ── Orbit ring zone tints ─────────────────────────────────────────────────────
function orbitRingColor(orbit: number, reachable: boolean): { color: number; alpha: number } {
  if (!reachable) return { color: 0xff5a6a, alpha: 0.22 }
  // inner → warm amber, mid → cyan, outer → cool blue
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

// ── Asteroid polygon helper ───────────────────────────────────────────────────
const ASTEROID_IDS = new Set(['eros', 'vesta', 'itokawa', 'ryugu', 'psyche', 'bennu', 'ceres', 'lutetia', 'belt'])

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

function drawOrbits(layer: Container, props: PixiGalaxyMapProps, centerX: number, centerY: number, scale: number) {
  layer.removeChildren().forEach(c => c.destroy({ children: true }))
  const g = new Graphics()
  for (let orbit = 1; orbit <= 8; orbit++) {
    const hasTarget = props.targets.some(t => t.orbit === orbit)
    const reachable = hasTarget && orbit <= props.mission.requires.max_orbit
    const { color, alpha } = orbitRingColor(orbit, reachable)
    g.circle(centerX, centerY, (RADII[orbit] ?? 84) * scale).stroke({ width: 1, color, alpha })
  }
  const maxOrbitRadius = (RADII[props.mission.requires.max_orbit] ?? 132) * scale + 12
  g.circle(centerX, centerY, maxOrbitRadius).stroke({ width: 1, color: LN_AMBER, alpha: 0.4 })

  const sun = new Graphics()
  sun.circle(centerX, centerY, 22).fill(0xffe1a8)
  sun.circle(centerX, centerY, 28).stroke({ width: 1.5, color: LN_AMBER, alpha: 0.5 })

  layer.addChild(g, sun)
}

function drawBodies(
  layer: Container,
  props: PixiGalaxyMapProps,
  bodies: EntityData[],
  width: number,
  height: number,
  orbitPhase: number,
) {
  layer.removeChildren().forEach(c => c.destroy({ children: true }))

  const centerX = width / 2
  const centerY = height / 2
  const availableRadius = Math.max(72, Math.min(width * 0.46, height * 0.42))
  const scale = availableRadius / (RADII[8] ?? 208)

  for (const target of props.targets) {
    // Animated orbital position
    const baseAngle = (ANGLES[target.id] ?? 0) * Math.PI / 180
    const drift = orbitPhase / Math.sqrt(target.orbit)
    const angle = baseAngle + drift

    let pos: { x: number; y: number }
    const body = bodies.find(b => b.id === target.id)
    if (body) {
      // scene-override: use scene JSON position (static, no drift)
      pos = { x: body.transform.position.x - MAP_CENTER.x, y: body.transform.position.y - MAP_CENTER.y }
    } else {
      const r = RADII[target.orbit] ?? 84
      pos = { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
    }

    const screenX = centerX + pos.x * scale
    const screenY = centerY + pos.y * scale
    const isCompatible = props.compatibleIds.has(target.id)
    const isPicked = target.id === props.pickedId

    const marker = new Container()
    marker.x = screenX
    marker.y = screenY
    marker.alpha = isCompatible ? 1 : 0.28
    marker.eventMode = isCompatible ? 'static' : 'none'
    marker.cursor = isCompatible ? 'pointer' : 'default'
    if (isCompatible) marker.on('pointertap', () => props.onPick(target.id))

    const radius = target.id === 'belt' ? 18 : ASTEROID_IDS.has(target.id) ? 14 : 13
    const colors = bodyColors(target)
    const seed = hashId(target.id)

    if (isPicked) {
      const glow = new Graphics()
      // AC6: selected body uses cyan glow (design system rule)
      glow.circle(0, 0, radius + 9).fill({ color: LN_CYAN, alpha: 0.18 })
      glow.circle(0, 0, radius + 5).stroke({ width: 2, color: LN_CYAN, alpha: 0.95 })
      marker.addChild(glow)
    }

    const g = new Graphics()
    if (ASTEROID_IDS.has(target.id)) {
      const silhouette = asteroidSilhouette(target.id)
      const pts = silhouette.flatMap(([sx, sy]) => [sx * radius, sy * radius])
      g.poly(pts).fill(colors.fill).stroke({ width: 1.5, color: colors.stroke, alpha: 0.95 })
      // Seeded surface detail placement
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
      // Saturn rings
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
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PixiGalaxyMapProps {
  mission: Mission
  targets: Target[]
  compatibleIds: Set<string>
  pickedId: string
  onPick: (id: string) => void
}

export default function PixiGalaxyMap(props: PixiGalaxyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const redrawRef = useRef<(() => void) | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props

  const compatibleKey = useMemo(() => [...props.compatibleIds].sort().join(','), [props.compatibleIds])

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return

    // Create canvas fresh each time so React StrictMode's double-invoke never
    // hands a stale WebGL context to a new Application instance.
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
    let width = Math.max(280, parent.clientWidth)
    let height = Math.max(240, parent.clientHeight)

    function getCenterAndScale() {
      const centerX = width / 2
      const centerY = height / 2
      const availableRadius = Math.max(72, Math.min(width * 0.46, height * 0.42))
      const scale = availableRadius / (RADII[8] ?? 208)
      return { centerX, centerY, scale }
    }

    const redrawStatic = () => {
      if (!initialized || destroyed) return
      width = Math.max(280, parent.clientWidth)
      height = Math.max(240, parent.clientHeight)
      app.renderer.resize(width, height)
      const { centerX, centerY, scale } = getCenterAndScale()
      drawBackground(bgLayer, width, height)
      drawOrbits(orbitLayer, propsRef.current, centerX, centerY, scale)
    }

    const redrawBodies = () => {
      if (!initialized || destroyed) return
      const { centerX, centerY } = getCenterAndScale()
      drawBodies(bodyLayer, propsRef.current, bodies, width, height, orbitPhase)
      void centerX; void centerY
    }

    const redraw = () => {
      redrawStatic()
      redrawBodies()
    }
    redrawRef.current = redraw

    const observer = new ResizeObserver(redrawStatic)

    ;(async () => {
      try {
        const dpr = window.devicePixelRatio || 1
        await app.init({
          canvas,
          width,
          height,
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
          orbitPhase += 0.00042 * ticker.deltaTime
          drawBodies(bodyLayer, propsRef.current, bodies, width, height, orbitPhase)
        })

        Scene.load('/game/scenes/target-picker.scene.json')
          .then(data => {
            if (destroyed) return
            bodies = data.entities ?? []
            redraw()
          })
          .catch(() => redraw())

        redraw()
      } catch (err) {
        console.error('[PixiGalaxyMap] init failed:', err)
      }
    })()

    return () => {
      destroyed = true
      redrawRef.current = null
      observer.disconnect()
      if (initialized) {
        try { app.destroy() } catch { /* pixi v8 cleanup */ }
        canvas.remove()
      }
      // else: async init will call try { app.destroy() } catch { /* pixi v8 cleanup */ } + canvas.remove() when it resolves
    }
  }, [])

  useEffect(() => {
    redrawRef.current?.()
  }, [props.mission.requires.max_orbit, props.pickedId, compatibleKey, props.targets])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}
