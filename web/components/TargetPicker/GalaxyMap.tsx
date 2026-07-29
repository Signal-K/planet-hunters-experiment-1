'use client'

import React from 'react'
import type { Mission, Target, TargetArchetype } from '@/lib/data'

// ── Orbital layout ───────────────────────────────────────────────────────────
// Fixed per-target angle so bodies don't jump around between renders — same
// ids/values as PixiGalaxyMap's ANGLES table, kept in sync deliberately (see
// that file's header comment on why the two must not drift).
const ANGLES: Record<string, number> = {
  mercury: 200, mars: 140, jupiter: 30,
  eros: 45, bennu: 170, itokawa: 10, ryugu: 230, vesta: 310, psyche: 85,
  ceres: 190, lutetia: 285,
}
const RADII: Record<number, number> = { 1: 50, 2: 85, 3: 120, 4: 155, 5: 190, 6: 225 }

const ASTEROID_SILHOUETTES: [number, number][][] = [
  [[-0.62, -0.88], [0.58, -0.74], [0.96, -0.14], [0.66, 0.78], [-0.14, 0.94], [-0.92, 0.42]],
  [[-0.88, -0.44], [0.20, -0.92], [1.02, -0.28], [0.82, 0.40], [0.12, 0.88], [-0.78, 0.60], [-1.04, 0.06]],
  [[-0.48, -0.96], [0.30, -0.82], [0.94, -0.50], [1.04, 0.16], [0.60, 0.88], [-0.10, 0.98], [-0.72, 0.52], [-0.90, -0.20]],
  [[-0.72, -0.56], [0.00, -0.94], [0.72, -0.64], [0.98, 0.08], [0.68, 0.72], [0.00, 0.98], [-0.64, 0.68], [-0.94, 0.04]],
  [[-0.80, -0.30], [0.40, -0.90], [1.00, 0.00], [0.30, 0.82], [-0.90, 0.50]],
]

const SPECTRAL_PALETTE: Record<TargetArchetype, { fill: string; stroke: string }> = {
  C: { fill: '#3c3a36', stroke: '#5a5450' },
  S: { fill: '#8a6040', stroke: '#aa8060' },
  M: { fill: '#8090a0', stroke: '#a8bccc' },
  icy: { fill: '#7ec8dc', stroke: '#9ee0f0' },
  'gas-giant': { fill: '#c8a060', stroke: '#e0b870' },
}
const PLANET_COLORS: Record<string, { fill: string; stroke: string }> = {
  mercury: { fill: '#8a7060', stroke: '#a08070' },
  mars:    { fill: '#c1440e', stroke: '#e05020' },
  jupiter: { fill: '#c8a060', stroke: '#e0b870' },
}

function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = (Math.imul(h, 0x01000193) >>> 0) }
  return h >>> 0
}

function bodyColors(target: Target) {
  return PLANET_COLORS[target.id] ?? SPECTRAL_PALETTE[target.archetype ?? 'C']
}

function asteroidSilhouette(id: string): [number, number][] {
  return ASTEROID_SILHOUETTES[hashId(id) % ASTEROID_SILHOUETTES.length]
}

const VIEW = 640
const CENTER = VIEW / 2

interface GalaxyMapProps {
  mission: Mission
  targets: Target[]
  compatibleIds: Set<string>
  pickedId: string
  onPick: (id: string) => void
}

export default function GalaxyMap({ mission, targets, compatibleIds, pickedId, onPick }: GalaxyMapProps) {
  const missionMinerals = new Set(Object.keys(mission.requires.minerals))

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        data-testid="target-picker-orbital-map"
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          backgroundImage: 'radial-gradient(var(--ln-bg-grid) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          backgroundColor: 'var(--ln-void)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '12px',
        }}
      >
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} style={{ width: '100%', height: '100%', maxWidth: VIEW, maxHeight: VIEW }}>
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
                strokeWidth={1}
                strokeDasharray="2 6"
                opacity={reachable ? 0.28 : 0.22}
              />
            )
          })}

          {/* Sun */}
          <circle cx={CENTER} cy={CENTER} r={30} fill="var(--ln-amber)" opacity={0.12} />
          <circle cx={CENTER} cy={CENTER} r={15} fill="var(--ln-amber)" stroke="var(--ln-amber-press)" strokeWidth={1.5} />
          <text x={CENTER} y={CENTER + 4} textAnchor="middle" fill="var(--ln-void)" fontFamily="var(--ln-font-display)" fontWeight={700} fontSize={10} letterSpacing={1.5}>SOL</text>

          {targets.map(t => {
            const angle = (ANGLES[t.id] ?? (hashId(t.id) % 360)) * Math.PI / 180
            const r = RADII[t.orbit] ?? 130
            const cx = CENTER + r * Math.cos(angle)
            const cy = CENTER + r * Math.sin(angle)
            const isAsteroid = t.type === 'asteroid'
            const size = isAsteroid ? 12 : 11
            const colors = bodyColors(t)
            const compatible = compatibleIds.has(t.id)
            const contractMatch = t.minerals.some(m => missionMinerals.has(m))
            const selected = pickedId === t.id
            const sil = asteroidSilhouette(t.id)
            const polyPoints = sil.map(([mx, my]) => `${cx + mx * size},${cy + my * size}`).join(' ')

            return (
              <g
                key={t.id}
                opacity={compatible ? 1 : 0.32}
                style={{ cursor: 'pointer' }}
                onClick={() => onPick(t.id)}
              >
                {selected && (
                  <circle cx={cx} cy={cy} r={size + 8} fill="none" stroke="var(--ln-cyan)" strokeWidth={2} />
                )}
                {contractMatch && !selected && (
                  <circle cx={cx} cy={cy} r={size + 5} fill="none" stroke="var(--ln-amber)" strokeWidth={1.5} strokeDasharray="2 3" opacity={0.85} />
                )}
                {isAsteroid ? (
                  <polygon points={polyPoints} fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5} />
                ) : (
                  <circle cx={cx} cy={cy} r={size} fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5} />
                )}
                <rect x={cx - Math.max(30, t.name.length * 5.4 + 10) / 2} y={cy + size + 4} width={Math.max(30, t.name.length * 5.4 + 10)} height={15} fill="var(--ln-void)" opacity={0.75} />
                <text x={cx} y={cy + size + 15} textAnchor="middle" fill={selected ? 'var(--ln-cyan)' : 'var(--ln-text-dim)'} fontFamily="var(--ln-font-mono)" fontWeight={700} fontSize={9.5} letterSpacing={0.4}>{t.name}</text>
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '8px 16px 10px', borderTop: '1px solid var(--ln-hairline)', flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ln-cyan)' }} />Reachable
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ln-crit)', opacity: 0.6 }} />Out of range
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px dashed var(--ln-amber)' }} />Contract match
        </span>
      </div>
    </div>
  )
}
