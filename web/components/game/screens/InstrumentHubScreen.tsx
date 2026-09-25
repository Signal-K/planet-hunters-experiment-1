'use client'

import ScenePanel from '@/components/game/ScenePanel'
import TopBar from '@/components/ui/TopBar'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import { UI_ZONES } from '@/lib/ui-zones'
import type { Player } from '@/lib/game-types'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import styles from './InstrumentHubScreen.module.css'
import { ControlRoomBackdrop } from './ControlRoomBackdrop'
import { DownlinkControlDesk } from './DownlinkControlDesk'

interface InstrumentHubScreenProps {
  player: Player
  onBack: () => void
  onInspect: (signal: InstrumentSignal) => void
}

export default function InstrumentHubScreen({ player, onBack, onInspect }: InstrumentHubScreenProps) {
  const { signals, loading } = useInstrumentSignals(player)
  // Same online rule useInstrumentSignals uses to decide which feeds to fetch,
  // so the courtyard window label never claims a link the queue isn't reading.
  const transitOnline = !!player.freeOperations && !!player.transitSatelliteLaunchedAt
  const deepSpaceOnline = !!player.freeOperations && !!player.deepSpaceTelescopeBuilt

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
