'use client'

import { useEffect, useState } from 'react'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { EarthBaseModules } from '@/components/game/hub/EarthBaseModules'
import { RoadRover } from '@/components/game/hub/RoadRover'
import { Scene } from '@/lib/engine/Scene'
import type { EntityData } from '@/lib/engine/types'
import { buildHubBuildingDefs } from '@/lib/hub-building-defs'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { EARTH_BASE_WIDE } from '@/lib/scene/compositions'
import type { Player } from '@/lib/game-types'
import styles from './InstrumentHubEarthBaseViewport.module.css'

interface InstrumentHubEarthBaseViewportProps {
  player: Player
}

export function InstrumentHubEarthBaseViewport({ player }: InstrumentHubEarthBaseViewportProps) {
  const skyPhase = useTimeOfDay()
  const [plotEntities, setPlotEntities] = useState<EntityData[]>([])

  useEffect(() => {
    Scene.load('/game/scenes/hub.scene.json')
      .then(data => { if (data.entities?.length) setPlotEntities(data.entities) })
      .catch(() => {})
  }, [])

  const buildings = buildHubBuildingDefs(player, plotEntities)

  return (
    <div className={styles.viewport} data-testid="instrument-hub-earth-viewport">
      <div className={styles.frame}>
        <div className={styles.liveScene}>
          <HubWorldBackground phase={skyPhase.phase} composition="earth-base-wide" />
          <RoadRover road={EARTH_BASE_WIDE.roadPaths?.[0]} />
          <EarthBaseModules buildings={buildings} />
        </div>
      </div>
    </div>
  )
}
