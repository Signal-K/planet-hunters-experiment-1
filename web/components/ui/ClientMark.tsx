'use client'

import React from 'react'
import type { ClientSlot } from '@/lib/data'

// Client tier visual identity (STS-239) — a small role-keyed geometric
// glyph behind the initials, same "shape + color + label, no emoji"
// vocabulary as OreShapeIcon (MiningScreen). Distinguishes client tiers
// (uiRole) at a glance instead of every dossier reading as an identical
// initials circle regardless of role.
type UiRole = ClientSlot['uiRole']

// Bespoke per-client marks (STS-240/STS-241) — a handful of named
// clients get their own glyph instead of sharing their uiRole's shape
// with every other client at that tier (e.g. Nightjar Systems and
// Solgrid Dynamics are both 'command' and would otherwise be identical).
// Still shape+color+label only, no illustration/emoji — same vocabulary as
// RoleGlyph, just keyed by client id instead of role.
const CLIENT_GLYPHS: Record<string, (color: string, size: number) => React.ReactNode> = {
  // Helios Propulsion Depot — thruster/propulsion: a horizontal arrow with
  // exhaust flare, pointing toward delivery.
  'helios-propulsion-depot': (color, s) => {
    const mid = s / 2
    const inset = s * 0.15
    return (
      <>
        <line x1={inset} y1={mid} x2={s - inset} y2={mid} stroke={color} strokeWidth={1.5} opacity={0.55} strokeLinecap="round" />
        <polygon points={`${s - inset},${mid} ${s - inset - 5},${mid - 4} ${s - inset - 5},${mid + 4}`} fill={color} opacity={0.55} />
        <path d={`M ${inset + 2},${mid - 3} Q ${inset - 2},${mid} ${inset + 2},${mid + 3}`} fill="none" stroke={color} strokeWidth={1.2} opacity={0.35} />
      </>
    )
  },
  // Arcturus Battery Systems — battery/power: a pair of vertical bars
  // (battery cell) with a small positive mark above.
  'arcturus-battery-systems': (color, s) => {
    const mid = s / 2
    const w = s * 0.18
    return (
      <>
        <rect x={mid - w * 2.5} y={mid - 5} width={w} height={10} rx={1.5} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} />
        <rect x={mid + w * 0.5} y={mid - 5} width={w} height={10} rx={1.5} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} />
        <line x1={mid - w * 0.75} y1={mid - 7} x2={mid - w * 0.75} y2={mid + 7} stroke={color} strokeWidth={1.5} opacity={0.35} strokeLinecap="round" />
      </>
    )
  },
  // Ferrum Orbital Construction — structure/construction: an intersecting
  // triangular truss (three beams forming a tetrahedral node).
  'ferrum-orbital-construction': (color, s) => {
    const mid = s / 2
    const r = mid - 2
    const a30 = Math.PI / 6
    const a90 = Math.PI / 2
    return (
      <>
        <line x1={mid - r * Math.cos(a30)} y1={mid + r * Math.sin(a30)} x2={mid + r * Math.cos(a30)} y2={mid - r * Math.sin(a30)} stroke={color} strokeWidth={1.2} opacity={0.55} />
        <line x1={mid + r * Math.cos(a30)} y1={mid + r * Math.sin(a30)} x2={mid - r * Math.cos(a30)} y2={mid - r * Math.sin(a30)} stroke={color} strokeWidth={1.2} opacity={0.55} />
        <line x1={mid} y1={mid - r} x2={mid} y2={mid + r} stroke={color} strokeWidth={1.2} opacity={0.55} />
      </>
    )
  },
  // Atlas Aggregate — bulk cargo / aggregate: stacked horizontal bars
  // suggesting layered rock or cargo pallets.
  'atlas-aggregate': (color, s) => {
    const mid = s / 2
    const w = s * 0.5
    return (
      <>
        <rect x={mid - w / 2} y={mid - 6} width={w} height={3.5} rx={1} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} />
        <rect x={mid - w / 2} y={mid - 1.5} width={w} height={3.5} rx={1} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} />
        <rect x={mid - w / 2} y={mid + 3} width={w} height={3.5} rx={1} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} />
      </>
    )
  },
  // Ceres Volatiles Collective — volatiles/ice: a droplet shape (teardrop)
  // with a small vapour trail above.
  'ceres-volatiles-collective': (color, s) => {
    const mid = s / 2
    const r = mid - 2
    return (
      <>
        <path d={`M ${mid},${mid - r} Q ${mid + r},${mid} ${mid + r * 0.4},${mid + r * 0.6} Q ${mid},${mid + r * 0.8} ${mid - r * 0.4},${mid + r * 0.6} Q ${mid - r},${mid} ${mid},${mid - r} Z`} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} />
        <circle cx={mid - 2} cy={mid - r - 2} r={1.5} fill={color} opacity={0.35} />
        <circle cx={mid + 1} cy={mid - r - 4} r={1} fill={color} opacity={0.25} />
      </>
    )
  },
  // Helioforge Metals — forge/refining: a crucible shape (trapezoid) with
  // a small radiant star/glint above.
  'helioforge-metals': (color, s) => {
    const mid = s / 2
    const top = mid - 5
    const bot = mid + 5
    return (
      <>
        <polygon points={`${mid - 5},${top} ${mid + 5},${top} ${mid + 3},${bot} ${mid - 3},${bot}`} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} />
        <line x1={mid} y1={top - 4} x2={mid} y2={top - 1} stroke={color} strokeWidth={1.5} opacity={0.45} strokeLinecap="round" />
        <line x1={mid - 2} y1={top - 2.5} x2={mid + 2} y2={top - 2.5} stroke={color} strokeWidth={1.2} opacity={0.35} strokeLinecap="round" />
      </>
    )
  },
  // Kepler Materials — deep-core/drill: a downward-pointing drill bit
  // with spiral flutes.
  'kepler-materials': (color, s) => {
    const mid = s / 2
    const top = mid - 6
    return (
      <>
        <rect x={mid - 1.5} y={top} width={3} height={8} rx={1} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} />
        <polygon points={`${mid - 2.5},${top + 8} ${mid + 2.5},${top + 8} ${mid},${top + 12}`} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} strokeLinejoin="round" />
        <path d={`M ${mid + 1.5},${top + 2} Q ${mid + 4},${top + 4} ${mid + 1.5},${top + 6}`} fill="none" stroke={color} strokeWidth={0.8} opacity={0.4} />
      </>
    )
  },
  // Nightjar Systems — nocturnal (ion/rare-gas reserves): a crescent arc
  // with two small dots, evoking night vision without an illustrated face.
  'nightjar-systems': (color, s) => {
    const mid = s / 2
    const r = mid - 1
    return (
      <>
        <path
          d={`M ${mid + r * 0.65},${mid - r * 0.85} A ${r},${r} 0 1 0 ${mid + r * 0.65},${mid + r * 0.85}`}
          fill="none" stroke={color} strokeWidth={1.5} opacity={0.55} strokeLinecap="round"
        />
        <circle cx={mid - r * 0.15} cy={mid - r * 0.3} r={s * 0.045} fill={color} opacity={0.55} />
        <circle cx={mid - r * 0.15} cy={mid + r * 0.3} r={s * 0.045} fill={color} opacity={0.55} />
      </>
    )
  },
  // Vulcan Core Metallurgy — volcanic/refining: a mountain peak with
  // a small eruption line above.
  'vulcan-core-metallurgy': (color, s) => {
    const mid = s / 2
    return (
      <>
        <polygon points={`${mid - 6},${mid + 5} ${mid},${mid - 7} ${mid + 6},${mid + 5}`} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} strokeLinejoin="round" />
        <line x1={mid} y1={mid - 7} x2={mid} y2={mid - 9} stroke={color} strokeWidth={1.2} opacity={0.45} strokeLinecap="round" />
        <circle cx={mid - 1} cy={mid - 10} r={1} fill={color} opacity={0.3} />
        <circle cx={mid + 1.5} cy={mid - 11.5} r={0.8} fill={color} opacity={0.2} />
      </>
    )
  },
  // Solgrid Dynamics — solar/grid: a sun shape with four rays radiating
  // from a central circle.
  'solgrid-dynamics': (color, s) => {
    const mid = s / 2
    const r = s * 0.12
    return (
      <>
        <circle cx={mid} cy={mid} r={r} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} />
        <line x1={mid} y1={mid - r - 3} x2={mid} y2={mid + r + 3} stroke={color} strokeWidth={0.8} opacity={0.35} />
        <line x1={mid - r - 3} y1={mid} x2={mid + r + 3} y2={mid} stroke={color} strokeWidth={0.8} opacity={0.35} />
        <line x1={mid - r * 0.7 - 2} y1={mid - r * 0.7 - 2} x2={mid + r * 0.7 + 2} y2={mid + r * 0.7 + 2} stroke={color} strokeWidth={0.8} opacity={0.25} />
        <line x1={mid + r * 0.7 + 2} y1={mid - r * 0.7 - 2} x2={mid - r * 0.7 - 2} y2={mid + r * 0.7 + 2} stroke={color} strokeWidth={0.8} opacity={0.25} />
      </>
    )
  },
  // Lumen Research — research/observation: an eye/lens shape with a
  // small pupil and an arc suggesting observation.
  'lumen-research': (color, s) => {
    const mid = s / 2
    return (
      <>
        <path d={`M ${mid - 5},${mid} Q ${mid - 5},${mid - 4} ${mid},${mid - 4} Q ${mid + 5},${mid - 4} ${mid + 5},${mid} Q ${mid + 5},${mid + 4} ${mid},${mid + 4} Q ${mid - 5},${mid + 4} ${mid - 5},${mid}`} fill="none" stroke={color} strokeWidth={1.2} opacity={0.55} />
        <circle cx={mid} cy={mid} r={2} fill="none" stroke={color} strokeWidth={1} opacity={0.55} />
        <circle cx={mid} cy={mid} r={0.8} fill={color} opacity={0.55} />
      </>
    )
  },
  // Pioneer Works — frontier expansion/general supply: a four-point compass
  // rose radiating outward, distinct from the plain starter ring.
  'pioneer-works': (color, s) => {
    const mid = s / 2
    const outer = mid - 1
    const inner = outer * 0.32
    return (
      <polygon
        points={[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
          const a = (Math.PI / 4) * i - Math.PI / 2
          const r = i % 2 === 0 ? outer : inner
          return `${mid + r * Math.cos(a)},${mid + r * Math.sin(a)}`
        }).join(' ')}
        fill="none" stroke={color} strokeWidth={1.5} opacity={0.55}
      />
    )
  },
}

