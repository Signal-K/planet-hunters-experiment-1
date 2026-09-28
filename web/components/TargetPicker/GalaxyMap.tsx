'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { Mission, Target, TargetArchetype } from '@/lib/data'

// ── Composition colour ───────────────────────────────────────────────────────
// Every body's base colour keys off its real composition archetype
// (target.archetype, see lib/data/target-archetypes.ts) or, for named
// planets, its actual identity — the same source PixiGalaxyMap's
// SPECTRAL_PALETTE/PLANET_COLORS read from, so the two maps can't drift.
// State (compatible / contract match / selected) used to be encoded by
// swapping this base colour out entirely, which made every asteroid read as
// the same flat grey or green depending on state — no sense of what body you
// were actually looking at. State is now layered on top as rings/glow
// instead, so the body's own identity colour always shows through.
const SPECTRAL_PALETTE: Record<TargetArchetype, { fill: string; low: string; stroke: string; mark: string }> = {
  C: { fill: '#3c3a36', low: '#1e1c1a', stroke: '#5a5450', mark: '#7a7268' },
  S: { fill: '#8a6040', low: '#4a3020', stroke: '#aa8060', mark: '#d0a880' },
  M: { fill: '#8090a0', low: '#3c4a56', stroke: '#a8bccc', mark: '#d0e0ec' },
  icy: { fill: '#7ec8dc', low: '#2e4a54', stroke: '#9ee0f0', mark: '#d4f4fa' },
  'gas-giant': { fill: '#c8a060', low: '#6f4f2a', stroke: '#e0b870', mark: '#f2d39a' },
}
const PLANET_COLORS: Record<string, { fill: string; low: string; stroke: string; mark: string }> = {
  mercury: { fill: '#8a7060', low: '#4d4038', stroke: '#a08070', mark: '#c1a292' },
  venus:   { fill: '#e8c870', low: '#9f7434', stroke: '#d4a840', mark: '#fff0a8' },
  earth:   { fill: '#2a6ea4', low: '#123152', stroke: '#4a9ec4', mark: '#54b36a' },
  mars:    { fill: '#c1440e', low: '#5e2414', stroke: '#e05020', mark: '#f08a45' },
  jupiter: { fill: '#c8a060', low: '#6f4f2a', stroke: '#e0b870', mark: '#f2d39a' },
  saturn:  { fill: '#e0c880', low: '#8a7145', stroke: '#c8a860', mark: '#fff2b8' },
  neptune: { fill: '#2040c0', low: '#091d66', stroke: '#4060e0', mark: '#79a2ff' },
}

function bodyColors(target: Target) {
  return PLANET_COLORS[target.id] ?? SPECTRAL_PALETTE[target.archetype ?? 'C']
}

// ── Orbital layout ───────────────────────────────────────────────────────────
// Fixed per-target angle so bodies don't jump around between renders — same
// ids/values as PixiGalaxyMap's ANGLES table, kept in sync deliberately (see
// that file's header comment on why the two must not drift).
const ANGLES: Record<string, number> = {
  mercury: 200, mars: 140, jupiter: 30,
  eros: 45, bennu: 170, itokawa: 10, ryugu: 230, vesta: 310, psyche: 85,
  ceres: 190, lutetia: 285,
}
// The old radii left the outer half of the chart empty, so the picker looked
// like a tiny diagram floating in a large card. These bands use the map
// viewport deliberately: even orbit 4 fills the readable centre on tutorial
// missions, while the outer bands still fit for later content.
const RADII: Record<number, number> = { 1: 60, 2: 105, 3: 150, 4: 195, 5: 240, 6: 285 }

const ASTEROID_SILHOUETTES: [number, number][][] = [
  [[-0.62, -0.88], [0.58, -0.74], [0.96, -0.14], [0.66, 0.78], [-0.14, 0.94], [-0.92, 0.42]],
  [[-0.88, -0.44], [0.20, -0.92], [1.02, -0.28], [0.82, 0.40], [0.12, 0.88], [-0.78, 0.60], [-1.04, 0.06]],
  [[-0.48, -0.96], [0.30, -0.82], [0.94, -0.50], [1.04, 0.16], [0.60, 0.88], [-0.10, 0.98], [-0.72, 0.52], [-0.90, -0.20]],
  [[-0.72, -0.56], [0.00, -0.94], [0.72, -0.64], [0.98, 0.08], [0.68, 0.72], [0.00, 0.98], [-0.64, 0.68], [-0.94, 0.04]],
  [[-0.80, -0.30], [0.40, -0.90], [1.00, 0.00], [0.30, 0.82], [-0.90, 0.50]],
]

