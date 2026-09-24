'use client'

import type { ReactNode } from 'react'
import { InstrumentHubEarthBaseViewport } from './InstrumentHubEarthBaseViewport'
import type { Player } from '@/lib/game-types'
import styles from './InstrumentHubScene.module.css'

interface InstrumentHubSceneProps {
  player: Player
  workSurface: ReactNode
  controls: ReactNode
}

export function InstrumentHubScene({ player, workSurface, controls }: InstrumentHubSceneProps) {
  return (
    <div className={styles.scene} data-testid="instrument-hub-scene">
      <InstrumentHubEarthBaseViewport player={player} />
      <div className={styles.workSurface}>{workSurface}</div>
      <div className={styles.controls}>{controls}</div>
    </div>
  )
}
