'use client'

import React from 'react'
import type { Mission, Target } from '@/lib/data'

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

function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = (Math.imul(h, 0x01000193) >>> 0) }
  return h >>> 0
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
          touchAction: 'manipulation',
        }}
      >
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} style={{ width: '100%', height: '100%', maxWidth: VIEW, maxHeight: VIEW, touchAction: 'manipulation' }}>
          <defs>
            <filter id="target-map-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>
          {[1, 2, 3, 4, 5, 6].map(orbit => {
            const hasTarget = targets.some(t => t.orbit === orbit)
            if (!hasTarget) return null
            const reachable = orbit <= mission.requires.max_orbit
            return (
              <circle
                key={orbit}
                cx={CENTER} cy={CENTER} r={RADII[orbit]}
                fill="none"
                stroke={reachable ? 'var(--ln-bp-blue, var(--ln-cyan))' : 'var(--ln-crit)'}
                strokeWidth={1}
                strokeDasharray="2 6"
                opacity={reachable ? 0.4 : 0.22}
              />
            )
          })}

          {/* Sun — a neutral ink node, not amber: amber stays reserved for
              genuine payout/reward figures under the blueprint theme. */}
          <circle cx={CENTER} cy={CENTER} r={30} fill="var(--ln-bp-blue-soft, var(--ln-cyan-soft))" />
          <circle cx={CENTER} cy={CENTER} r={22} fill="var(--ln-bp-blue, var(--ln-cyan))" opacity={0.12} filter="url(#target-map-shadow)" />
          <circle cx={CENTER} cy={CENTER} r={15} fill="var(--ln-bp-ink, var(--ln-text))" stroke="var(--ln-bp-blue, var(--ln-cyan))" strokeWidth={1.5} />
          <text x={CENTER} y={CENTER + 4} textAnchor="middle" fill="var(--ln-bp-bg, var(--ln-void))" fontFamily="var(--ln-font-display)" fontWeight={700} fontSize={10} letterSpacing={1.5}>SOL</text>

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
            // Chart-node read: a light paper-fill outline circle rather than a
            // rendered planet body — reachable bodies in navy/blue linework,
            // out-of-range ones muted ink.
            const lineColor = !compatible
              ? 'var(--ln-bp-ink-mute, var(--ln-text-muted))'
              : selected
                ? 'var(--ln-cyan)'
                : 'var(--ln-bp-blue, var(--ln-cyan))'

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
                {contractMatch && !selected && (
                  <circle cx={cx} cy={cy} r={size + 5} fill="none" stroke="var(--ln-bp-green, var(--ln-ok))" strokeWidth={1.5} strokeDasharray="2 3" opacity={0.85} />
                )}
                {isAsteroid ? (
                  <>
                    <polygon points={polyPoints} fill="var(--ln-bp-paper, var(--ln-panel))" stroke={lineColor} strokeWidth={1.5} />
                    <polygon
                      points={sil.slice(0, Math.max(3, sil.length - 2)).map(([mx, my]) => `${cx + mx * size * 0.68},${cy + my * size * 0.68}`).join(' ')}
                      fill="var(--ln-bp-paper-2, var(--ln-panel-2))"
                      opacity={compatible ? 0.9 : 0.55}
                    />
                    <circle cx={cx - size * 0.25} cy={cy - size * 0.1} r={Math.max(1.5, size * 0.12)} fill="var(--ln-bp-ink-mute, var(--ln-text-muted))" opacity={0.6} />
                    <circle cx={cx + size * 0.28} cy={cy + size * 0.25} r={Math.max(1, size * 0.09)} fill="var(--ln-bp-ink-mute, var(--ln-text-muted))" opacity={0.5} />
                  </>
                ) : (
                  <>
                    <circle cx={cx} cy={cy} r={size} fill="var(--ln-bp-paper, var(--ln-panel))" stroke={lineColor} strokeWidth={1.5} />
                    <path d={`M ${cx - size * 0.76} ${cy - size * 0.2} Q ${cx} ${cy - size * 0.62} ${cx + size * 0.76} ${cy - size * 0.16}`} fill="none" stroke="var(--ln-bp-paper-2, var(--ln-panel-2))" strokeWidth={Math.max(1, size * 0.16)} opacity={0.9} />
                    <circle cx={cx - size * 0.3} cy={cy + size * 0.25} r={Math.max(1, size * 0.1)} fill="var(--ln-bp-blue, var(--ln-cyan))" opacity={0.5} />
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
                <rect x={cx - Math.max(30, t.name.length * 5.4 + 10) / 2} y={cy + size + 4} width={Math.max(30, t.name.length * 5.4 + 10)} height={15} fill="var(--ln-bp-paper, var(--ln-void))" opacity={0.9} />
                <text x={cx} y={cy + size + 15} textAnchor="middle" fill={selected ? 'var(--ln-cyan)' : 'var(--ln-text-dim)'} fontFamily="var(--ln-font-mono)" fontWeight={700} fontSize={9.5} letterSpacing={0.4}>{t.name}</text>
                {selected && (
                  <>
                    <rect x={cx + size + 28} y={cy - size - 40} width={Math.max(58, t.name.length * 5.6 + 20)} height={17} fill="var(--ln-bp-paper, var(--ln-void))" stroke="var(--ln-cyan)" strokeWidth={1} rx={2} />
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
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--ln-bp-blue, var(--ln-cyan))' }} />Reachable and selectable
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ln-crit)', opacity: 0.6 }} />Out of range
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px dashed var(--ln-bp-green, var(--ln-ok))' }} />Contract match
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--ln-cyan)' }} />Selected
        </span>
      </div>
    </div>
  )
}
