'use client'

import React from 'react'
import type { ContractorSlot } from '@/lib/data'

// Contractor tier visual identity (STS-239) — a small role-keyed geometric
// glyph behind the initials, same "shape + color + label, no emoji"
// vocabulary as OreShapeIcon (MiningScreen). Distinguishes contractor tiers
// (uiRole) at a glance instead of every dossier reading as an identical
// initials circle regardless of role.
type UiRole = ContractorSlot['uiRole']

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
  size = 36,
}: {
  initial: string
  color: string
  uiRole: UiRole
  size?: number
}) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        <RoleGlyph role={uiRole} color={color} size={size} />
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
