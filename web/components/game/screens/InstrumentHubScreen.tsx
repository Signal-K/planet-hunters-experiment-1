'use client'

import { useEffect, useMemo, useState } from 'react'
import ScenePanel from '@/components/game/ScenePanel'
import TopBar from '@/components/ui/TopBar'
import { InstrumentHubControlsBar } from '@/components/game/instrument-hub/InstrumentHubControlsBar'
import { InstrumentHubScene } from '@/components/game/instrument-hub/InstrumentHubScene'
import { InstrumentHubWorkSurface } from '@/components/game/instrument-hub/InstrumentHubWorkSurface'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import {
  DEFAULT_INSTRUMENT_HUB_VIEW,
  cycleSourceFilter,
  filterInstrumentSignals,
  selectInstrumentSignalIndex,
} from '@/lib/instrument-hub-state'
import type { Player } from '@/lib/game-types'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import { UI_ZONES } from '@/lib/ui-zones'
import styles from './InstrumentHubScreen.module.css'
import { ControlRoomBackdrop } from './ControlRoomBackdrop'
import { DownlinkControlDesk } from './DownlinkControlDesk'

interface InstrumentHubScreenProps {
  player: Player
  onBack: () => void
  onInspect: (signal: InstrumentSignal) => void
  onSnoozePing?: () => void
}

export default function InstrumentHubScreen({ player, onBack, onInspect }: InstrumentHubScreenProps) {
  const { signals, loading } = useInstrumentSignals(player)
  const [view, setView] = useState(DEFAULT_INSTRUMENT_HUB_VIEW)
  const [armed, setArmed] = useState(false)

  const filteredSignals = useMemo(
    () => filterInstrumentSignals(signals, view),
    [signals, view],
  )

  useEffect(() => {
    setView(current => selectInstrumentSignalIndex(current, current.selectedIndex, filteredSignals.length))
  }, [filteredSignals.length])

  const transitOnline = !!player.transitSatelliteLaunchedAt
  const deepSpaceOnline = !!player.deepSpaceTelescopeBuilt

  const selectedSignal = filteredSignals[view.selectedIndex] ?? null

  const openSelectedInspector = () => {
    if (!selectedSignal) return
    setArmed(true)
    onInspect(selectedSignal)
  }

  return (
    <ScenePanel
      ambient="observatory"
      className={`game-screen theme-deep ${styles.screen}`}
      data-testid="instrument-hub-screen"
      scene={<ControlRoomBackdrop phase="day" windowLabel={transitOnline ? 'COURTYARD / TESS LINK' : deepSpaceOnline ? 'COURTYARD / NEOCP LINK' : 'COURTYARD / RECEIVER STANDBY'} />}
    >
      <TopBar eyebrow="ORBITAL OBSERVATORY / DATA LINK" title="Instrument Hub" onBack={onBack} glass />
      <div className={styles.frame} data-ui-zone={UI_ZONES.screenContent}>
        {!loading && signals.length === 0 && <span className={styles.srOnly} data-testid="instrument-hub-empty">No unresolved instrument data.</span>}
        {signals.map(signal => <span key={`${signal.kind}:${signal.id}`} className={styles.srOnly} data-testid="instrument-signal">{signal.title}</span>)}
        <DownlinkControlDesk signals={signals} loading={loading} onInspect={onInspect} />
      </div>
    </ScenePanel>
  )
}

export type InstrumentHubInspectScreen = Extract<import('@/lib/game-types').Screen, 'galaxy' | 'asteroid-discovery'>
