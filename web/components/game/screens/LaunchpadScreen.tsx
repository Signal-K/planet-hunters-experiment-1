'use client'

import React, { useState } from 'react'
import { BaseDock } from '@/components/game/hub/BaseDock'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { formatCurrency } from '@/lib/format'
import { openSettings } from '@/lib/mining/openChrome'
import flight from './FlightScene.module.css'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import { kitRocketSrc } from '@/lib/kit-rocket'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { SoilCrossSection } from '@/components/game/hub/SoilCrossSection'
import { RoadRover } from '@/components/game/hub/RoadRover'
import { EARTH_BASE_PAD } from '@/lib/scene/compositions'
import { isSettledMissionRun } from '@/lib/systems/MissionRunLifecycle'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'

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
}

function HangarGlyph() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 21V8l3-4h10l3 4v13M4 9h16M8 21v-7h8v7" /></svg>
}

function MissionGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
}

export default function LaunchpadScreen({
  onBack, onViewContracts, onLaunchpadAction, onOpenHangar, onResumeMission, missionRuns = [], onResumeMissionRun, onViewMissionLog, freeOperations, player, francs = 0, hydrated = false, onAbandonMission,
}: LaunchpadScreenProps) {
  // This is the Launchpad route: a playable Earth Base composition. The
  // tower and hangar are the primary interactions; the rail only exposes
  // secondary tools without replacing the scene with a card dashboard.
  const { phase: skyPhase } = useTimeOfDay()
  const [missionRunsOpen, setMissionRunsOpen] = useState(false)
  const [activeMissionCalloutDismissed, setActiveMissionCalloutDismissed] = useState(false)
  const [confirmingScrub, setConfirmingScrub] = useState(false)
  // `freeOperations` is derived during state hydration (SSL-332: guided
  // missions plus a storage silo, or a legacy save past the old onboarding).
  const hasFreeOpsAccess = freeOperations
  // The pad opens the Mission Board. Own-program flights, builds and client
  // contracts are chosen there, not from a menu painted over this scene.
  const openMissionBoard = () => {
    if (player.pendingLaunch) {
      onLaunchpadAction()
      return
    }
    onViewContracts()
  }
  // An in-progress operation never turns the launchpad into a dead object.
  // Players may create another mission from the physical pad; resuming a
  // current run remains an explicit secondary command in the rail.
  const padActionLabel = player.pendingLaunch
      ? 'Inspect pending launch'
      : hasFreeOpsAccess
      ? 'Create a new mission'
      : 'View your assigned mission'

  return (
    <div
      className="game-screen theme-blueprint ln-scene-launchpad"
      data-testid="launchpad-focus-screen"
      data-game-hydrated={hydrated ? 'true' : 'false'}
    >
      <div className={`${flight.chrome} launchpad-shared-hud`}>
        <div className={flight.top}>
          <div className={flight.cluster}>
            <button type="button" className={flight.cog} data-testid="settings-button" aria-label="Settings" onClick={openSettings}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06-.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
            <div className={flight.clock}><HubClockWidget /></div>
          </div>
          <div className={flight.cluster}>
            <span className="scene-chip" data-testid="launchpad-francs-chip">{formatCurrency(francs, { compact: true })}</span>
            <span className="scene-chip" data-testid="launchpad-cargo-chip" aria-label="Cargo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      <main data-ui-zone={UI_ZONES.screenContent} className="launchpad-visual-scene earth-base-campus-transition">
        {/* Same Earth Base backdrop the Hub screen uses (KES-233) — this
            screen previously hand-rolled its own separate navy/stars/green-
            mountain gradient (`.launchpad-visual-scene`'s own background +
            ::before/::after in launchpad-screen.css), which read as a
            completely different place once KES-226/228 reworked the Hub's
            own background repeatedly this sprint and this screen was never
            updated to match. `.launchpad-scene-zoom` scopes the shared
            background to the close composition — ground line stays pinned to
            this screen's own `--hub-ground` (see launchpad-screen.css), while
            the near-field terrain and modular structures change what is in
            frame instead of pretending a single backdrop was stretched. */}
        {/* Its own composition, not the Hub's (KES-260). The zoom used to
            render the identical `HubWorldBackground` with `transform: none`,
            so walking up to the pad left the horizon untouched — reported as
            "the background remains the same. So obviously this is bad."
            `earth-base-pad` drops the distant facility band entirely, keeps
            only the summits that would still clear the frame at this range,
            and adds near-field detail (fence line, boulders, scree) that
            would be sub-pixel in the wide shot. */}
        <div className="launchpad-scene-zoom">
          <HubWorldBackground phase={skyPhase} composition="earth-base-pad" />
          <RoadRover road={EARTH_BASE_PAD.roadPaths?.[0]} />
        </div>
        {/* KES-59: the tutorial's "Tap View All Contracts" step (tutorial.ts
            id:1, screen:'launchpad') points its coach ring at coachId
            'launchpad-view-contracts', but no element carried that id after
            STS-625's later simplification made a single tap on the pad go
            straight to the Mission Board (see openMissionBoard above) —
            there is no separate "View All Contracts" button to ring at that
            stage, only this pad. The ring silently never appeared. */}
        <button type="button" className="launchpad-scene-object launchpad-tower" data-testid="launchpad-status-card" data-beacon="launchpad-view-contracts" data-action="primary-mission" onClick={openMissionBoard} aria-label={padActionLabel}>
          <span className="launchpad-tower-art" data-launch-state={player.pendingLaunch ? 'hot' : 'idle'} data-testid="launchpad-new-mission-btn">
            <LaunchpadModules parts={player.shipCustomizerParts} />
          </span>
        </button>

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

        <button type="button" className="launchpad-scene-object launchpad-rocket" data-testid="launchpad-rocket-fleet" onClick={onOpenHangar}>
          <HangarModules className="launchpad-hangar-art" />
          {/* 2026-09-03 (Liam feedback): this used to render `rocketImageSrc`
              unconditionally, which defaults to Explorer's ship_sr1.png the
              moment `game.rocket` is unset (see `rocketDisplayForConfig` ->
              `rocketModelForConfig`'s `?? ROCKET_MODELS[0]` fallback) — so a
              player with nothing built yet still saw a fixed "shitty" rocket
              glued to the hangar with no way to hide it and no relationship
              to their actual fleet. A rocket image here should mean the same
              thing it means on the tower above: there is an actual staged
              vehicle. Gate it on `player.pendingLaunch`, exactly like
              `launchpad-tower-rocket`, so an empty fleet shows the (now
              rebuilt) hangar structure alone. */}
          {player.pendingLaunch && (
            <span className="launchpad-rocket-art">
              <img src={kitRocketSrc(player.shipCustomizerParts)} alt="" />
              <i className="launchpad-rocket-glow" />
            </span>
          )}
        </button>

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

        <SoilCrossSection />

        <div className="launchpad-ground-line" />
      </main>

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
