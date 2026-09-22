'use client'

import type { ReactNode } from 'react'
import { CLASSIFY_SCREEN_RECT, INSTRUMENT_HUB_ASSETS, QUEUE_READOUT_RECT } from './hub-chrome-layout'
import styles from './InstrumentHubScene.module.css'

interface InstrumentHubSceneProps {
  classify: ReactNode
  queue: ReactNode
  controls: ReactNode
}

function pct(value: number): string {
  return `${value}%`
}

export function InstrumentHubScene({ classify, queue, controls }: InstrumentHubSceneProps) {
  return (
    <div className={styles.scene} data-testid="instrument-hub-scene" aria-hidden="false">
      <img
        className={styles.warmWindow}
        src={INSTRUMENT_HUB_ASSETS.warmWindow}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <img
        className={styles.plate}
        src={INSTRUMENT_HUB_ASSETS.plate}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div
        className={styles.classifyMount}
        style={{
          left: pct(CLASSIFY_SCREEN_RECT.left),
          top: pct(CLASSIFY_SCREEN_RECT.top),
          width: pct(CLASSIFY_SCREEN_RECT.width),
          height: pct(CLASSIFY_SCREEN_RECT.height),
        }}
      >
        {classify}
      </div>
      <div
        className={styles.queueMount}
        style={{
          left: pct(QUEUE_READOUT_RECT.left),
          top: pct(QUEUE_READOUT_RECT.top),
          width: pct(QUEUE_READOUT_RECT.width),
          height: pct(QUEUE_READOUT_RECT.height),
        }}
      >
        {queue}
      </div>
      {controls}
    </div>
  )
}