const STAR_FIELD: Array<{ x: number; y: number; r: number; opacity: number }> = [
  { x: 42, y: 94, r: 1.4, opacity: 0.72 }, { x: 86, y: 178, r: 1, opacity: 0.5 },
  { x: 128, y: 62, r: 1.2, opacity: 0.8 }, { x: 176, y: 544, r: 1, opacity: 0.48 },
  { x: 224, y: 116, r: 1.5, opacity: 0.65 }, { x: 276, y: 588, r: 1, opacity: 0.72 },
  { x: 354, y: 48, r: 1, opacity: 0.5 }, { x: 404, y: 132, r: 1.3, opacity: 0.76 },
  { x: 468, y: 584, r: 1.1, opacity: 0.56 }, { x: 514, y: 86, r: 1.4, opacity: 0.7 },
  { x: 568, y: 224, r: 1, opacity: 0.6 }, { x: 602, y: 498, r: 1.4, opacity: 0.72 },
  { x: 74, y: 430, r: 1, opacity: 0.58 }, { x: 142, y: 382, r: 1.2, opacity: 0.42 },
  { x: 532, y: 370, r: 1, opacity: 0.46 }, { x: 590, y: 142, r: 1.2, opacity: 0.56 },
]

function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = (Math.imul(h, 0x01000193) >>> 0) }
  return h >>> 0
}

function asteroidSilhouette(id: string): [number, number][] {
  return ASTEROID_SILHOUETTES[hashId(id) % ASTEROID_SILHOUETTES.length]
}

function seededFloat(seed: number, index: number): number {
  let h = seed ^ (index * 0x9e3779b9)
  h = ((h >> 16) ^ h) * 0x45d9f3b; h = ((h >> 16) ^ h) * 0x45d9f3b; h = (h >> 16) ^ h
  return (h >>> 0) / 0xffffffff
}

const VIEW = 640
const CENTER = VIEW / 2
// On-screen sizes, in CSS px. The chart scales to its field, so these are
// converted to chart units each render: labels stay readable on a phone and
// don't balloon on a desktop.
const LABEL_PX = 12
const LABEL_PAD_PX = 4
const SUN_LABEL_PX = 10

interface GalaxyMapProps {
  mission: Mission
  targets: Target[]
  compatibleIds: Set<string>
  pickedId: string
  onPick: (id: string) => void
  eligibleOnlyHighlight?: boolean
}

type Box = { x: number; y: number; w: number; h: number }
const boxesHit = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

interface Body { t: Target; cx: number; cy: number; size: number; compatible: boolean }

