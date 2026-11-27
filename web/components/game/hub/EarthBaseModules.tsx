'use client'

import { aboveGround, displaySite, homeSite, spriteCenterOffset, structureSprite, units } from '@/lib/scene/base-site'
import React, { } from 'react'
import { sceneXPercent } from '@/lib/scene/terrain-kit'
import { LAUNCHPAD_SCENE_WIDTH_PCT, structureAnchorPercent, structureTierScale } from '@/lib/scene/base-world'
import { PixelStructure } from '@/components/game/hub/PixelStructure'
import type { InstalledCustomizerPartsByKind } from '@/lib/data'
export interface HubBuildingDef {
  kind: string
  plotX: number
  w: number
  /** 1 is the small first build. 2 and 3 grow into the full module. Absent means level 1. */
  level?: number
  hot?: boolean
  status?: 'ok' | 'info' | 'warn' | 'locked'
  dimmed?: boolean
  /** SSL-785: the first-run Agency landmark draws the line-art agency building in the Control Station's place. */
  landmark?: boolean
  rocketVariant?: 'explorer' | 'prospector'
  active?: boolean
}

/** Level-3 footprints. Level 1 and 2 render the same silhouette smaller via `structureTierScale`.
 *  The surface silo has no above-ground body; the lift shaft is the silo door. */
export const EARTH_BASE_STRUCTURE_SIZES: Record<string, { width: number; height: number }> = {
  // Launchpad width is the low platform only. The rocket is a separate sprite on top of it.
  launchpad: { width: 96, height: 108 },
  'surface-silo': { width: 40, height: 96 },
  hangar: { width: 60, height: 44 },
  'deep-space-telescope': { width: 62, height: 96 },
  'transit-telescope': { width: 54, height: 88 },
  market: { width: 128, height: 64 },
}


function StructureSprite({ kind, level = 1, active, parts, rocket }: { kind: string; level?: number; active?: boolean; parts?: InstalledCustomizerPartsByKind | null; rocket?: boolean | 'core' }) {
  if (kind === 'surface-silo') return null
  return (
    <span data-active={active ? 'true' : undefined} style={{ display: 'block', height: '100%' }}>
      <PixelStructure kind={kind} level={level} parts={parts} rocket={kind === 'launchpad' ? rocket : true} />
    </span>
  )
}

const SCENE_WIDTH_DIVISOR = 6.4

export function structureWidthPct(kind: string, level = 1): number {
  if (kind === 'launchpad') return LAUNCHPAD_SCENE_WIDTH_PCT
  // Starter footprints stay modest. Level 1 is not shrunk again, or the hut and tank fall under a 44px hit.
  const starter: Record<string, number> = { hangar: 14, garage: 14, command: 8, refinery: 6 }
  if (kind in starter) {
    const grow = level >= 3 ? 1.12 : level >= 2 ? 1.06 : 1
    return (starter[kind] ?? 8) * grow
  }
  const size = EARTH_BASE_STRUCTURE_SIZES[kind] ?? EARTH_BASE_STRUCTURE_SIZES.launchpad
  const tier = kind === 'market' ? Math.max(level, 2) : level
  return (size.width / SCENE_WIDTH_DIVISOR) * structureTierScale(tier)
}

/** Sprite centre. Starter kinds use the approved anchors; everything else stays on its plot. */
export function structureCenterPercent(kind: string, plotX: number, widthPct: number): number {
  return structureAnchorPercent(kind) ?? sceneXPercent(plotX, widthPct)
}

const HIDDEN_BASE_KINDS = new Set(['command', 'refinery', 'garage', 'deep-space-telescope', 'transit-telescope', 'astronaut-academy'])

