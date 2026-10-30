'use client'

import { useMemo, useState } from 'react'
import board from '@/components/game/MissionBoard.module.css'
import { ControlStationBoard } from '@/components/game/control-station/ControlStationBoard'
import { useHelp } from '@/components/ui/useHelp'
import { buildControlStation } from '@/lib/control-station'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import { UI_ZONES } from '@/lib/ui-zones'
import type { Player } from '@/lib/game-types'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import EnceladusSurveyChart from '@/components/game/EnceladusSurveyChart'
import SurveyScanConsole from '@/components/game/control-station/SurveyScanConsole'
import type { Target } from '@/lib/data'
import { ResearchCalendar } from '@/components/game/control-station/ResearchCalendar'
import type { CommunityResearch } from '@/lib/research/stamps'
import { SkyBadgeRow } from './SkyBadgeRow'
import { skyEventNow } from '@/lib/data/sky-events'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { wswBanner } from '@/lib/wsw'
import styles from './InstrumentHubScreen.module.css'

interface InstrumentHubScreenProps {
  player: Player
  onBack: () => void
  onInspect: (signal: InstrumentSignal) => void
  onBuild: () => void
  onSnoozePing?: () => void
  /** Claim the Enceladus plot from the stored survey chart. */
  /** Survey scan (SSL-512): bodies a telescope can chart, and the actions that run it. */
  targets?: readonly Target[]
  onStartScan?: (targetId: string) => void
  onResolveScan?: () => void
  /** SSL-673: the shared monthly total, null until it loads or when offline. */
  communityResearch?: CommunityResearch | null
}

/**
 * Control Station. The route id stays `instrument-hub` so existing entry
 * points land here. This is the equipment station, not `player.controlBuilt`.
 */
export default function InstrumentHubScreen({ player, onBack, onInspect, onBuild, targets = [], onStartScan, onResolveScan, communityResearch }: InstrumentHubScreenProps) {
  const { signals, loading } = useInstrumentSignals(player)
  const [bodyId, setBodyId] = useState('all')
  const help = useHelp('instrument-hub', { firstVisit: true })
  const awaitingFeed = loading && signals.length === 0
  const now = useMemo(() => skyEventNow(isDevLauncherEnabled()), [])
  const model = useMemo(
    () => buildControlStation({
      player,
      signals,
      bodyId,
      loading: awaitingFeed,
      now,
    }),
    [player, signals, bodyId, awaitingFeed, now],
  )

  const extras = (
    <div className={styles.extras}>
      {onStartScan && onResolveScan && player.freeOperations && (
        <SurveyScanConsole player={player} targets={targets} onStart={onStartScan} onResolve={onResolveScan} />
      )}
      {player.moonSurveyCharts?.enceladus && (
        <section data-testid="control-station-survey-charts" aria-label="Survey charts" style={{ display: 'grid', gap: 8, padding: 12, border: '1px solid var(--ln-hairline-strong)', borderRadius: 8, background: 'var(--ln-panel)' }}>
          <div className="ln-section-label">Survey charts</div>
          <EnceladusSurveyChart
            chart={player.moonSurveyCharts.enceladus}
            classification={player.moonSurveyCharts.enceladus.frameId ? player.saturnClassifications?.[player.moonSurveyCharts.enceladus.frameId] : undefined}
          />
        </section>
      )}
      <SkyBadgeRow badges={player.badges} />
    </div>
  )

  return (
    <div className={`${board.scene} ${styles.screen}`} data-testid="instrument-hub-screen" data-screen="instrument-hub">
      <section className={board.dispatch} aria-label="Control Station" data-ui-zone={UI_ZONES.screenContent}>
        <nav className={board.rail} aria-label="Control Station">
          <button type="button" className={`${board.round} ${board.railClose}`} data-testid="top-bar-back" aria-label="Back" onClick={onBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>
          </button>
          <button type="button" className={board.tab} data-active="true" data-tab="control-station" aria-label="Control Station">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18a8 8 0 0 1 16 0" /><path d="M12 18 16 9" /><circle cx="12" cy="18" r="1.5" /></svg>
            <span className={board.tabLabel}>Control Station</span>
          </button>
        </nav>
        {help.button && <div className={board.railHelp}>{help.button}</div>}
        <ControlStationBoard
          model={model}
          onBody={setBodyId}
          onOpen={onInspect}
          onBuild={onBuild}
          banner={wswBanner(player.badges, now)}
          left={<ResearchCalendar stamps={player.researchStamps} now={now} community={communityResearch} hasDiscovery={Object.keys(player.discoveredExoplanetTargets ?? {}).length > 0} />}
          right={extras}
        />
      </section>
      {help.layer}
    </div>
  )
}

export type InstrumentHubInspectScreen = Extract<import('@/lib/game-types').Screen, 'galaxy' | 'asteroid-discovery' | 'saturn-storm-search'>
