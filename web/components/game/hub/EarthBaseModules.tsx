'use client'

import React from 'react'
import { sceneXPercent } from '@/lib/scene/terrain-kit'
export interface HubBuildingDef {
  kind: string
  plotX: number
  w: number
  hot?: boolean
  status?: 'ok' | 'info' | 'warn' | 'locked'
  dimmed?: boolean
  rocketVariant?: 'explorer' | 'prospector'
  active?: boolean
}

/** Earth Base hero structures, rendered as single-mass Blender sprites (see
 * `tools/blender/models/structures.py` and the ZenNotes decision "Landnam
 * Earth Base structure art — single-mass render standard"). Each is one
 * cohesive scene/one render, not a composited multi-piece kit. */
const SPRITES = {
  launchpad: { src: '/game/assets/base/launchpad_flat.png', width: 172, height: 118 },
  hangar: { src: '/game/assets/base/hangar_flat.png', width: 226, height: 116 },
} as const

export const EARTH_BASE_STRUCTURE_SIZES: Record<string, { width: number; height: number }> = {
  launchpad: { width: 172, height: 118 },
  'surface-silo': { width: 120, height: 78 },
  hangar: { width: 226, height: 116 },
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

function StructureSprite({ kind, active }: { kind: string; active?: boolean }) {
  const name: SpriteName | null = kind === 'launchpad' || kind === 'hangar' ? kind : null
  if (kind === 'surface-silo') {
    return (
      <svg viewBox="0 0 120 78" className="earth-base-silo-sprite" role="img" aria-label="Surface silo">
        <path d="M26 25h68v34c0 8-15 14-34 14S26 67 26 59V25Z" fill="currentColor" opacity=".72" />
        <ellipse cx="60" cy="25" rx="34" ry="10" fill="currentColor" opacity=".95" />
        <path d="M42 23V12h36v11M48 12V7h24v5M18 70h84" fill="none" stroke="var(--ln-cyan-bright)" strokeWidth="3" strokeLinecap="round" />
        <path d="M38 35h44M38 46h44M38 57h44" stroke="var(--ln-bg)" strokeWidth="2" opacity=".7" />
        <circle cx="88" cy="38" r="4" fill="var(--ln-ok)" />
      </svg>
    )
  }
  if (!name) return null
  return (
    <>
      <FlatSprite name={name} />
      {active && <FlatSprite name={name} className="earth-base-flat-sprite--highlight" />}
    </>
  )
}

const SCENE_WIDTH_DIVISOR = 6.4

export function EarthBaseModules({ buildings }: { buildings: HubBuildingDef[] }) {
  return (
    <div aria-hidden="true" className="earth-base-modules-layer">
      {buildings.map(building => {
        const size = EARTH_BASE_STRUCTURE_SIZES[building.kind] ?? EARTH_BASE_STRUCTURE_SIZES.command
        const widthPct = size.width / SCENE_WIDTH_DIVISOR
        const left = sceneXPercent(building.plotX, widthPct)
        return (
          <span
            key={`${building.kind}-${building.plotX}`}
            className={`earth-base-structure earth-base-structure--${building.kind}`}
            data-structure={building.kind}
            style={{
              left: `${left}%`,
              bottom: 'var(--hub-ground)',
              // Mobile keeps the authored scene-proportional scale. Desktop
              // receives a viewport-aware cap so structures retain the same
              // relationship to the terrain instead of ballooning with a 2K
              // canvas (the background bricks are authored in CSS pixels).
              width: `min(${widthPct}%, var(--hub-structure-max, 9999px))`,
              aspectRatio: `${size.width} / ${size.height}`,
              opacity: building.dimmed ? 0.6 : 1,
            }}
          >
            <StructureSprite kind={building.kind} active={building.active} />
          </span>
        )
      })}
    </div>
  )
}
