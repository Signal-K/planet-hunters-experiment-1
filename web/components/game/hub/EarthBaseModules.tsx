'use client'

import { aboveGround, displaySite, homeSite, spriteCenterOffset, structureSprite, units } from '@/lib/scene/base-site'
import React, { useEffect, useState } from 'react'
import { sceneXPercent } from '@/lib/scene/terrain-kit'
import { LAUNCHPAD_SCENE_WIDTH_PCT, structureAnchorPercent, structureTierScale } from '@/lib/scene/base-world'
import { structureBuildMs } from '@/lib/systems/HubConstructionSystem'
import { PixelStructure } from '@/components/game/hub/PixelStructure'
import type { InstalledCustomizerPartsByKind } from '@/lib/data'
export interface HubBuildingDef {
  kind: string
  plotX: number
  w: number
  /** 1 is the small first build. 2 and 3 grow into the full module. Absent means level 1. */
  level?: number
  hot?: boolean
  status?: 'ok' | 'info' | 'warn' | 'locked' | 'building'
  dimmed?: boolean
  rocketVariant?: 'explorer' | 'prospector'
  active?: boolean
  /** When still under construction, the timestamp it started. Drives the build-reveal animation. */
  buildStartedAt?: number
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

export function LaunchpadModules({ className = '', parts, rocket = false }: { className?: string; parts?: InstalledCustomizerPartsByKind | null; rocket?: boolean | 'core' }) {
  return <span className={className} style={{ display: 'block', width: '100%', height: '100%' }}><PixelStructure kind="launchpad" level={3} parts={parts} rocket={rocket} /></span>
}

export function HangarModules({ className = '' }: { className?: string }) {
  return <span className={className} style={{ display: 'block', width: '100%', height: '100%' }}><PixelStructure kind="hangar" level={3} /></span>
}

/**
 * Layer-by-layer "3D-printer" construction rig: 4 growing scaffold bars, 2
 * threshold cross-braces, and 2 drifting drones, all keyed to one fixed
 * `animation-duration` (the structure's build time) so every piece stays in
 * sync. Geometry mirrors ConstructionController.ts's PixiJS pad-building
 * technique (4 bars growing by progress, braces gating in at 35%/72%),
 * translated to CSS transform/opacity keyframes.
 */
function ConstructionRig({ animDuration, animDelay }: { animDuration: string; animDelay: string }) {
  const barX = [0.22, 0.4, 0.6, 0.78]
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="hub-construction-rig" aria-hidden="true">
      {barX.map((x, i) => (
        <rect
          key={i}
          className="hub-scaffold-bar"
          x={x * 100 - 1.5} y={0} width={3} height={100}
          style={{ transformOrigin: '50% 100%', animationDuration: animDuration, animationDelay: animDelay }}
        />
      ))}
      <rect className="hub-scaffold-brace hub-scaffold-brace--1" x={18} y={62} width={64} height={4}
        style={{ animationDuration: animDuration, animationDelay: animDelay }} />
      <rect className="hub-scaffold-brace hub-scaffold-brace--2" x={12} y={28} width={76} height={4}
        style={{ animationDuration: animDuration, animationDelay: animDelay }} />
      <g className="hub-drone hub-drone--1" style={{ animationDuration: animDuration, animationDelay: animDelay }}>
        <path d="M50 20 l7 7 -7 7 -7 -7 Z" fill="var(--ln-cyan-bright)" />
        <circle cx="50" cy="27" r="2.4" fill="var(--hub-panel-deep)" />
      </g>
      <g className="hub-drone hub-drone--2" style={{ animationDuration: animDuration, animationDelay: animDelay }}>
        <path d="M68 45 l6 6 -6 6 -6 -6 Z" fill="var(--hub-cyan)" />
        <circle cx="68" cy="51" r="2" fill="var(--hub-panel-deep)" />
      </g>
    </svg>
  )
}

function StructureSprite({ kind, level = 1, active, buildStartedAt, parts, rocket }: { kind: string; level?: number; active?: boolean; buildStartedAt?: number; parts?: InstalledCustomizerPartsByKind | null; rocket?: boolean | 'core' }) {
  const buildMs = structureBuildMs(kind)
  // `buildStartedAt` does not change when the build finishes, so a value
  // captured once at mount left `isBuilding` true forever and the cyan
  // scaffold stayed on top of the finished sprite. Re-render when the
  // remaining time elapses. The negative animation-delay still places the
  // CSS timeline correctly on mount, including a reload mid-build.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (buildStartedAt === undefined) return
    const remaining = buildStartedAt + buildMs - Date.now()
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setNow(Date.now()), remaining)
    return () => window.clearTimeout(timer)
  }, [buildMs, buildStartedAt])
  const elapsedMs = buildStartedAt !== undefined ? Math.max(0, now - buildStartedAt) : Infinity
  const isBuilding = elapsedMs < buildMs
  const animDuration = `${buildMs}ms`
  const animDelay = `-${elapsedMs}ms`

  const rig = isBuilding
    ? <ConstructionRig animDuration={animDuration} animDelay={animDelay} />
    : null

  if (kind === 'surface-silo') return rig
  return (
    <>
      <span
        className={isBuilding ? 'hub-construct-reveal' : ''}
        data-active={active ? 'true' : undefined}
        style={isBuilding ? { display: 'block', animationDuration: animDuration, animationDelay: animDelay } : { display: 'block', height: '100%' }}
      >
        <PixelStructure kind={kind} level={level} parts={parts} rocket={kind === 'launchpad' ? rocket : true} />
      </span>
      {rig}
    </>
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

/** Half-width in hub scene units (the 402-wide plot space). */
export function structureHalfScene(kind: string, level = 1, sceneWidth = 402): number {
  return (structureWidthPct(kind, level) / 100) * sceneWidth / 2
}

const HIDDEN_BASE_KINDS = new Set(['command', 'refinery', 'garage', 'deep-space-telescope', 'transit-telescope', 'astronaut-academy', 'surface-silo'])

export function EarthBaseModules({ buildings, parts, padRocket = false }: { buildings: HubBuildingDef[]; parts?: InstalledCustomizerPartsByKind | null; padRocket?: boolean | 'core' }) {
  return (
    <div aria-hidden="true" className="earth-base-modules-layer" style={{ '--hub-fit': '1' } as React.CSSProperties}>
      {buildings.map(building => {
        if (building.kind === 'surface-silo' || HIDDEN_BASE_KINDS.has(building.kind)) return null
        const kit = building.kind === 'launchpad' || building.kind === 'hangar' || building.kind === 'market' || building.kind === 'control-station'
        const size = EARTH_BASE_STRUCTURE_SIZES[building.kind] ?? EARTH_BASE_STRUCTURE_SIZES.launchpad
        const widthPct = structureWidthPct(building.kind, building.level ?? 1)
        // Kit structures stand on their home site on the strip (shared site map); others keep the plot percentage.
        const authoredSite = kit ? homeSite(building.kind) : null
        const site = authoredSite ? displaySite(authoredSite) : null
        const sprite = kit ? structureSprite(building.kind) : null
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
            <StructureSprite kind={building.kind} level={building.level ?? (building.kind === 'market' ? 2 : 1)} active={building.active} buildStartedAt={building.buildStartedAt} parts={parts} rocket={building.kind === 'launchpad' ? padRocket : true} />
          </span>
        )
      })}
    </div>
  )
}
