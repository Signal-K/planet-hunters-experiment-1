'use client'

import type { Mission, Target } from '@/lib/data'
import PixiGalaxyMap from './PixiGalaxyMap'

interface GalaxyMapProps {
  mission: Mission
  targets: Target[]
  compatibleIds: Set<string>
  pickedId: string
  onPick: (id: string) => void
  hasCoach?: boolean
}

export default function GalaxyMap({ mission, targets, compatibleIds, pickedId, onPick, hasCoach }: GalaxyMapProps) {
  return (
    <PixiGalaxyMap
      mission={mission}
      targets={targets}
      compatibleIds={compatibleIds}
      pickedId={pickedId}
      onPick={onPick}
      hasCoach={hasCoach}
    />
  )
}
