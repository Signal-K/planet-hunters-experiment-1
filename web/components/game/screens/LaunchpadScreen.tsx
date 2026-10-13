'use client'

import React, { useState } from 'react'
import { BaseDock } from '@/components/game/hub/BaseDock'
import flight from './FlightScene.module.css'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import type { RocketConfig, Target } from '@/lib/data'
import { isSettledMissionRun } from '@/lib/systems/MissionRunLifecycle'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import RocketBuilderScene from '@/components/game/screens/RocketBuilderScene'
import type { BuilderLoadout } from '@/lib/launchpad/rocketBuilder'

interface LaunchpadScreenProps {
  onBack: () => void
  onPick: (id: string, freeHaulDisposition?: 'store' | 'sell') => void
  onViewContracts: () => void
  onLaunchpadAction: () => void
  onOpenHangar: () => void
  onResumeMission?: () => void
  missionRuns?: Array<{ key: string; label: string; phase: string }>
  onResumeMissionRun?: (key: string) => void
  onViewMissionLog?: () => void
  missionsDone: number
  freeOperations: boolean
  catalog: Catalog
  player: Player
  rocketImageSrc?: string
  selectedRocketName?: string
  francs?: number
  hydrated?: boolean
  missionMenuOpen?: boolean
  onMissionMenuOpenChange?: (open: boolean) => void
  onOpenSiloBuild?: () => void
  /** Own-program work opens from the Mission Board. Callers may still pass this. */
  onOpenControlStation?: () => void
  onOpenMarket?: () => void
  /** Scrub the active run after the launchpad confirm rail (SSL-512). */
  onAbandonMission?: () => void
  mission?: { title: string } | null
  target?: Pick<Target, 'id' | 'name' | 'type' | 'archetype'> | null
  rocket?: RocketConfig
  onInstallLoadout?: (next: BuilderLoadout, prev: BuilderLoadout) => boolean
  onRequestLaunch?: () => void
  launching?: boolean
  onLaunchComplete?: () => void
  helpScreen?: 'launchpad' | 'fab' | 'targets' | 'rocket-buy'
  launchTestId?: string
  launchDisabled?: boolean
}

function HangarGlyph() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 21V8l3-4h10l3 4v13M4 9h16M8 21v-7h8v7" /></svg>
}

function MissionGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
}

