'use client'

import { useMemo, useState } from 'react'
import ScenePanel from '@/components/game/ScenePanel'
import { ControlStationBoard } from '@/components/game/control-station/ControlStationBoard'
import TopBar from '@/components/ui/TopBar'
import { useHelp } from '@/components/ui/useHelp'
import { buildControlStation } from '@/lib/control-station'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import { UI_ZONES } from '@/lib/ui-zones'
import type { Player } from '@/lib/game-types'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import styles from './InstrumentHubScreen.module.css'

interface InstrumentHubScreenProps {
  player: Player
  onBack: () => void
  onInspect: (signal: InstrumentSignal) => void
  onSnoozePing?: () => void
}

/**
 * Control Station. The route id stays `instrument-hub` so existing entry
 * points land here. This is the equipment station, not `player.controlBuilt`.
 */
export default function InstrumentHubScreen({ player, onBack, onInspect }: InstrumentHubScreenProps) {
  const { signals, loading } = useInstrumentSignals(player)
  const [bodyId, setBodyId] = useState('all')
  const help = useHelp('instrument-hub')
  const awaitingFeed = loading && signals.length === 0
  const model = useMemo(
    () => buildControlStation({
      player,
      signals,
      bodyId,
      loading: awaitingFeed,
    }),
    [player, signals, bodyId, awaitingFeed],
  )

  return (
    <ScenePanel
      ambient="survey"
      className={`game-screen theme-blueprint ${styles.screen}`}
      data-testid="instrument-hub-screen"
      scene={<div className={`ln-con-grid ${styles.grid}`} />}
    >
      <TopBar
        eyebrow="ORBITAL OBSERVATORY / DATA LINK"
        title="Control Station"
        onBack={onBack}
        right={help.button}
        solid
      />
      {help.layer}
      <div className={styles.frame} data-ui-zone={UI_ZONES.screenContent}>
        <ControlStationBoard model={model} onBody={setBodyId} onOpen={onInspect} />
      </div>
    </ScenePanel>
  )
}

export type InstrumentHubInspectScreen = Extract<import('@/lib/game-types').Screen, 'galaxy' | 'asteroid-discovery' | 'saturn-storm-search'>
