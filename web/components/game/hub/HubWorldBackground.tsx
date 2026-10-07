'use client'

import React from 'react'
import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'
import { TerrainScene } from '@/components/game/hub/TerrainScene'
import { COMPOSITIONS, type CompositionId } from '@/lib/scene/compositions'

/**
 * Earth Base backdrop — rebuilt 2026-08-26 (KES-260).
 *
 * **What this replaced, and why.** Three separate art sources used to share this
 * one component: a painted plate (`hub/earth_base_exterior_v1.jpg`) stretched
 * over the whole scene, a set of hand-written SVG mountain paths underneath it,
 * and a row of hand-written SVG skyline glyphs (`DomeBuilding`, `RadioTower`,
 * `DishTower`, `TankSilo`) on top. The Blender-rendered structures then sat in
 * front of all of it. Four rendering languages on one screen, which is why the
 * buildings read as *"just sprites pasted on top of a background image"* and why
 * the background and foreground buildings looked like different games.
 *
 * Now there is one source: the modular Blender terrain kit
 * (`tools/blender/models/terrain.py`), placed by `TerrainScene` and composed by
 * the entries in `lib/scene/compositions.ts`. Mountains, trees, roads, distant
 * facilities and the real foreground structures are all rendered by the same
 * pipeline, at the same camera, with the same facet split and outline weight.
 *
 * `composition` is what makes the Launchpad a different place rather than the
 * same picture scaled up — see `EARTH_BASE_PAD` vs `EARTH_BASE_WIDE`.
 *
 * Layout contract (unchanged): the ground line sits at `--hub-ground` from the
 * bottom. `HubScreen`/`BuildPlaceScreen` position DOM plot labels against the
 * same variable, so changing it means changing it in all of them.
 */
export function HubWorldBackground({
  phase = 'day',
  composition = 'earth-base-wide',
}: {
  phase?: TimeOfDayPhase
  composition?: CompositionId
}) {
  return (
    <div
      data-testid="hub-terrain-fallback"
      style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}
    >
      <TerrainScene composition={COMPOSITIONS[composition]} phase={phase} />
      {composition === 'earth-base-wide' && <PlanetBackdrop />}
    </div>
  )
}

/** Layer part: a huge outlined planet in the sky, same part as the native Hub (SSL-428). */
function PlanetBackdrop() {
  return (
    <svg
      data-testid="hub-planet-backdrop"
      aria-hidden
      viewBox="0 0 100 100"
      style={{
        position: 'absolute',
        top: '16%',
        right: '-12%',
        width: 'min(50vw, 300px)',
        height: 'min(50vw, 300px)',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <clipPath id="hub-planet-clip"><circle cx="50" cy="50" r="48" /></clipPath>
      </defs>
      <circle cx="53" cy="53" r="48" fill="var(--ln-bp-cyan, #1F78C1)" opacity="0.35" />
      <circle cx="50" cy="50" r="48" fill="#DFE9F3" />
      <g clipPath="url(#hub-planet-clip)">
        <rect x="0" y="26" width="100" height="9" fill="#42A6DF" opacity="0.45" />
        <rect x="0" y="43" width="100" height="9" fill="#168A80" opacity="0.45" />
        <rect x="0" y="60" width="100" height="9" fill="#42A6DF" opacity="0.45" />
      </g>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#0F2436" strokeWidth="1.2" />
    </svg>
  )
}
