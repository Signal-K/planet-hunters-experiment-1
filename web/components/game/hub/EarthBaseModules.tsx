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

/**
 * The Earth Base is assembled from the Blender module kit
 * (`tools/blender/models/world_modules.py`), not from one flat illustration
 * per building. A single-PNG-per-site pass shipped briefly under KES-260 and
 * was reverted: baking the ground into the illustration produced a visible
 * second, misaligned patch of terrain wherever the scene's own ground showed
 * through. These pieces are transparent outside their own footprint and
 * based at the ground line, so the scene's terrain provides the contact edge
 * instead of the building art.
 */
const MODULE = {
  padFoundation: { src: '/game/assets/base/pad_foundation.png', width: 330, height: 54 },
  padTower: { src: '/game/assets/base/pad_tower.png', width: 168, height: 225 },
  padCradle: { src: '/game/assets/base/pad_cradle.png', width: 156, height: 159 },
  padService: { src: '/game/assets/base/pad_service.png', width: 174, height: 171 },
  hangarFoundation: { src: '/game/assets/base/hangar_foundation.png', width: 330, height: 51 },
  hangarShell: { src: '/game/assets/base/hangar_shell.png', width: 306, height: 222 },
  hangarRoof: { src: '/game/assets/base/hangar_roof.png', width: 324, height: 132 },
  hangarWorkshop: { src: '/game/assets/base/hangar_workshop.png', width: 210, height: 153 },
  outpost: { src: '/game/assets/base/outpost.png', width: 153, height: 138 },
} as const

export const EARTH_BASE_STRUCTURE_SIZES: Record<string, { width: number; height: number }> = {
  launchpad: { width: 360, height: 264 },
  'surface-silo': { width: 120, height: 78 },
  hangar: { width: 360, height: 234 },
  refinery: { width: 150, height: 97 },
  'scan-station': { width: 132, height: 86 },
  command: { width: 150, height: 97 },
  'deep-space-telescope': { width: 150, height: 97 },
  'astronaut-academy': { width: 150, height: 97 },
}

type ModuleName = keyof typeof MODULE

function ModuleImage({ name, className = '' }: { name: ModuleName; className?: string }) {
  const asset = MODULE[name]
  return <img className={`earth-base-module ${className}`} src={asset.src} alt="" draggable={false} aria-hidden="true" />
}

/** Individual foundation, tower, cradle and service-yard bricks. */
export function LaunchpadModules({ className = '' }: { className?: string }) {
  return (
    <span className={`earth-base-module-stack earth-base-module-stack--launchpad ${className}`}>
      <ModuleImage name="padFoundation" className="earth-base-module--pad-foundation" />
      <ModuleImage name="padTower" className="earth-base-module--pad-tower" />
      <ModuleImage name="padCradle" className="earth-base-module--pad-cradle" />
      <ModuleImage name="padService" className="earth-base-module--pad-service" />
    </span>
  )
}

/** Individual apron, shell, roof and workshop bricks, with the bay left open. */
export function HangarModules({ className = '' }: { className?: string }) {
  return (
    <span className={`earth-base-module-stack earth-base-module-stack--hangar ${className}`}>
      <ModuleImage name="hangarFoundation" className="earth-base-module--hangar-foundation" />
      <ModuleImage name="hangarShell" className="earth-base-module--hangar-shell" />
      <ModuleImage name="hangarWorkshop" className="earth-base-module--hangar-workshop" />
      <ModuleImage name="hangarRoof" className="earth-base-module--hangar-roof" />
    </span>
  )
}

function StructureSprite({ kind, active }: { kind: string; active?: boolean }) {
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
  if (kind === 'launchpad') return <LaunchpadModules className={active ? 'is-active' : ''} />
  if (kind === 'hangar') return <HangarModules className={active ? 'is-active' : ''} />
  return <ModuleImage name="outpost" className="earth-base-module--outpost" />
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