function RoleGlyph({ role, color, size }: { role: UiRole; color: string; size: number }) {
  const s = size
  const mid = s / 2
  switch (role) {
    case 'command':
      // Diamond — authority / directs other clients' priority.
      return <polygon points={`${mid},0 ${s},${mid} ${mid},${s} 0,${mid}`} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55} />
    case 'science':
      // Hexagon — precision / research.
      return (
        <polygon
          points={[0, 1, 2, 3, 4, 5].map(i => {
            const a = (Math.PI / 3) * i - Math.PI / 2
            return `${mid + mid * Math.cos(a)},${mid + mid * Math.sin(a)}`
          }).join(' ')}
          fill="none" stroke={color} strokeWidth={1.5} opacity={0.55}
        />
      )
    case 'bulk':
      // Square — bulk / cargo volume.
      return <rect x={s * 0.12} y={s * 0.12} width={s * 0.76} height={s * 0.76} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55} />
    case 'prospect':
      // Triangle — prospecting / pointing toward new deposits.
      return <polygon points={`${mid},0 ${s},${s} 0,${s}`} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55} />
    case 'starter':
    default:
      // Ring — entry tier, no distinguishing angularity yet.
      return <circle cx={mid} cy={mid} r={mid - 1} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55} />
  }
}

export default function ClientMark({
  initial,
  color,
  uiRole,
  clientId,
  size = 36,
}: {
  initial: string
  color: string
  uiRole: UiRole
  /** Opts into a bespoke per-client glyph (see CLIENT_GLYPHS) when
   * one exists for this id; falls back to the shared role glyph otherwise. */
  clientId?: string
  size?: number
}) {
  const bespoke = clientId ? CLIENT_GLYPHS[clientId] : undefined
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        {bespoke ? bespoke(color, size) : <RoleGlyph role={uiRole} color={color} size={size} />}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 999, border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        font: `700 ${Math.round(size * 0.36)}px var(--ln-font-display)`, color,
      }}>
        {initial}
      </div>
    </div>
  )
}