const STARTER_ROCKET: RocketConfig = { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' }

export default function LaunchpadScreen({
  onBack, onViewContracts, onLaunchpadAction, onOpenHangar, onResumeMission, missionRuns = [], onResumeMissionRun, onViewMissionLog, player, rocketImageSrc = '', selectedRocketName = 'Explorer', francs = 0, hydrated = false, onAbandonMission,
  mission = null, target = null, rocket = STARTER_ROCKET, onInstallLoadout, onRequestLaunch, launching = false, onLaunchComplete, helpScreen = 'launchpad', launchTestId = 'launch-btn', launchDisabled = false,
  missionsDone,
}: LaunchpadScreenProps) {
  const [missionRunsOpen, setMissionRunsOpen] = useState(false)
  const [activeMissionCalloutDismissed, setActiveMissionCalloutDismissed] = useState(false)
  const [confirmingScrub, setConfirmingScrub] = useState(false)
  const towerLabel = player.pendingLaunch
    ? 'Inspect pending launch'
    : player.freeOperations
      ? 'Create a new mission'
      : 'View your assigned mission'

  const launch = () => {
    if (!target) {
      onViewContracts()
      return
    }
    if (onRequestLaunch) onRequestLaunch()
    else onLaunchpadAction()
  }

  return (
    <div
      className="game-screen theme-blueprint ln-scene-launchpad rocket-builder-host"
      data-testid="launchpad-focus-screen"
      data-game-hydrated={hydrated ? 'true' : 'false'}
    >
      <RocketBuilderScene
        missionTitle={mission?.title ?? player.activeMission?.label ?? null}
        target={target}
        rocket={rocket}
        installed={player.shipCustomizerParts}
        missionsDone={missionsDone}
        skills={player.unlockedSkillNodes}
        francs={francs}
        helpScreen={helpScreen}
        towerLabel={towerLabel}
        launchTestId={launchTestId}
        launchDisabled={launchDisabled}
        onChooseMission={onViewContracts}
        onLaunch={launch}
        onInstall={onInstallLoadout}
        launching={launching}
        launchRocketName={selectedRocketName}
        launchRocketSrc={rocketImageSrc}
        onLaunchComplete={onLaunchComplete}
      />

      {player.activeMission && onResumeMission && !activeMissionCalloutDismissed && !missionRunsOpen && (
        <section className="launchpad-active-mission" data-testid="launchpad-active-mission-callout" aria-label="Mission in progress">
          <div>
            <span className="launchpad-guide-kicker">MISSION IN PROGRESS</span>
            <h2>{player.activeMission.label}</h2>
            <p>{(player.missionPhase ?? 'transit').toUpperCase()} · VEHICLE ACTIVE</p>
          </div>
          <div className="launchpad-active-mission__actions">
            <button type="button" className="launchpad-active-mission__dismiss" onClick={() => setActiveMissionCalloutDismissed(true)}>DISMISS</button>
            {onAbandonMission && <button type="button" className="launchpad-active-mission__dismiss" data-testid="launchpad-scrub-run" onClick={() => setConfirmingScrub(true)}>SCRUB</button>}
            <button type="button" className="launchpad-active-mission__resume" data-testid="launchpad-resume-mission-btn" aria-label="Jump back to active mission" onClick={onResumeMission}><MissionGlyph /> RESUME MISSION</button>
          </div>
        </section>
      )}

      {missionRunsOpen && missionRuns.length > 0 && (
        <section className="launchpad-mission-runs" data-testid="launchpad-mission-runs" aria-label="Active mission runs">
          <div>
            <span className="launchpad-guide-kicker">PROGRAM / ACTIVE OPERATIONS</span>
            <h2>Mission runs</h2>
          </div>
          <button type="button" className="launchpad-mission-menu-close" onClick={() => setMissionRunsOpen(false)}>CLOSE</button>
          <div className="launchpad-mission-run-list">
            {missionRuns.map(run => (
              <div key={run.key} className="launchpad-mission-run-row">
                <button type="button" data-testid={`launchpad-resume-run-${run.key}`} onClick={() => onResumeMissionRun?.(run.key)}>
                  <MissionGlyph />
                  <span>{run.label}</span>
                  <strong>{run.phase.toUpperCase()}</strong>
                </button>
                {onAbandonMission && run.key === (player.missionRunId ?? `${player.activeMission?.id ?? ''}:${player.transitStartedAt ?? 'current'}`) && (
                  <button type="button" className="launchpad-mission-run-scrub" data-testid="launchpad-scrub-run-card" onClick={() => setConfirmingScrub(true)}>SCRUB</button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {confirmingScrub && onAbandonMission && (
        <ActionConfirmBar
          eyebrow="Active run"
          title="Scrub this run"
          description={isSettledMissionRun(player, {
            runId: player.missionRunId,
            missionId: player.activeMission?.id,
            launchedAt: player.transitStartedAt,
          })
            ? 'This run was already collected. Scrubbing it clears the listing and does not charge a penalty.'
            : 'Abandon the current run? Cargo and laser charges from it are cleared. A payout penalty applies.'}
          confirmLabel="Confirm Scrub"
          onConfirm={() => { setConfirmingScrub(false); onAbandonMission() }}
          onDismiss={() => setConfirmingScrub(false)}
        />
      )}

      <div className={`${flight.dock} launchpad-shared-dock`}>
        <BaseDock
          variant="flight"
          buildLabel="Hangar"
          buildTestId="launchpad-open-hangar-btn"
          buildIcon={<HangarGlyph />}
          hubLabel="Log"
          hubTestId="launchpad-mission-log-btn"
          onPrev={onBack}
          onNext={() => (missionRuns.length > 0 ? setMissionRunsOpen(true) : onViewContracts())}
          onBuild={onOpenHangar}
          onHub={() => onViewMissionLog?.()}
        />
      </div>
    </div>
  )
}
