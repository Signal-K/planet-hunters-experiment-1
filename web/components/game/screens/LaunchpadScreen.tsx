'use client'

import React, { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { ACADEMY_INTRO_MISSION_ID, partitionByOwner } from '@/lib/data'
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
import AvailableActionsPanel, { type AvailableAction } from '@/components/game/AvailableActionsPanel'
import { unplacedUnlockedStructures } from '@/lib/available-actions'

interface LaunchpadScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  onViewContracts: () => void
  onLaunchpadAction: () => void
  onOpenHangar: () => void
  onOpenSubsurface?: () => void
  onOpenBuild: () => void
  onOpenAcademy: () => void
  onOpenSkills: () => void
  missionsDone: number
  freeOperations: boolean
  catalog: Catalog
  player: Player
  rocketImageSrc?: string
  selectedRocketName?: string
  francs?: number
}

const LAUNCHPAD_GUIDE_KEY = 'landnam-launchpad-guide-v1'

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
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.1 2.2c-.9.4-.9 1.1-.9 1.8M12 17h.01" /></svg>
}

function SubsurfaceGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M6 11h12M8 15h8M10 19h4" /><path d="M12 3v16" /></svg>
}

export default function LaunchpadScreen({
  onBack, onPick, onViewContracts, onLaunchpadAction, onOpenHangar, onOpenSubsurface, onOpenBuild, onOpenAcademy, onOpenSkills, missionsDone, freeOperations, catalog, player, rocketImageSrc = '/game/assets/ships/ship_sr1.png', selectedRocketName, francs,
}: LaunchpadScreenProps) {
  // This is the in-world close composition. The routed Launchpad overview
  // owns control/UI entry; the Hub reaches this view through focusLaunchpad.
  const [guideStep, setGuideStep] = useState<number | null>(null)
  const { phase: skyPhase } = useTimeOfDay()
  const fleet = ROCKET_MODELS.map(model => ({ model, unlocked: missionsDone >= model.missionsRequired && !model.locked }))
  const unlockedFleet = fleet.filter(item => item.unlocked)
  const launchedSatellites = player.transitSatelliteLaunchedAt ? SATELLITE_MODELS.length : 0
  const { own } = partitionByOwner(catalog.missions, mission => mission)
  const sequence = missionsDone + 1
  const operations = own.filter(mission => freeOperations || mission.sequence === sequence)
  // Academy/crew progression remains deferred until it has a replacement for
  // the retired affinity ladder, so it cannot become the next required launch.
  const nextOperation = operations.find(mission => mission.id !== ACADEMY_INTRO_MISSION_ID)
  const ownMiningOperation = freeOperations
    ? own.find(mission => mission.tag === 'FREE OPS' && !mission.client && !mission.payload && !mission.construction)
    : undefined
  // Launchable instruments are the first-class infrastructure path. Only
  // fall back to a construction mission when no telescope/remote-instrument
  // operation is currently offered, so the CTA never makes a newly available
  // telescope look like a generic Earth Base build job.
  const infrastructureOperation = freeOperations
    ? own.find(mission => mission.payload?.type === 'satellite'
      || mission.payload?.type === 'deep-space-survey'
      || mission.payload?.type === 'scan-station-commission')
      ?? own.find(mission => mission.construction?.structureKind
        ? !player.placed.includes(mission.construction.structureKind)
        : false)
      : undefined
  const availableStructures = unplacedUnlockedStructures(player)
  const availableActions: AvailableAction[] = []
  if (freeOperations && ownMiningOperation) {
    availableActions.push({
      id: 'create-mission', kind: 'mission', eyebrow: 'OWN PROGRAM', title: 'Create a mining mission',
      detail: 'Choose a target and run the haul yourself.', cta: 'Create mission', onClick: () => onPick(ownMiningOperation.id),
      primary: true, testId: 'launchpad-create-mission-panel-btn',
    })
  }
  if (freeOperations && infrastructureOperation) {
    availableActions.push({
      id: 'launch-infrastructure', kind: 'infrastructure', eyebrow: 'PERSONAL INFRASTRUCTURE', title: 'Launch your next instrument',
      detail: 'Put a satellite or remote facility into service.', cta: 'Launch', onClick: () => onPick(infrastructureOperation.id),
      primary: true, testId: 'launchpad-launch-infrastructure-panel-btn',
    })
  }
  const nextStructure = availableStructures[0]
  if (nextStructure) {
    availableActions.push({
      id: `build-${nextStructure.id}`, kind: 'structure', eyebrow: 'NEW STRUCTURE', title: `Build ${nextStructure.name}`,
      detail: 'A new structure is unlocked; review its cost and choose a plot.', cta: 'Open build', onClick: onOpenBuild,
      testId: 'launchpad-build-structure-panel-btn',
    })
  }
  const guideSteps = [
    {
      label: '01 · LAUNCHPAD',
      title: 'Launch from here',
      body: 'Assigned vehicles move from the hangar to this pad before flight.',
      target: 'tower' as const,
    },
    {
      label: '02 · ROCKET FLEET',
      title: 'Prepare your vehicles',
      body: 'Open the hangar to inspect unlocked rockets and fit upgrades.',
      target: 'rocket' as const,
    },
  ] as const
  const guide = guideStep === null ? null : guideSteps[guideStep]

  useEffect(() => {
    if (freeOperations && !window.localStorage.getItem(LAUNCHPAD_GUIDE_KEY)) setGuideStep(0)
  }, [freeOperations])

  const closeGuide = () => {
    window.localStorage.setItem(LAUNCHPAD_GUIDE_KEY, 'complete')
    setGuideStep(null)
  }

  const isGuided = (target: (typeof guideSteps)[number]['target']) => guide?.target === target
  const startPadAction = () => {
    if (player.activeMission || player.pendingLaunch || !freeOperations || !nextOperation) {
      onLaunchpadAction()
      return
    }
    onPick(nextOperation.id)
  }
  const padActionLabel = player.activeMission
    ? 'Resume active mission'
    : player.pendingLaunch
      ? 'Inspect pending launch'
      : freeOperations && nextOperation
        ? 'Start own program operation'
        : 'Start a new mission'

  return (
    <div className="game-screen theme-blueprint ln-scene-launchpad" data-testid="launchpad-focus-screen">
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
        <button type="button" className={`launchpad-scene-object launchpad-tower ${isGuided('tower') ? 'is-guided' : ''}`} data-testid="launchpad-status-card" onClick={startPadAction} aria-label={padActionLabel}>
          <span className="launchpad-tower-art" data-launch-state={player.pendingLaunch ? 'hot' : 'idle'}>
            <LaunchpadModules />
            {player.pendingLaunch && <img className="launchpad-tower-rocket" src={rocketImageSrc} alt="Rocket on launchpad" />}
          </span>
          <span className="launchpad-object-label launchpad-object-label--center">
            <small>LAUNCHPAD</small>
            <strong>{player.activeMission ? 'RESUME MISSION' : player.pendingLaunch ? 'INSPECT LAUNCH' : freeOperations && nextOperation ? 'START OWN OP' : 'START MISSION'}</strong>
          </span>
        </button>

        <button type="button" className={`launchpad-scene-object launchpad-rocket ${isGuided('rocket') ? 'is-guided' : ''}`} data-testid="launchpad-rocket-fleet" onClick={onOpenHangar}>
          <HangarModules className="launchpad-hangar-art" />
          <span className="launchpad-rocket-art">
            <img src={rocketImageSrc} alt="" />
            <i className="launchpad-rocket-glow" />
          </span>
          <span className="launchpad-object-label">
            <small>ROCKET FLEET · {unlockedFleet.length}</small>
            <strong>{player.pendingLaunch ? `${selectedRocketName ?? unlockedFleet[0]?.model.name ?? 'BUILT VEHICLE'} · INSPECT` : `${selectedRocketName ?? unlockedFleet[0]?.model.name ?? 'NO VEHICLE'} · HANGAR`}</strong>
          </span>
        </button>

        {availableActions.length > 0 && (
          <div className="launchpad-available-actions">
            <AvailableActionsPanel actions={availableActions} />
          </div>
        )}

        <SoilCrossSection />

        {guide && guideStep !== null && (
          <aside className="launchpad-guide" data-testid="launchpad-guide" aria-live="polite" aria-labelledby="launchpad-guide-title">
            <button className="launchpad-guide-close" data-testid="launchpad-guide-close" onClick={closeGuide} aria-label="Close Launchpad guide">×</button>
            <span className="launchpad-guide-kicker">{guide.label}</span>
            <h2 id="launchpad-guide-title">{guide.title}</h2>
            <span className="launchpad-guide-copy">{guide.body}</span>
            <div className="launchpad-guide-footer">
              <div className="launchpad-guide-progress" aria-label={`Guide step ${guideStep + 1} of ${guideSteps.length}`}>
                {guideSteps.map((step, index) => <i key={step.target} className={index === guideStep ? 'is-current' : ''} />)}
              </div>
              <div className="launchpad-guide-actions">
                {guideStep > 0 && <button data-testid="launchpad-guide-back" onClick={() => setGuideStep(guideStep - 1)}>BACK</button>}
                <button className="is-primary" data-testid="launchpad-guide-next" onClick={() => guideStep === guideSteps.length - 1 ? closeGuide() : setGuideStep(guideStep + 1)}>
                  {guideStep === guideSteps.length - 1 ? 'DONE' : 'NEXT'}
                </button>
              </div>
            </div>
          </aside>
        )}

        <div className="launchpad-ground-line" />
      </main>

      <footer className="launchpad-scene-rail" data-ui-zone={UI_ZONES.bottomActions}>
        <div className="launchpad-rail-status">
          <span><i /> PAD {player.activeMission ? 'ACTIVE' : 'READY'}</span>
          <span>{unlockedFleet.length} ROCKETS</span>
          <span>{launchedSatellites}/{SATELLITE_MODELS.length} SAT</span>
        </div>
        <div className="launchpad-rail-actions">
          {freeOperations && <button data-testid="launchpad-guide-open" onClick={() => setGuideStep(0)}><GuideGlyph /> GUIDE</button>}
          {onOpenSubsurface && <button data-testid="launchpad-open-subsurface-btn" onClick={onOpenSubsurface}><SubsurfaceGlyph /> SUBSURFACE</button>}
          <button data-testid="launchpad-open-hangar-btn" onClick={onOpenHangar}><HangarGlyph /> HANGAR</button>
          {freeOperations && nextOperation && <button data-testid="launchpad-program-operation-btn" onClick={() => onPick(nextOperation.id)}><MissionGlyph /> OPS {operations.length}</button>}
          {freeOperations && ownMiningOperation && (
            <button
              className="is-primary"
              data-testid="launchpad-create-mission-btn"
              data-action="create-mission"
              onClick={() => onPick(ownMiningOperation.id)}
            >
              <MissionGlyph /> CREATE MISSION
            </button>
          )}
          {freeOperations && infrastructureOperation && (
            <button
              data-testid="launchpad-launch-infrastructure-btn"
              data-action="launch-infrastructure"
              onClick={() => onPick(infrastructureOperation.id)}
            >
              <InfrastructureGlyph /> LAUNCH INFRASTRUCTURE
            </button>
          )}
          <button className={freeOperations ? undefined : 'is-primary'} data-testid="launchpad-view-contracts-btn" onClick={onViewContracts}><MissionGlyph /> CONTRACTS</button>
        </div>
      </footer>
    </div>
  )
}
