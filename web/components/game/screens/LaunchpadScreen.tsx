'use client'

import React, { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { useHelp } from '@/components/ui/useHelp'
import { ROCKET_MODELS } from '@/lib/data/rockets'
import { SATELLITE_MODELS } from '@/lib/data/satellites'
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
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V8l3-4h10l3 4v13M4 9h16M8 21v-7h8v7" /></svg>
}

function MissionGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
}

function GuideGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 10v6M12 7h.01" /></svg>
}

const guideSteps = [
  {
    kicker: '01 / LAUNCHPAD',
    title: 'Launch from here',
    copy: 'The launch tower is the starting point for a new operation. Choose a mission first, then select its target before you commit the launch.',
  },
  {
    kicker: '02 / ROCKET FLEET',
    title: 'Prepare your vehicles',
    copy: 'Open the hangar to inspect cleared rockets, review the vehicle for a pending launch, and manage the fleet assigned to your program.',
  },
  {
    kicker: '03 / COMMAND RAIL',
    title: 'Use the attached controls',
    copy: 'The lower rail holds secondary program actions. Resume an operation from here while the launchpad stays available to create another mission.',
  },
] as const

export default function LaunchpadScreen({
  onBack, onViewContracts, onLaunchpadAction, onOpenHangar, onResumeMission, missionRuns = [], onResumeMissionRun, onViewMissionLog, missionsDone, freeOperations, player, selectedRocketName, francs, hydrated = false, onAbandonMission,
}: LaunchpadScreenProps) {
  // This is the Launchpad route: a playable Earth Base composition. The
  // tower and hangar are the primary interactions; the rail only exposes
  // secondary tools without replacing the scene with a card dashboard.
  const { phase: skyPhase } = useTimeOfDay()
  const [guideStep, setGuideStep] = useState<number | null>(null)
  const [missionRunsOpen, setMissionRunsOpen] = useState(false)
  const [activeMissionCalloutDismissed, setActiveMissionCalloutDismissed] = useState(false)
  const [confirmingScrub, setConfirmingScrub] = useState(false)
  const help = useHelp('launchpad')
  const fleet = ROCKET_MODELS.map(model => ({ model, unlocked: missionsDone >= model.missionsRequired && !model.locked }))
  const unlockedFleet = fleet.filter(item => item.unlocked)
  const launchedSatellites = [
    player.transitSatelliteLaunchedAt,
    player.deepSpaceTelescopeLaunchedAt || player.deepSpaceTelescopeBuilt || player.placed.includes('deep-space-telescope'),
    player.saturnImagerLaunchedAt,
  ].filter(Boolean).length
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
  const padActionTitle = player.pendingLaunch
      ? 'INSPECT LAUNCH'
      : hasFreeOpsAccess
      ? 'NEW MISSION'
      : 'YOUR MISSION'

  return (
    <div
      className="game-screen theme-blueprint ln-scene-launchpad"
      data-testid="launchpad-focus-screen"
      data-game-hydrated={hydrated ? 'true' : 'false'}
    >
      {/* Scene chrome stays crisp over the terrain; the previous `glass` prop
          created the large frosted rectangle visible across the upper UI. */}
      <TopBar eyebrow="LAUNCHPAD" onBack={onBack} francs={francs} right={help.button} />
      {help.layer}

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
          <span className="launchpad-tower-art" data-launch-state={player.pendingLaunch ? 'hot' : 'idle'}>
            <LaunchpadModules parts={player.shipCustomizerParts} />
          </span>
          <span className="launchpad-primary-pad-control" data-testid="launchpad-primary-mission-btn">
            <small>LAUNCHPAD CONTROL</small>
            <strong>{padActionTitle}</strong>
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
              <button type="button" className="launchpad-active-mission__resume" onClick={onResumeMission}><MissionGlyph /> RESUME MISSION</button>
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
          <span className="launchpad-object-label">
            <small>ROCKET FLEET · {unlockedFleet.length}</small>
            <strong>{player.pendingLaunch ? `${selectedRocketName ?? unlockedFleet[0]?.model.name ?? 'BUILT VEHICLE'} · INSPECT` : unlockedFleet.length > 0 ? `${unlockedFleet.length} READY · HANGAR` : 'NO VEHICLE · HANGAR'}</strong>
          </span>
        </button>

        {guideStep !== null && (
          <aside className="launchpad-guide" data-testid="launchpad-guide" aria-live="polite" aria-label="Launchpad guide">
            <button type="button" className="launchpad-guide-close" data-testid="launchpad-guide-close" aria-label="Close launchpad guide" onClick={() => setGuideStep(null)}>×</button>
            <span className="launchpad-guide-kicker">{guideSteps[guideStep].kicker}</span>
            <h2>{guideSteps[guideStep].title}</h2>
            <p className="launchpad-guide-copy">{guideSteps[guideStep].copy}</p>
            <div className="launchpad-guide-footer">
              <span className="launchpad-guide-progress" aria-label={`Guide step ${guideStep + 1} of ${guideSteps.length}`}>
                {guideSteps.map((step, index) => <i key={step.kicker} data-active={index === guideStep} />)}
              </span>
              <div className="launchpad-guide-actions">
                {guideStep > 0 && <button type="button" data-testid="launchpad-guide-back" onClick={() => setGuideStep(guideStep - 1)}>BACK</button>}
                <button type="button" className="is-primary" data-testid="launchpad-guide-next" onClick={() => guideStep === guideSteps.length - 1 ? setGuideStep(null) : setGuideStep(guideStep + 1)}>
                  {guideStep === guideSteps.length - 1 ? 'DONE' : 'NEXT'}
                </button>
              </div>
            </div>
          </aside>
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

        <SoilCrossSection />

        <div className="launchpad-ground-line" />
      </main>

      <footer className="launchpad-scene-rail" data-ui-zone={UI_ZONES.bottomActions}>
        <div className="launchpad-rail-status">
          <span><i /> PAD {player.activeMission ? 'ACTIVE' : 'READY'}</span>
          <span>{unlockedFleet.length} ROCKETS</span>
          <span>{launchedSatellites}/{SATELLITE_MODELS.length} SAT</span>
        </div>
        <div className="launchpad-rail-actions">
          {player.activeMission && onResumeMission && <button className="is-primary" data-testid="launchpad-resume-mission-btn" aria-label="Jump back to active mission" onClick={onResumeMission}><MissionGlyph /> RESUME MISSION</button>}
          {missionRuns.length > (player.activeMission ? 1 : 0) && <button data-testid="launchpad-mission-runs-btn" onClick={() => setMissionRunsOpen(true)}><MissionGlyph /> ACTIVE · {missionRuns.length}</button>}
          {freeOperations && <button data-testid="launchpad-guide-open" onClick={() => setGuideStep(0)}><GuideGlyph /> GUIDE</button>}
          <button data-testid="launchpad-open-hangar-btn" onClick={onOpenHangar}><HangarGlyph /> HANGAR</button>
          {onViewMissionLog && <button data-testid="launchpad-mission-log-btn" onClick={onViewMissionLog}><MissionGlyph /> MISSION LOG</button>}
          {!player.pendingLaunch && <button className="is-primary" data-testid="launchpad-new-mission-btn" data-action="new-mission" onClick={openMissionBoard}><MissionGlyph /> {hasFreeOpsAccess ? 'NEW MISSION' : 'YOUR MISSION'}</button>}
        </div>
      </footer>
    </div>
  )
}
