'use client'

import React, { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { partitionByOwner } from '@/lib/data'
import { ROCKET_MODELS } from '@/lib/data/rockets'
import { SATELLITE_MODELS } from '@/lib/data/satellites'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { SoilCrossSection } from '@/components/game/hub/SoilCrossSection'
import { RoadRover } from '@/components/game/hub/RoadRover'
import { EARTH_BASE_PAD } from '@/lib/scene/compositions'

interface LaunchpadScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  onViewContracts: () => void
  onLaunchpadAction: () => void
  onOpenHangar: () => void
  onResumeMission?: () => void
  onViewMissionLog?: () => void
  missionsDone: number
  freeOperations: boolean
  catalog: Catalog
  player: Player
  rocketImageSrc?: string
  selectedRocketName?: string
  francs?: number
  missionMenuOpen?: boolean
  onMissionMenuOpenChange?: (open: boolean) => void
}

function HangarGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V8l3-4h10l3 4v13M4 9h16M8 21v-7h8v7" /></svg>
}

function MissionGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
}

function InfrastructureGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18h14M7 18V9l5-4 5 4v9M9 18v-5h6v5" /><path d="M12 5V2M9 3h6" /></svg>
}

function GuideGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 10v6M12 7h.01" /></svg>
}

function SatelliteGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M9 5l10 10M5 9l10 10" /><path d="M4 4l5 1-4 4-1-5ZM20 20l-5-1 4-4 1 5Z" /><path d="M12 12h.01" /></svg>
}

function MiningGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18h14M7 18l2-7h6l2 7M10 11V7h4v4M8 7h8M12 4v3" /></svg>
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
    copy: 'The lower rail holds secondary program actions. A mission in progress is resumed explicitly here; it never changes scene just because the pad was clicked.',
  },
] as const

