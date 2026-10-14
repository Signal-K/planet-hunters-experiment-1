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
import EnceladusSurveyChart from '@/components/game/EnceladusSurveyChart'
import SurveyScanConsole from '@/components/game/control-station/SurveyScanConsole'
import type { Target } from '@/lib/data'
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
  onClaimSurveyPlot?: () => void
  /** Survey scan (SSL-512): bodies a telescope can chart, and the actions that run it. */
  targets?: readonly Target[]
  onStartScan?: (targetId: string) => void
  onResolveScan?: () => void
}

/**
 * Control Station. The route id stays `instrument-hub` so existing entry
 * points land here. This is the equipment station, not `player.controlBuilt`.
 */
export default function InstrumentHubScreen({ player, onBack, onInspect, onBuild, onClaimSurveyPlot, targets = [], onStartScan, onResolveScan }: InstrumentHubScreenProps) {
  const { signals, loading } = useInstrumentSignals(player)
  const [bodyId, setBodyId] = useState('all')
  const help = useHelp('instrument-hub')
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
        <ControlStationBoard model={model} onBody={setBodyId} onOpen={onInspect} onBuild={onBuild} banner={wswBanner(player.badges, now)} />
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
            {player.moonSurveyCharts.enceladus.tier === 'gold' && !player.moonSurveyCharts.enceladus.territoryPlotClaimedAt && onClaimSurveyPlot && (
              <button type="button" data-testid="control-station-claim-plot" onClick={onClaimSurveyPlot} style={{ minHeight: 44, font: '800 14px var(--ln-font-display)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Claim Enceladus plot</button>
            )}
          </section>
        )}
        <SkyBadgeRow badges={player.badges} />
      </div>
    </ScenePanel>
  )
}

export type InstrumentHubInspectScreen = Extract<import('@/lib/game-types').Screen, 'galaxy' | 'asteroid-discovery' | 'saturn-storm-search'>
