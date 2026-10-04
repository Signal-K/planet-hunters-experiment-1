'use client'

import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'

/**
 * The mission-creation journey is one physical place: the Earth base.  Each
 * step changes the instrument in front of the player, rather than swapping to
 * another app-like background.  Keeping this as a real composed scene also
 * keeps the DOM controls honest: they sit in the world, not on a blank board.
 */
export default function MissionSceneBackdrop({
  composition = 'earth-base-wide',
}: {
  composition?: 'earth-base-wide' | 'earth-base-pad'
}) {
  return <HubWorldBackground phase="day" composition={composition} />
}
