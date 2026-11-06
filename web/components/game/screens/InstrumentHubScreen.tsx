'use client'

import { onboardingMissionDone } from '@/lib/systems/FlightPlanSystem'
import { useMemo, useState } from 'react'
import ScenePanel from '@/components/game/ScenePanel'
import { ControlStationConsole } from '@/components/game/control-station/ControlStationConsole'
import consoleStyles from '@/components/game/control-station/ControlStationConsole.module.css'
import { WorldSpaceWeekBanner, WorldSpaceWeekChips } from '@/components/game/WorldSpaceWeek'
import { buildStationSky, communityTelescopes, stationHistory, stationTelescopes, type SkyView } from '@/lib/control-station-sky'
import { useHelp } from '@/components/ui/useHelp'
import { buildControlStation } from '@/lib/control-station'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import { UI_ZONES } from '@/lib/ui-zones'
import type { Player } from '@/lib/game-types'
import { GROUND_TELESCOPE_EXTRA_ASTEROID_CANDIDATES, type InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import { STRUCTURE_PRICES } from '@/lib/data/economy'
import { formatCurrency } from '@/lib/format'
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
  /** Opens a community instrument's screen (ORI-1's meteor radio). */
  onOpenScreen: (screen: 'radio-meteors') => void
  /** Builds the ground telescope in place; false when it could not. */
  onBuildGroundTelescope: () => boolean
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
export default function InstrumentHubScreen({ player, onBack, onInspect, onOpenScreen, onBuildGroundTelescope, targets = [], onStartScan, onResolveScan, communityResearch }: InstrumentHubScreenProps) {
  const { signals, loading } = useInstrumentSignals(player)
  const [view, setView] = useState<SkyView>('all')
  const [telescopeId, setTelescopeId] = useState<string | null>(null)
  const [logbookOpen, setLogbookOpen] = useState(false)
  const help = useHelp('instrument-hub', { firstVisit: !onboardingMissionDone(player.flightPlan) })
  const [justBuilt, setJustBuilt] = useState(false)
  const groundCost = STRUCTURE_PRICES.groundTelescope
  const buildShortfall = player.francs < groundCost ? `${formatCurrency(groundCost - player.francs, { compact: true })} more` : null
  const awaitingFeed = loading && signals.length === 0
  const now = useMemo(() => skyEventNow(isDevLauncherEnabled()), [])
  const model = useMemo(
    () => buildControlStation({
      player,
      signals,
      bodyId: 'all',
      loading: awaitingFeed,
      now,
    }),
    [player, signals, awaitingFeed, now],
  )
  const telescopes = useMemo(() => [...stationTelescopes(model), ...communityTelescopes(player)], [model, player])
  const activeTelescope = telescopes.find(scope => scope.id === telescopeId && scope.built) ?? null
  const anomalies = useMemo(
    () => buildStationSky({ player, signals: awaitingFeed ? [] : signals, view, telescope: activeTelescope }),
    [player, signals, awaitingFeed, view, activeTelescope],
  )
  const history = useMemo(() => stationHistory(player), [player])

  return (
    <ScenePanel
      ambient="survey"
      className={`game-screen theme-blueprint ${styles.screen}`}
      data-testid="instrument-hub-screen"
      scene={<div className={styles.grid} />}
    >
      {help.layer}
      <div className={styles.content} data-ui-zone={UI_ZONES.screenContent}>
        <ControlStationConsole
          telescopes={telescopes}
          anomalies={anomalies}
          view={view}
          onView={setView}
          telescopeId={activeTelescope?.id ?? null}
          onTelescope={setTelescopeId}
          onOpen={onInspect}
          onOpenScreen={onOpenScreen}
          history={history}
          acquiring={awaitingFeed}
          onBuild={() => { if (onBuildGroundTelescope()) setJustBuilt(true) }}
          buildCost={formatCurrency(groundCost, { compact: true })}
          buildShortfall={buildShortfall}
          onLogbook={() => setLogbookOpen(true)}
          rail={(
            <nav className={consoleStyles.rail} aria-label="Control station">
              <button type="button" data-testid="control-station-back" aria-label="Back" onClick={onBack}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>
              </button>
              {help.button}
            </nav>
          )}
        />
      {justBuilt && (
        <p className={styles.toast} role="status" data-testid="ground-telescope-built">
          Ground telescope built. It adds {GROUND_TELESCOPE_EXTRA_ASTEROID_CANDIDATES} asteroid candidate to your feed every day.
        </p>
      )}
      {logbookOpen && (
        <div className={styles.sheetBackdrop} aria-label="Logbook" data-testid="control-station-logbook-sheet" onClick={event => { if (event.target === event.currentTarget) setLogbookOpen(false) }}>
          <section className={styles.sheet}>
            <header className={styles.sheetHead}>
              <h2>Logbook</h2>
              <button type="button" aria-label="Close logbook" onClick={() => setLogbookOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </header>
            <ResearchCalendar stamps={player.researchStamps} now={now} community={communityResearch} hasDiscovery={Object.keys(player.discoveredExoplanetTargets ?? {}).length > 0} />
            {onStartScan && onResolveScan && player.freeOperations && (
              <SurveyScanConsole player={player} targets={targets} onStart={onStartScan} onResolve={onResolveScan} />
            )}
            {player.moonSurveyCharts?.enceladus && (
              <section data-testid="control-station-survey-charts" aria-label="Survey charts" className={styles.chart}>
                <div className="ln-section-label">Survey charts</div>
                <EnceladusSurveyChart
                  chart={player.moonSurveyCharts.enceladus}
                  classification={player.moonSurveyCharts.enceladus.frameId ? player.saturnClassifications?.[player.moonSurveyCharts.enceladus.frameId] : undefined}
                />
              </section>
            )}
            <WorldSpaceWeekBanner banner={wswBanner(player.badges, now)} />
            <WorldSpaceWeekChips chips={model.skyBadges} />
            <SkyBadgeRow badges={player.badges} />
          </section>
        </div>
      )}
      </div>
    </ScenePanel>
  )
}

export type InstrumentHubInspectScreen = Extract<import('@/lib/game-types').Screen, 'galaxy' | 'asteroid-discovery' | 'saturn-storm-search'>
