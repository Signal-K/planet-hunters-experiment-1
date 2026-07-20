'use client'

import React from 'react'
import type { ContractorSlot } from '@/lib/data'

// Contractor tier visual identity (STS-239) — a small role-keyed geometric
// glyph behind the initials, same "shape + color + label, no emoji"
// vocabulary as OreShapeIcon (MiningScreen). Distinguishes contractor tiers
// (uiRole) at a glance instead of every dossier reading as an identical
// initials circle regardless of role.
type UiRole = ContractorSlot['uiRole']

// Bespoke per-contractor marks (STS-240/STS-241) — a handful of named
// contractors get their own glyph instead of sharing their uiRole's shape
// with every other contractor at that tier (e.g. Nightjar Systems and
// Solgrid Dynamics are both 'command' and would otherwise be identical).
// Still shape+color+label only, no illustration/emoji — same vocabulary as
// RoleGlyph, just keyed by contractor id instead of role.
const CONTRACTOR_GLYPHS: Record<string, (color: string, size: number) => React.ReactNode> = {
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
      // Diamond — authority / directs other contractors' priority.
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

export default function ContractorMark({
  initial,
  color,
  uiRole,
  contractorId,
  size = 36,
}: {
  initial: string
  color: string
  uiRole: UiRole
  /** Opts into a bespoke per-contractor glyph (see CONTRACTOR_GLYPHS) when
   * one exists for this id; falls back to the shared role glyph otherwise. */
  contractorId?: string
  size?: number
}) {
  const bespoke = contractorId ? CONTRACTOR_GLYPHS[contractorId] : undefined
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
