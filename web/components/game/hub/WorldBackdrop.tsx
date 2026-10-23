'use client'

import type { CSSProperties } from 'react'
import { BaseWorldCanvas } from '@/components/game/hub/BaseWorldCanvas'
import { EarthBaseModules, type HubBuildingDef } from '@/components/game/hub/EarthBaseModules'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { useViewSize } from '@/lib/hooks/useViewSize'
import { homeCenter, kitScale } from '@/lib/scene/base-site'

const SHOWCASE: HubBuildingDef[] = [
  { kind: 'launchpad', plotX: 50, w: 30, level: 3 },
  { kind: 'market', plotX: 80, w: 30, level: 2 },
]

/**
 * The live base world as a full-bleed backdrop for pre-game screens (landing, sign in): the same game objects,
 * sky and structures the player's base uses. It does not imply that a player has selected a rocket.
 */
export function WorldBackdrop({ buildings, className }: { buildings?: HubBuildingDef[]; className?: string }) {
  const view = useViewSize()
  // A narrow view frames the pad and rocket alone; the wider showcase would push the rocket off screen.
  buildings ??= view.w < 700 ? SHOWCASE.slice(0, 1) : SHOWCASE
  const { grade } = useTimeOfDay()
  const px = kitScale(view)
  const camX = view.w / 2 - homeCenter(buildings.map(b => b.kind), view.w / px) * px
  return (
    <div className={className} data-testid="world-backdrop" aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, '--px': `${px}px`, '--hub-ground': '20%' } as CSSProperties}>
      <BaseWorldCanvas px={px} camera={{ x: camX, y: 0, zoom: 1 }} time={grade} biome="mountains" />
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${camX}px)` }}>
        <EarthBaseModules buildings={buildings} />
      </div>
    </div>
  )
}
