'use client'

import React from 'react'
export interface HubBuildingDef {
  kind: string
  plotX: number
  w: number
  hot?: boolean
  status?: 'ok' | 'info' | 'warn' | 'locked'
  dimmed?: boolean
  rocketVariant?: 'explorer' | 'prospector'
}

/** Temporary flat-art pass for Earth Base (KES-260). The Blender module kit is retired. */
const SPRITES = {
  launchpad: { src: '/game/assets/base/launchpad_flat.png', width: 220, height: 160 },
  hangar: { src: '/game/assets/base/hangar_flat.png', width: 250, height: 161 },
} as const

export const EARTH_BASE_STRUCTURE_SIZES: Record<string, { width: number; height: number }> = {
  launchpad: { width: 220, height: 160 },
  hangar: { width: 250, height: 161 },
  refinery: { width: 150, height: 97 },
  'scan-station': { width: 132, height: 86 },
  command: { width: 150, height: 97 },
  'deep-space-telescope': { width: 150, height: 97 },
  'astronaut-academy': { width: 150, height: 97 },
}

type SpriteName = keyof typeof SPRITES

function FlatSprite({ name, className = '' }: { name: SpriteName; className?: string }) {
  const sprite = SPRITES[name]
  return <img className={`earth-base-flat-sprite ${className}`} src={sprite.src} alt="" draggable={false} aria-hidden="true" />
}

export function LaunchpadModules({ className = '' }: { className?: string }) {
  return <FlatSprite name="launchpad" className={className} />
}

export function HangarModules({ className = '' }: { className?: string }) {
  return <FlatSprite name="hangar" className={className} />
}

function StructureSprite({ kind }: { kind: string }) {
  if (kind === 'launchpad') return <FlatSprite name="launchpad" />
  if (kind === 'hangar') return <FlatSprite name="hangar" />
  return null
}

const SCENE_WIDTH_DIVISOR = 6.4
const HUB_SCENE_W = 402

export function EarthBaseModules({ buildings }: { buildings: HubBuildingDef[] }) {
  return (
    <div aria-hidden="true" className="earth-base-modules-layer">
      {buildings.map(building => {
        const size = EARTH_BASE_STRUCTURE_SIZES[building.kind] ?? EARTH_BASE_STRUCTURE_SIZES.command
        const widthPct = size.width / SCENE_WIDTH_DIVISOR
        const rawLeft = (building.plotX / HUB_SCENE_W) * 100
        const left = Math.min(100 - widthPct / 2, Math.max(widthPct / 2, rawLeft))
        return (
          <span
            key={`${building.kind}-${building.plotX}`}
            className={`earth-base-structure earth-base-structure--${building.kind}`}
            data-structure={building.kind}
            style={{
              left: `${left}%`,
              bottom: 'var(--hub-ground)',
              width: `${widthPct}%`,
              aspectRatio: `${size.width} / ${size.height}`,
              opacity: building.dimmed ? 0.6 : 1,
            }}
          >
            <StructureSprite kind={building.kind} />
          </span>
        )
      })}
    </div>
  )
}
