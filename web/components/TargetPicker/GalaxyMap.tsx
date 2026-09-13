'use client'

import React from 'react'
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

interface GalaxyMapProps {
  mission: Mission
  targets: Target[]
  compatibleIds: Set<string>
  pickedId: string
  onPick: (id: string) => void
  eligibleOnlyHighlight?: boolean
}

export default function GalaxyMap({ mission, targets, compatibleIds, pickedId, onPick, eligibleOnlyHighlight = false }: GalaxyMapProps) {
  const missionMinerals = new Set(Object.keys(mission.requires.minerals))
  // Tutorial missions need a close read of the reachable band. Keep the
  // outer context bodies in the chart, but use the viewport for the
  // actionable orbit range instead of leaving a large empty margin around it.
  const chartViewBox = mission.requires.max_orbit <= 5 ? '72 72 496 496' : `0 0 ${VIEW} ${VIEW}`

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        data-testid="target-picker-orbital-map"
        aria-label="Solar system target range map"
        style={{
          // Keep a real chart viewport even while the surrounding setup
          // shell is resolving its flex height. The old minHeight: 0 let a
          // transient zero-height parent squash the SVG to an apparently
          // empty map (KES-172).
          flex: '1 1 clamp(240px, 45vh, 520px)',
          minHeight: 'clamp(240px, 45vh, 520px)',
          minWidth: 0,
          position: 'relative',
          backgroundColor: 'var(--ln-text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '12px',
          touchAction: 'manipulation',
        }}
      >
        <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 1, pointerEvents: 'none', font: '800 9px var(--ln-font-display)', letterSpacing: '0.2em', color: 'var(--ln-panel)', textTransform: 'uppercase' }}>
          Solar system · target range
        </div>
        <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 1, pointerEvents: 'none', font: '700 9px var(--ln-font-mono)', letterSpacing: '0.12em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
          Orbit bands
        </div>
        <svg viewBox={chartViewBox} style={{ width: '100%', height: '100%', maxWidth: VIEW, maxHeight: VIEW, touchAction: 'manipulation' }}>
          <defs>
            <filter id="target-map-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>
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
                strokeWidth={1.25}
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
          <text x={CENTER} y={CENTER + 4} textAnchor="middle" fill="var(--ln-text)" fontFamily="var(--ln-font-display)" fontWeight={800} fontSize={9} letterSpacing={1.2}>SUN</text>

          {targets.map(t => {
            const angle = (ANGLES[t.id] ?? (hashId(t.id) % 360)) * Math.PI / 180
            const r = RADII[t.orbit] ?? 130
            const cx = CENTER + r * Math.cos(angle)
            const cy = CENTER + r * Math.sin(angle)
            const isAsteroid = t.type === 'asteroid'
            const size = isAsteroid ? 12 : 11
            const compatible = compatibleIds.has(t.id)
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

            return (
              <g
                key={t.id}
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
                {/* Give each body a forgiving native SVG hit area. The visual
                    marker is intentionally small, but a 44px touch target is
                    required on phone Safari where fingertip precision is much
                    lower than a desktop pointer. */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={size + 18}
                  fill="transparent"
                  pointerEvents={compatible ? 'all' : 'none'}
                />
                {/* Faint cyan ring marks a compatible-but-unpicked body so
                    it's discoverable before the player commits, without
                    reaching for amber (reserved for payout/reward emphasis). */}
                {compatible && !selected && (
                  <circle cx={cx} cy={cy} r={size + 6} fill="none" stroke="var(--ln-cyan)" strokeWidth={1.25} opacity={0.4} />
                )}
                {contractMatch && (!eligibleOnlyHighlight || compatible) && !selected && (
                  <circle cx={cx} cy={cy} r={size + 5} fill="none" stroke="var(--ln-ok)" strokeWidth={1.5} strokeDasharray="2 3" opacity={0.85} />
                )}
                {isAsteroid ? (
                  <>
                    <polygon points={polyPoints} fill={colors.fill} stroke={lineColor} strokeWidth={1.5} />
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
                    <circle cx={cx} cy={cy} r={size} fill={colors.fill} stroke={lineColor} strokeWidth={1.5} />
                    {/* Terminator-style shading — a lit facet toward the sun
                        and a shadowed facet away from it, plus one accent
                        band, instead of one generic highlight arc. */}
                    <path d={`M ${cx - size * 0.78} ${cy - size * 0.22} Q ${cx} ${cy - size * 0.64} ${cx + size * 0.78} ${cy - size * 0.18}`} fill="none" stroke={colors.mark} strokeWidth={Math.max(1, size * 0.18)} opacity={0.85} />
                    <path d={`M ${cx - size * 0.6} ${cy + size * 0.42} Q ${cx + size * 0.1} ${cy + size * 0.7} ${cx + size * 0.7} ${cy + size * 0.3}`} fill="none" stroke={colors.low} strokeWidth={Math.max(1, size * 0.22)} opacity={0.7} />
                    {t.id === 'saturn' && <ellipse cx={cx} cy={cy} rx={size * 1.7} ry={size * 0.4} fill="none" stroke={colors.stroke} strokeWidth={1.5} opacity={0.75} />}
                  </>
                )}
                {/* Selected target — cyan reticle plus a dimension line running
                    out to a label, the one saturated mark on the chart. */}
                {selected && (
                  <>
                    <circle cx={cx} cy={cy} r={size + 8} fill="none" stroke="var(--ln-cyan)" strokeWidth={2} />
                    <line x1={cx - size - 8} y1={cy} x2={cx + size + 8} y2={cy} stroke="var(--ln-cyan)" strokeWidth={1} opacity={0.55} />
                    <line x1={cx} y1={cy - size - 8} x2={cx} y2={cy + size + 8} stroke="var(--ln-cyan)" strokeWidth={1} opacity={0.55} />
                    <line x1={cx} y1={cy} x2={cx + size + 26} y2={cy - size - 26} stroke="var(--ln-cyan)" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
                  </>
                )}
                <rect x={cx - Math.max(30, t.name.length * 5.4 + 10) / 2} y={cy + size + 4} width={Math.max(30, t.name.length * 5.4 + 10)} height={15} fill="var(--ln-text)" opacity={0.9} />
                <text x={cx} y={cy + size + 15} textAnchor="middle" fill={selected ? 'var(--ln-cyan)' : compatible ? 'var(--ln-panel)' : 'var(--ln-text-muted)'} fontFamily="var(--ln-font-mono)" fontWeight={700} fontSize={9.5} letterSpacing={0.4}>{t.name}</text>
                {selected && (
                  <>
                    <rect x={cx + size + 28} y={cy - size - 40} width={Math.max(58, t.name.length * 5.6 + 20)} height={17} fill="var(--ln-text)" stroke="var(--ln-cyan)" strokeWidth={1} rx={2} />
                    <text x={cx + size + 34} y={cy - size - 27} textAnchor="start" fill="var(--ln-cyan)" fontFamily="var(--ln-font-mono)" fontWeight={700} fontSize={9} letterSpacing={0.5}>
                      SELECTED · ORBIT {t.orbit}
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '8px 16px 10px', borderTop: '1px solid var(--ln-hairline)', flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--ln-cyan)', opacity: 0.6 }} />Reachable and selectable
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ln-crit)', opacity: 0.6 }} />Out of range
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px dashed var(--ln-ok)' }} />{eligibleOnlyHighlight ? 'Mission-compatible' : 'Contract match'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--ln-cyan)' }} />Selected
        </span>
      </div>
    </div>
  )
}