// Each name tries below, above, beside and diagonal to its body, at two
// distances, and takes the first spot that doesn't cross another label,
// another body or the chart edge. The selected body goes first, then the
// selectable ones. A body whose name has nowhere clean to go keeps its body
// and loses only the visible label (its name stays in the accessible label).
function placeLabels(bodies: Body[], unit: number, frame: Box, pickedId: string): Map<string, Box> {
  const fontU = LABEL_PX * unit
  const padU = LABEL_PAD_PX * unit
  const h = fontU + padU * 2
  const placed = new Map<string, Box>()
  // Reserve each body's full footprint: its rings, and the reticle and
  // crosshair around the selected one.
  const reach = (b: Body) => b.size + (b.t.id === pickedId ? 12 * unit : 8 * Math.max(1, unit))
  const taken: Box[] = bodies.map(b => ({ x: b.cx - reach(b), y: b.cy - reach(b), w: reach(b) * 2, h: reach(b) * 2 }))
  const rank = (b: Body) => (b.t.id === pickedId ? 2 : 0) + Number(b.compatible)
  const order = [...bodies].sort((a, b) => rank(b) - rank(a))
  for (const b of order) {
    const w = b.t.name.length * fontU * 0.62 + padU * 2
    const gap = reach(b) - b.size + 2 * unit
    const spots: Box[] = []
    for (const d of [gap, gap + h]) {
      spots.push(
        { x: b.cx - w / 2, y: b.cy + b.size + d, w, h },
        { x: b.cx - w / 2, y: b.cy - b.size - d - h, w, h },
        { x: b.cx + b.size + d, y: b.cy - h / 2, w, h },
        { x: b.cx - b.size - d - w, y: b.cy - h / 2, w, h },
        { x: b.cx + b.size * 0.7 + d, y: b.cy + b.size * 0.7 + d * 0.5, w, h },
        { x: b.cx - b.size * 0.7 - d - w, y: b.cy + b.size * 0.7 + d * 0.5, w, h },
        { x: b.cx + b.size * 0.7 + d, y: b.cy - b.size * 0.7 - d * 0.5 - h, w, h },
        { x: b.cx - b.size * 0.7 - d - w, y: b.cy - b.size * 0.7 - d * 0.5 - h, w, h },
      )
    }
    const inFrame = (r: Box) => r.x >= frame.x && r.y >= frame.y && r.x + r.w <= frame.x + frame.w && r.y + r.h <= frame.y + frame.h
    // Only the selected body is guaranteed a label; the selection rail
    // names any other body the moment it is tapped.
    const spot = spots.find(r => inFrame(r) && !taken.some(o => boxesHit(r, o)))
      ?? (b.t.id === pickedId ? spots.find(inFrame) ?? spots[0] : undefined)
    if (!spot) continue
    placed.set(b.t.id, spot)
    taken.push(spot)
  }
  return placed
}