export function EarthBaseModules({ buildings, parts, padRocket = false, arrangement }: { buildings: HubBuildingDef[]; parts?: InstalledCustomizerPartsByKind | null; padRocket?: boolean | 'core'; arrangement?: readonly string[] | null }) {
  return (
    <div aria-hidden="true" className="earth-base-modules-layer" style={{ '--hub-fit': '1' } as React.CSSProperties}>
      {buildings.map(building => {
        if (HIDDEN_BASE_KINDS.has(building.kind)) return null
        if (building.kind === 'surface-silo') {
          const shaft = homeSite('surface-silo')
          const at = shaft ? displaySite(shaft) : null
          return (
            <span
              key={`${building.kind}-${building.plotX}`}
              className={`earth-base-structure earth-base-structure--${building.kind}`}
              data-structure={building.kind}
              style={{ left: at ? units(at.x) : `${structureCenterPercent(building.kind, building.plotX, structureWidthPct(building.kind, 1))}%`, bottom: aboveGround(4.5), width: 'auto', height: 'auto', opacity: building.dimmed ? 0.6 : 1 }}
            >
              <SurfaceSiloSprite />
            </span>
          )
        }
        const kit = building.kind === 'launchpad' || building.kind === 'hangar' || building.kind === 'market' || building.kind === 'control-station'
        const size = EARTH_BASE_STRUCTURE_SIZES[building.kind] ?? EARTH_BASE_STRUCTURE_SIZES.launchpad
        const widthPct = structureWidthPct(building.kind, building.level ?? 1)
        // Kit structures stand on their home site on the strip (shared site map); others keep the plot percentage.
        const authoredSite = kit ? homeSite(building.kind, arrangement) : null
        const site = authoredSite ? displaySite(authoredSite) : null
        const sprite = kit ? structureSprite(building.landmark ? 'agency' : building.kind, building.landmark ? 1 : building.level ?? 1) : null
        const left = site && sprite ? units(site.x + spriteCenterOffset(sprite)) : `${structureCenterPercent(building.kind, building.plotX, widthPct)}%`
        return (
          <span
            key={`${building.kind}-${building.plotX}`}
            className={`earth-base-structure earth-base-structure--${building.kind}`}
            data-structure={building.kind}
            style={{
              left,
              bottom: sprite?.foot != null ? aboveGround(sprite.foot) : 'var(--hub-ground)',
              width: kit ? 'auto' : `min(${widthPct}%, var(--hub-structure-max, 9999px))`,
              height: kit ? 'auto' : undefined,
              aspectRatio: kit ? 'auto' : `${size.width} / ${size.height}`,
              opacity: building.dimmed ? 0.6 : 1,
            }}
          >
            <StructureSprite kind={building.landmark ? 'agency' : building.kind} level={building.level ?? (building.kind === 'market' ? 2 : 1)} active={building.active} parts={parts} rocket={building.kind === 'launchpad' ? padRocket : true} />
          </span>
        )
      })}
    </div>
  )
}

/**
 * The starter silo every player builds in onboarding, standing above ground on its own site beside the Exchange.
 * Same white panels, blue trim and navy outline as the rest of the kit. Stand-in art until a Blender sprite ships.
 */
function SurfaceSiloSprite() {
  const ink = '#16293b'
  return (
    <svg data-pixel-structure="surface-silo" viewBox="0 0 34 52" width={units(34)} height={units(52)} shapeRendering="crispEdges" style={{ display: 'block', overflow: 'visible' }}>
      <rect x="4" y="48" width="30" height="3" fill={ink} opacity="0.18" />
      <rect x="3" y="14" width="26" height="36" fill="#e4dccb" stroke={ink} strokeWidth="1.5" />
      <rect x="3" y="14" width="7" height="36" fill="#cfc6b3" />
      <rect x="3" y="26" width="26" height="4" fill="#3a67b0" />
      <rect x="3" y="38" width="26" height="2" fill="#3a67b0" />
      <path d="M3 14 Q16 0 29 14 Z" fill="#f0eadb" stroke={ink} strokeWidth="1.5" />
      <rect x="15" y="1" width="2" height="6" fill={ink} />
      <rect x="12" y="42" width="8" height="8" fill="#2a3a52" stroke={ink} strokeWidth="1" />
      <rect x="26" y="16" width="2" height="34" fill="#8895a8" />
    </svg>
  )
}
