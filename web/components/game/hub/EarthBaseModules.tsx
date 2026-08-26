'use client'

import React from 'react'
import type { HubBuildingDef } from '@/lib/pixi/hubScene'

/**
 * The Earth Base is assembled from the Blender module kit, not from one PNG
 * per building. These source dimensions match `world_modules.py`'s `spec()`
 * output (30 CSS pixels per Blender unit) and are intentionally visible here:
 * moving a component is a layout decision, never an opaque artwork edit.
 */
const MODULE = {
  padFoundation: { src: '/game/assets/base/pad_foundation.png', width: 330, height: 54 },
  padTower: { src: '/game/assets/base/pad_tower.png', width: 144, height: 252 },
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
  hangar: { width: 360, height: 234 },
  refinery: { width: 144, height: 130 },
  'scan-station': { width: 130, height: 118 },
  command: { width: 150, height: 136 },
  'deep-space-telescope': { width: 140, height: 126 },
  'astronaut-academy': { width: 150, height: 136 },
}

type ModuleName = keyof typeof MODULE

function ModuleImage({ name, className }: { name: ModuleName; className: string }) {
  const asset = MODULE[name]
  return <img className={className} src={asset.src} alt="" draggable={false} aria-hidden="true" />
}

/** Individual foundation, tower, cradle and service-yard bricks. */
export function LaunchpadModules({ className = '' }: { className?: string }) {
  return (
    <span className={`earth-base-module-stack earth-base-module-stack--launchpad ${className}`}>
      <ModuleImage name="padFoundation" className="earth-base-module earth-base-module--pad-foundation" />
      <ModuleImage name="padTower" className="earth-base-module earth-base-module--pad-tower" />
      <ModuleImage name="padCradle" className="earth-base-module earth-base-module--pad-cradle" />
      <ModuleImage name="padService" className="earth-base-module earth-base-module--pad-service" />
    </span>
  )
}

/** Individual apron, shell, roof and workshop bricks, with the bay left open. */
export function HangarModules({ className = '' }: { className?: string }) {
  return (
    <span className={`earth-base-module-stack earth-base-module-stack--hangar ${className}`}>
      <ModuleImage name="hangarFoundation" className="earth-base-module earth-base-module--hangar-foundation" />
      <ModuleImage name="hangarShell" className="earth-base-module earth-base-module--hangar-shell" />
      <ModuleImage name="hangarWorkshop" className="earth-base-module earth-base-module--hangar-workshop" />
      <ModuleImage name="hangarRoof" className="earth-base-module earth-base-module--hangar-roof" />
    </span>
  )
}

function OutpostModule() {
  return <ModuleImage name="outpost" className="earth-base-module earth-base-module--outpost" />
}

function StructureModules({ kind }: { kind: string }) {
  if (kind === 'launchpad') return <LaunchpadModules />
  if (kind === 'hangar') return <HangarModules />
  return <OutpostModule />
}

const SCENE_WIDTH_DIVISOR = 6.4
const HUB_SCENE_W = 402

/**
 * DOM-rendered physical buildings for the Hub. Each root is grounded directly
 * on `--hub-ground`; there is no blurred contact-shadow layer because the
 * foundations themselves provide the contact edge and terrain overlap.
 */
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
            <StructureModules kind={building.kind} />
          </span>
        )
      })}
    </div>
  )
}
