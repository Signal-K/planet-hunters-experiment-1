'use client'

import React, { useMemo } from 'react'
import { sceneXPercent } from '@/lib/scene/terrain-kit'
import { structureBuildMs } from '@/lib/systems/HubConstructionSystem'

export interface HubBuildingDef {
  kind: string
  plotX: number
  w: number
  hot?: boolean
  status?: 'ok' | 'info' | 'warn' | 'locked' | 'building'
  dimmed?: boolean
  rocketVariant?: 'explorer' | 'prospector'
  active?: boolean
  /** When still under construction, the timestamp it started. Drives the build-reveal animation. */
  buildStartedAt?: number
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

/**
 * Layer-by-layer "3D-printer" construction rig: 4 growing scaffold bars, 2
 * threshold cross-braces, and 2 drifting drones, all keyed to one fixed
 * `animation-duration` (the structure's build time) so every piece stays in
 * sync. Geometry mirrors ConstructionController.ts's PixiJS pad-building
 * technique (4 bars growing by progress, braces gating in at 35%/72%),
 * translated to CSS transform/opacity keyframes.
 */
function ConstructionRig({ w, h, animDuration, animDelay }: { w: number; h: number; animDuration: string; animDelay: string }) {
  const barX = [0.22, 0.4, 0.6, 0.78]
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="hub-construction-rig" style={{ position: 'absolute', inset: 0, width: w, height: h, overflow: 'visible' }} aria-hidden="true">
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

function StructureSprite({ kind, active, buildStartedAt }: { kind: string; active?: boolean; buildStartedAt?: number }) {
  const size = EARTH_BASE_STRUCTURE_SIZES[kind] ?? EARTH_BASE_STRUCTURE_SIZES.command
  const buildMs = structureBuildMs(kind)
  // Computed once per construction instance (memoized on buildStartedAt, which
  // is stable while a structure is building) so a negative `animation-delay`
  // places the CSS animation at the correct point in its timeline immediately
  // on mount — including after a page reload mid-build — instead of
  // restarting from 0 and desyncing from the status pill's own countdown.
  const elapsedMs = useMemo(() => (buildStartedAt !== undefined ? Math.max(0, Date.now() - buildStartedAt) : Infinity), [buildStartedAt])
  const isBuilding = elapsedMs < buildMs
  const animDuration = `${buildMs}ms`
  const animDelay = `-${elapsedMs}ms`

  const rig = isBuilding
    ? <ConstructionRig w={size.width} h={size.height} animDuration={animDuration} animDelay={animDelay} />
    : null

  const name: SpriteName | null = kind === 'launchpad' || kind === 'hangar' ? kind : null
  if (kind === 'surface-silo') {
    return (
      <>
        <svg
          viewBox="0 0 120 78" className={`earth-base-silo-sprite ${isBuilding ? 'hub-construct-reveal' : ''}`} role="img" aria-label="Surface silo"
          style={isBuilding ? { animationDuration: animDuration, animationDelay: animDelay } : undefined}
        >
          <path d="M26 25h68v34c0 8-15 14-34 14S26 67 26 59V25Z" fill="currentColor" opacity=".72" />
          <ellipse cx="60" cy="25" rx="34" ry="10" fill="currentColor" opacity=".95" />
          <path d="M42 23V12h36v11M48 12V7h24v5M18 70h84" fill="none" stroke="var(--ln-cyan-bright)" strokeWidth="3" strokeLinecap="round" />
          <path d="M38 35h44M38 46h44M38 57h44" stroke="var(--ln-bg)" strokeWidth="2" opacity=".7" />
          <circle cx="88" cy="38" r="4" fill="var(--ln-ok)" />
        </svg>
        {rig}
      </>
    )
  }
  if (!name) {
    // No base art exists yet for this kind (command/refinery/deep-space-telescope/
    // astronaut-academy) — only ever show the construction rig while it's
    // actively building; once done, render nothing, same as before this
    // feature existed.
    return rig
  }
  return (
    <>
      <span className={isBuilding ? 'hub-construct-reveal' : ''} style={isBuilding ? { display: 'block', animationDuration: animDuration, animationDelay: animDelay } : undefined}>
        <FlatSprite name={name} />
        {active && <FlatSprite name={name} className="earth-base-flat-sprite--highlight" />}
      </span>
      {rig}
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
              left: `clamp(62px, ${left}%, calc(100% - 62px))`,
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
            <StructureSprite kind={building.kind} active={building.active} buildStartedAt={building.buildStartedAt} />
          </span>
        )
      })}
    </div>
  )
}