export default function LaunchpadScreen({
  onBack, onPick, onViewContracts, onLaunchpadAction, onOpenHangar, onResumeMission, onViewMissionLog, missionsDone, freeOperations, catalog, player, rocketImageSrc = '/game/assets/ships/ship_sr1.png', selectedRocketName, francs, missionMenuOpen: requestedMissionMenuOpen = false, onMissionMenuOpenChange,
}: LaunchpadScreenProps) {
  // This is the Launchpad route: a playable Earth Base composition. The
  // tower and hangar are the primary interactions; the rail only exposes
  // secondary tools without replacing the scene with a card dashboard.
  const { phase: skyPhase } = useTimeOfDay()
  const [guideStep, setGuideStep] = useState<number | null>(null)
  const [missionMenuOpen, setMissionMenuOpen] = useState(requestedMissionMenuOpen)
  useEffect(() => {
    setMissionMenuOpen(requestedMissionMenuOpen)
  }, [requestedMissionMenuOpen])
  const setMissionMenu = (open: boolean) => {
    setMissionMenuOpen(open)
    onMissionMenuOpenChange?.(open)
  }
  const fleet = ROCKET_MODELS.map(model => ({ model, unlocked: missionsDone >= model.missionsRequired && !model.locked }))
  const unlockedFleet = fleet.filter(item => item.unlocked)
  const launchedSatellites = player.transitSatelliteLaunchedAt ? SATELLITE_MODELS.length : 0
  const { own } = partitionByOwner(catalog.missions, mission => mission)
  const sequence = missionsDone + 1
  const operations = own.filter(mission => freeOperations || mission.sequence === sequence)
  // Academy/crew progression remains deferred until it has a replacement for
  // the retired affinity ladder, so it cannot become the next required launch.
  const ownMiningOperation = operations.find(mission => mission.tag === 'FREE OPS' && !mission.client && !mission.payload && !mission.construction)
  // Launchable instruments are the first-class infrastructure path. Only
  // fall back to a construction mission when no telescope/remote-instrument
  // operation is currently offered, so the CTA never makes a newly available
  // telescope look like a generic Earth Base build job.
  const infrastructureOperation = operations.find(mission => mission.payload?.type === 'satellite'
      || mission.payload?.type === 'deep-space-survey'
      || mission.payload?.type === 'scan-station-commission')
  const buildOperation = operations.find(mission => mission.construction)
  // The physical pad is an entry point to mission selection, not an implicit
  // choice of the first operation in a computed list. Selecting a mission is
  // a separate, visible decision; otherwise the pad jumps straight to target
  // selection and skips the board reported in the Craft bug log.
  const openMissionMenu = () => {
    if (player.pendingLaunch) {
      onLaunchpadAction()
      return
    }
    if (!player.activeMission) setMissionMenu(true)
  }
  const padActionLabel = player.activeMission
    ? 'Launchpad active; use the Resume Mission footer action'
    : player.pendingLaunch
      ? 'Inspect pending launch'
      : 'Start a new mission'

  return (
    <div className="game-screen theme-deep ln-scene-launchpad" data-testid="launchpad-focus-screen">
      {/* Scene chrome stays crisp over the terrain; the previous `glass` prop
          created the large frosted rectangle visible across the upper UI. */}
      <TopBar eyebrow="BASE · LAUNCHPAD" title="Your Program" onBack={onBack} francs={francs} />

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
        <button type="button" className="launchpad-scene-object launchpad-tower" data-testid="launchpad-status-card" onClick={openMissionMenu} disabled={!!player.activeMission} aria-label={padActionLabel}>
          <span className="launchpad-tower-art" data-launch-state={player.pendingLaunch ? 'hot' : 'idle'}>
            <LaunchpadModules />
            {player.pendingLaunch && <img className="launchpad-tower-rocket" src={rocketImageSrc} alt="Rocket on launchpad" />}
          </span>
          <span className="launchpad-object-label launchpad-object-label--center">
            <small>LAUNCHPAD</small>
            <strong>{player.activeMission ? 'MISSION ACTIVE' : player.pendingLaunch ? 'INSPECT LAUNCH' : 'START MISSION'}</strong>
          </span>
        </button>

        {missionMenuOpen && !player.activeMission && !player.pendingLaunch && (
          <section className="launchpad-mission-menu" data-testid="launchpad-new-mission-menu" aria-labelledby="launchpad-new-mission-title">
            <div className="launchpad-mission-menu-header">
              <div>
                <span className="launchpad-guide-kicker">LAUNCHPAD / MISSION CONTROL</span>
                <h2 id="launchpad-new-mission-title">New mission</h2>
                <p>Choose the operation to prepare. Every route begins from this launchpad.</p>
              </div>
              <button type="button" className="launchpad-mission-menu-close" data-testid="launchpad-new-mission-close" onClick={() => setMissionMenu(false)}>CLOSE</button>
            </div>
            <div className="launchpad-mission-menu-options">
              <button
                type="button"
                className="launchpad-mission-choice"
                data-testid="launchpad-new-mission-satellite-btn"
                disabled={!infrastructureOperation}
                onClick={() => infrastructureOperation && onPick(infrastructureOperation.id)}
              >
                <SatelliteGlyph />
                <strong>LAUNCH SATELLITE / TOOL</strong>
                <span>{infrastructureOperation?.title ?? 'No owned instrument launch is queued yet.'}</span>
              </button>
              <button
                type="button"
                className="launchpad-mission-choice"
                data-testid="launchpad-new-mission-mining-btn"
                disabled={!ownMiningOperation}
                onClick={() => ownMiningOperation && onPick(ownMiningOperation.id)}
              >
                <MiningGlyph />
                <strong>GO MINING</strong>
                <span>{ownMiningOperation?.title ?? 'Self-directed mining unlocks with Free Operations.'}</span>
              </button>
              <button
                type="button"
                className="launchpad-mission-choice"
                data-testid="launchpad-new-mission-build-btn"
                disabled={!buildOperation}
                onClick={() => buildOperation && onPick(buildOperation.id)}
              >
                <InfrastructureGlyph />
                <strong>BUILD SOMETHING YOURSELF</strong>
                <span>{buildOperation?.title ?? 'No player construction mission is ready for dispatch.'}</span>
              </button>
              <button
                type="button"
                className="launchpad-mission-choice"
                data-testid="launchpad-new-mission-contracts-btn"
                onClick={onViewContracts}
              >
                <MissionGlyph />
                <strong>AVAILABLE CONTRACTS</strong>
                <span>Review client missions and choose an available contract.</span>
              </button>
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
              <img src={rocketImageSrc} alt="" />
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
          {onResumeMission && <button className="is-primary" data-testid="launchpad-resume-mission-btn" aria-label="Jump back to active mission" onClick={onResumeMission}><MissionGlyph /> RESUME MISSION</button>}
          {freeOperations && <button data-testid="launchpad-guide-open" onClick={() => setGuideStep(0)}><GuideGlyph /> GUIDE</button>}
          <button data-testid="launchpad-open-hangar-btn" onClick={onOpenHangar}><HangarGlyph /> HANGAR</button>
          {onViewMissionLog && <button data-testid="launchpad-mission-log-btn" onClick={onViewMissionLog}><MissionGlyph /> MISSION LOG</button>}
          {!player.activeMission && <button className="is-primary" data-testid="launchpad-new-mission-btn" data-action="new-mission" onClick={openMissionMenu}><MissionGlyph /> NEW MISSION</button>}
        </div>
      </footer>
    </div>
  )
}