export default function GalaxyMap({ mission, targets, compatibleIds, pickedId, onPick, eligibleOnlyHighlight = false }: GalaxyMapProps) {
  const missionMinerals = new Set(Object.keys(mission.requires.minerals))
  // Tutorial missions need a close read of the reachable band. Keep the
  // outer context bodies in the chart, but use the viewport for the
  // actionable orbit range instead of leaving a large empty margin around it.
  const frame: Box = mission.requires.max_orbit <= 5 ? { x: 72, y: 72, w: 496, h: 496 } : { x: 0, y: 0, w: VIEW, h: VIEW }
  const chartViewBox = `${frame.x} ${frame.y} ${frame.w} ${frame.h}`

  // Chart units per CSS pixel. The square chart is letterboxed into its
  // field (xMidYMid meet), so the shorter side sets the scale.
  const fieldRef = useRef<HTMLDivElement>(null)
  const [unit, setUnit] = useState(1)
  useEffect(() => {
    const el = fieldRef.current
    if (!el) return
    const measure = () => {
      const side = Math.min(el.clientWidth, el.clientHeight)
      if (side > 0) setUnit(frame.w / side)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [frame.w])

  const bodies: Body[] = targets.map(t => {
    const angle = (ANGLES[t.id] ?? (hashId(t.id) % 360)) * Math.PI / 180
    const r = RADII[t.orbit] ?? 130
    // Never let a body render smaller than ~8px on screen.
    const size = Math.max(t.type === 'asteroid' ? 12 : 11, 8 * unit)
    return { t, cx: CENTER + r * Math.cos(angle), cy: CENTER + r * Math.sin(angle), size, compatible: compatibleIds.has(t.id) }
  })
  const labels = placeLabels(bodies, unit, frame, pickedId)

  return (
    <div
      ref={fieldRef}
      data-testid="target-picker-orbital-map"
      aria-label="Solar system target range map"
      style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--ln-text)', touchAction: 'manipulation' }}
    >
      <svg viewBox={chartViewBox} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: '100%', touchAction: 'manipulation' }}>
        {STAR_FIELD.map(star => (
          <circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={star.r} fill="var(--ln-map-star, var(--ln-panel))" opacity={star.opacity} />
        ))}
        {[1, 2, 3, 4, 5, 6].map(orbit => {
          const hasTarget = targets.some(t => t.orbit === orbit)
          if (!hasTarget) return null
          const reachable = orbit <= mission.requires.max_orbit
          return (
            <circle
              key={orbit}
              cx={CENTER} cy={CENTER} r={RADII[orbit]}
              fill="none"
              stroke={reachable ? 'var(--ln-cyan)' : 'var(--ln-crit)'}
              strokeWidth={1.25 * Math.max(1, unit)}
              strokeDasharray="2 6"
              opacity={reachable ? 0.68 : 0.34}
            />
          )
        })}

        {/* The central body is the sun, not a black UI node. Keep it warm
            and legible against the deep atlas field; reward amber rules do
            not apply to a celestial body. */}
        <circle cx={CENTER} cy={CENTER} r={42} fill="var(--ln-map-sun-soft, var(--ln-amber-soft))" />
        <circle cx={CENTER} cy={CENTER} r={31} fill="var(--ln-map-sun, var(--ln-amber))" stroke="var(--ln-map-sun, var(--ln-amber))" strokeWidth={1.5} />
        <circle cx={CENTER - 8} cy={CENTER - 8} r={7} fill="var(--ln-map-sun-soft, var(--ln-amber-soft))" />
        <text x={CENTER} y={CENTER + SUN_LABEL_PX * unit * 0.36} textAnchor="middle" fill="var(--ln-text)" fontFamily="var(--ln-font-display)" fontWeight={800} fontSize={SUN_LABEL_PX * unit} letterSpacing={1.2 * unit}>SUN</text>

        {bodies.map(({ t, cx, cy, size, compatible }) => {
          const isAsteroid = t.type === 'asteroid'
          const contractMatch = [...missionMinerals].every(mineral => t.minerals.includes(mineral))
          const selected = pickedId === t.id
          const sil = asteroidSilhouette(t.id)
          const polyPoints = sil.map(([mx, my]) => `${cx + mx * size},${cy + my * size}`).join(' ')
          const seed = hashId(t.id)
          const colors = bodyColors(t)
          // The body keeps its own composition colour at every state — an
          // out-of-range body just desaturates via the group opacity below.
          // Selection/contract-match are layered on as rings/glow instead
          // of overwriting the fill, so a picked body still reads as what
          // it actually is (metallic, icy, carbonaceous...) rather than
          // turning into a flat cyan disc.
          const lineColor = selected ? 'var(--ln-cyan)' : colors.stroke
          const label = labels.get(t.id)
          const ring = Math.max(1.25, 1.5 * unit)

          return (
            <g
              key={t.id}
              data-testid={`target-${t.id}`}
              opacity={compatible ? 1 : 0.4}
              role={compatible ? 'button' : undefined}
              tabIndex={compatible ? 0 : -1}
              style={{ cursor: compatible ? 'pointer' : 'default', touchAction: 'manipulation' }}
              onClick={compatible ? () => onPick(t.id) : undefined}
              onKeyDown={compatible ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onPick(t.id)
                }
              } : undefined}
              aria-label={compatible ? `Select ${t.name}` : `${t.name}, unavailable`}
            >
              {/* A forgiving hit area: at least 44px across on screen, which
                  phone Safari needs for fingertip precision. */}
              <circle cx={cx} cy={cy} r={Math.max(size + 18, 22 * unit)} fill="transparent" pointerEvents={compatible ? 'all' : 'none'} />
              {/* Faint cyan ring marks a compatible-but-unpicked body so
                  it's discoverable before the player commits, without
                  reaching for amber (reserved for payout/reward emphasis). */}
              {compatible && !selected && (
                <circle cx={cx} cy={cy} r={size + 6 * Math.max(1, unit)} fill="none" stroke="var(--ln-cyan)" strokeWidth={ring} opacity={0.5} />
              )}
              {contractMatch && (!eligibleOnlyHighlight || compatible) && !selected && (
                <circle cx={cx} cy={cy} r={size + 4 * Math.max(1, unit)} fill="none" stroke="var(--ln-ok)" strokeWidth={ring} strokeDasharray="2 3" opacity={0.85} />
              )}
              {isAsteroid ? (
                <>
                  <polygon points={polyPoints} fill={colors.fill} stroke={lineColor} strokeWidth={ring} />
                  {/* Facet shading — one low (shadow) facet, one mark
                      (highlight) facet, deterministically placed per body
                      id so the same target always reads the same way. */}
                  <polygon
                    points={sil.slice(0, Math.max(3, sil.length - 2)).map(([mx, my]) => `${cx + mx * size * 0.68},${cy + my * size * 0.68}`).join(' ')}
                    fill={colors.low}
                    opacity={compatible ? 0.75 : 0.5}
                  />
                  <polygon
                    points={sil.slice(1, Math.max(4, sil.length - 1)).map(([mx, my]) => `${cx + mx * size * 0.42},${cy + my * size * 0.42}`).join(' ')}
                    fill={colors.mark}
                    opacity={compatible ? 0.55 : 0.35}
                  />
                  <circle cx={cx + (seededFloat(seed, 1) - 0.5) * size * 0.7} cy={cy + (seededFloat(seed, 2) - 0.5) * size * 0.7} r={Math.max(1.5, size * (seededFloat(seed, 3) * 0.14 + 0.08))} fill={colors.low} opacity={0.55} />
                  <circle cx={cx + (seededFloat(seed, 4) - 0.5) * size * 0.9} cy={cy + (seededFloat(seed, 5) - 0.5) * size * 0.9} r={Math.max(1, size * (seededFloat(seed, 6) * 0.1 + 0.05))} fill={colors.mark} opacity={0.4} />
                </>
              ) : (
                <>
                  <circle cx={cx} cy={cy} r={size} fill={colors.fill} stroke={lineColor} strokeWidth={ring} />
                  {/* Terminator-style shading — a lit facet toward the sun
                      and a shadowed facet away from it, plus one accent
                      band, instead of one generic highlight arc. */}
                  <path d={`M ${cx - size * 0.78} ${cy - size * 0.22} Q ${cx} ${cy - size * 0.64} ${cx + size * 0.78} ${cy - size * 0.18}`} fill="none" stroke={colors.mark} strokeWidth={Math.max(1, size * 0.18)} opacity={0.85} />
                  <path d={`M ${cx - size * 0.6} ${cy + size * 0.42} Q ${cx + size * 0.1} ${cy + size * 0.7} ${cx + size * 0.7} ${cy + size * 0.3}`} fill="none" stroke={colors.low} strokeWidth={Math.max(1, size * 0.22)} opacity={0.7} />
                  {t.id === 'saturn' && <ellipse cx={cx} cy={cy} rx={size * 1.7} ry={size * 0.4} fill="none" stroke={colors.stroke} strokeWidth={ring} opacity={0.75} />}
                </>
              )}
              {/* Selected target: one cyan reticle. The selection rail below
                  the chart carries its name and orbit. */}
              {selected && (
                <>
                  <circle cx={cx} cy={cy} r={size + 8 * Math.max(1, unit)} fill="none" stroke="var(--ln-cyan)" strokeWidth={2 * Math.max(1, unit)} />
                  <line x1={cx - size - 12 * unit} y1={cy} x2={cx + size + 12 * unit} y2={cy} stroke="var(--ln-cyan)" strokeWidth={unit} opacity={0.55} />
                  <line x1={cx} y1={cy - size - 12 * unit} x2={cx} y2={cy + size + 12 * unit} stroke="var(--ln-cyan)" strokeWidth={unit} opacity={0.55} />
                </>
              )}
              {label && (
                <>
                  <rect x={label.x} y={label.y} width={label.w} height={label.h} rx={2 * unit} fill="var(--ln-text)" opacity={0.92} />
                  <text
                    x={label.x + label.w / 2}
                    y={label.y + label.h / 2}
                    dominantBaseline="central"
                    textAnchor="middle"
                    fill={selected ? 'var(--ln-cyan)' : compatible ? 'var(--ln-panel)' : 'var(--ln-text-muted)'}
                    fontFamily="var(--ln-font-mono)"
                    fontWeight={700}
                    fontSize={LABEL_PX * unit}
                  >{t.name}</text>
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
