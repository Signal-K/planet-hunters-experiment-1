'use client'

import React, { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { partitionByOwner, RESOURCE_FOCUS_MISSION_ID, SELF_DIRECTED_MINING_MISSION_ID } from '@/lib/data'
import type { Mission } from '@/lib/data'
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
import { earthStorageBuilt, sellUnitPrice } from '@/lib/systems/EconomySystem'
import { ownProgramStructureDelivered } from '@/lib/systems/ConstructionSystem'
import { REFINERY_BUILD_MISSION_ID } from '@/lib/data/missions'

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

function OperationBrief({ kind, instrument, mining, builds, player, catalog, onPick, onBack, onOpenSiloBuild }: { kind: 'instrument' | 'mining' | 'build'; instrument?: Mission; mining?: Mission; builds: Mission[]; player: Player; catalog: Catalog; onPick: (id: string, freeHaulDisposition?: 'store' | 'sell') => void; onBack: () => void; onOpenSiloBuild?: () => void }) {
  const hasStorage = earthStorageBuilt(player)
  const market = Object.entries(catalog.minerals).sort(([, a], [, b]) => b.price - a.price).slice(0, 4)
  return <div className="launchpad-operation-brief" data-testid={`launchpad-operation-brief-${kind}`}>
    <button type="button" className="launchpad-mission-menu-close" onClick={onBack}>BACK</button>
    {kind === 'instrument' && <><span className="launchpad-guide-kicker">OWN INFRASTRUCTURE / INSTRUMENT</span><h2>Launch an instrument</h2><p>An owned telescope stays in orbit after launch. It unlocks an instrument feed at Base; it is not a client contract and it does not consume a mining slot.</p>{instrument ? <button type="button" className="launchpad-mission-choice" data-testid="launchpad-prepare-instrument-btn" onClick={() => onPick(instrument.id)}><SatelliteGlyph /><strong>{instrument.title}</strong><span>{instrument.programReward?.outcome ?? instrument.brief}</span></button> : <p className="launchpad-operation-brief__muted">Your current instrument is online. Its orbital status indicator shows when a data review is ready; another instrument unlocks only when its stated prerequisite is met.</p>}</>}
    {kind === 'mining' && <><span className="launchpad-guide-kicker">FREE OPS / OWN HAUL</span><h2>Plan a mining run</h2><p>Choose the destination for the haul before selecting a target and rocket. This run belongs to your program: no client claim and no daily limit.</p><div className="launchpad-operation-brief__choices"><button type="button" className="launchpad-mission-choice" data-testid="launchpad-mining-sell-btn" disabled={!mining} onClick={() => mining && onPick(mining.id, 'sell')}><MiningGlyph /><strong>SELL ON EARTH RETURN</strong><span>Exchange the complete haul immediately at the shown market price.</span></button><button type="button" className="launchpad-mission-choice" data-testid="launchpad-mining-store-btn" disabled={!mining || !hasStorage} onClick={() => mining && hasStorage && onPick(mining.id, 'store')}><InfrastructureGlyph /><strong>STORE IN SILO</strong><span>{hasStorage ? 'Keep ore for construction, fabrication, or a better market window.' : 'Requires an Earth Mineral Vault or Surface Silo.'}</span></button></div>{!hasStorage && onOpenSiloBuild && <button type="button" className="launchpad-operation-brief__link" data-testid="launchpad-build-silo-link" onClick={onOpenSiloBuild}>BUILD A SILO AT BASE</button>}<div className="launchpad-operation-brief__market"><span className="launchpad-guide-kicker">COMMODITY EXCHANGE / MAJOR MINERALS</span><div className="launchpad-operation-brief__prices">{market.map(([id, mineral]) => { const quote = player.dailyEconomySnapshot?.prices[id]; const movement = quote ? Math.round((quote.multiplier - 1) * 100) : 0; return <div key={id}><small>{mineral.name}</small><strong>₣{sellUnitPrice(id, player).price}/U</strong><span data-direction={movement >= 0 ? 'up' : 'down'}>{movement >= 0 ? '+' : ''}{movement}% TODAY</span></div> })}</div></div></>}
    {kind === 'build' && <><span className="launchpad-guide-kicker">OWN INFRASTRUCTURE</span><h2>Build something yourself</h2><p>You get your own work area on any planet — no competing for a plot. Mars is ready now; Mercury and Venus are yours too, once the thermal and pressure kit they need is fitted. Asteroids work differently: you buy or lease rights there before building.</p><p className="launchpad-operation-brief__muted">A mining settlement is a standing claim, not a one-off haul — once it&apos;s up, every later run to that body skips re-scouting and feeds the same local silo and refinery instead of hauling raw ore all the way back to Earth each time.</p><div className="launchpad-operation-brief__builds">{builds.map(mission => <button type="button" key={mission.id} className="launchpad-mission-choice" data-testid={`launchpad-build-${mission.id}`} onClick={() => onPick(mission.id)}><InfrastructureGlyph /><strong>{mission.title}</strong><span>{mission.programReward?.outcome ?? mission.brief}</span></button>)}</div></>}
  </div>
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
  onBack, onPick, onViewContracts, onLaunchpadAction, onOpenHangar, onResumeMission, missionRuns = [], onResumeMissionRun, onViewMissionLog, missionsDone, freeOperations, catalog, player, rocketImageSrc = '/game/assets/ships/ship_sr1.png', selectedRocketName, francs, hydrated = false, missionMenuOpen: requestedMissionMenuOpen = false, onMissionMenuOpenChange, onOpenSiloBuild,
}: LaunchpadScreenProps) {
  // This is the Launchpad route: a playable Earth Base composition. The
  // tower and hangar are the primary interactions; the rail only exposes
  // secondary tools without replacing the scene with a card dashboard.
  const { phase: skyPhase } = useTimeOfDay()
  const [guideStep, setGuideStep] = useState<number | null>(null)
  const [missionRunsOpen, setMissionRunsOpen] = useState(false)
  const [activeMissionCalloutDismissed, setActiveMissionCalloutDismissed] = useState(false)
  const [missionMenuOpen, setMissionMenuOpen] = useState(requestedMissionMenuOpen)
  const [operationBrief, setOperationBrief] = useState<'instrument' | 'mining' | 'build' | null>(null)
  const [showAllOperations, setShowAllOperations] = useState(false)
  const externallyControlled = onMissionMenuOpenChange !== undefined
  // Keep a local open signal as well as the app-level signal. The physical pad
  // is the primary control; an auth/catalog refresh can briefly replay the
  // parent route state while that click is being handled, which used to make
  // the menu appear to ignore the interaction in the discovery flow.
  const visibleMissionMenuOpen = externallyControlled
    ? requestedMissionMenuOpen || missionMenuOpen
    : missionMenuOpen
  const setMissionMenu = (open: boolean) => {
    setMissionMenuOpen(open)
    onMissionMenuOpenChange?.(open)
  }
  const fleet = ROCKET_MODELS.map(model => ({ model, unlocked: missionsDone >= model.missionsRequired && !model.locked }))
  const unlockedFleet = fleet.filter(item => item.unlocked)
  const launchedSatellites = player.transitSatelliteLaunchedAt ? SATELLITE_MODELS.length : 0
  const { own } = partitionByOwner(catalog.missions, mission => mission)
  const sequence = missionsDone + 1
  // `freeOperations` is derived from missionsDone during state hydration. Use
  // the progression threshold here as well so a freshly hydrated fixture (or
  // a legacy save carrying the stale boolean) cannot disable the owned mining
  // control after the player has already completed the active onboarding.
  const hasFreeOpsAccess = freeOperations || missionsDone >= 3
  const focusSet = new Set(player.programFocuses ?? [])
  const hasProgramFocus = focusSet.size > 0
  const focusVisible = (focus: 'client-contracts' | 'mining' | 'instruments' | 'construction') =>
    showAllOperations || !hasProgramFocus || focusSet.has(focus)
  const operations = own.filter(mission => hasFreeOpsAccess || mission.sequence === sequence)
  // Academy/crew progression remains deferred until it has a replacement for
  // the retired affinity ladder, so it cannot become the next required launch.
  const ownMiningOperation = operations.find(mission => mission.tag === 'FREE OPS' && !mission.client && !mission.payload && !mission.construction)
    ?? (hasFreeOpsAccess ? {
      id: SELF_DIRECTED_MINING_MISSION_ID,
      title: 'Self-Directed Mining Run',
      brief: 'No client, no daily limit. Pick any reachable target, mine what looks valuable, and sell the haul yourself at market price.',
      tag: 'FREE OPS',
      difficulty: 'L2' as const,
      locked: false,
      sequence: sequence,
      unlockAt: 'Complete M3',
      requires: { minerals: { nickel: 2, cobalt: 2 }, cargo_min: 4, drill_tier: 2, max_orbit: 8 },
      payout: { francs: 0, affinity: 0 },
    } satisfies Mission : undefined)
  // Launchable instruments are the first-class infrastructure path. Only
  // fall back to a construction mission when no telescope/remote-instrument
  // operation is currently offered, so the CTA never makes a newly available
  // telescope look like a generic Earth Base build job.
  const infrastructureOperation = operations.find(mission => mission.payload?.type === 'satellite'
      || mission.payload?.type === 'deep-space-survey')
  // The refinery only makes sense once there's ore flowing into it: gate it
  // behind an already-delivered silo and mining settlement rather than
  // offering it as a same-tier choice from a bare Free Ops start (07/09/26
  // QA report).
  const hasRefineryPrereqs = ownProgramStructureDelivered(player, 'mining-settlement')
    && ownProgramStructureDelivered(player, 'mineral-silo')
  const buildOperations = operations.filter(mission => mission.construction
    && (mission.id !== REFINERY_BUILD_MISSION_ID || hasRefineryPrereqs))
  const buildOperation = buildOperations[0]
  const resourceFocusOperation = operations.find(mission => mission.id === RESOURCE_FOCUS_MISSION_ID)
  // The physical pad is an entry point to mission selection, not an implicit
  // choice of the first operation in a computed list. Selecting a mission is
  // a separate, visible decision; otherwise the pad jumps straight to target
  // selection and skips the board reported in the Craft bug log.
  //
  // That reasoning only holds once a player actually has multiple live
  // routes to weigh (own-program flights, builds, satellites) — which is
  // exactly what Free Ops unlocks. Before that (still in guided onboarding,
  // `!hasFreeOpsAccess`), three of this menu's four tiles are always
  // disabled placeholders ("no owned instrument launch queued", "unlocks
  // with Free Operations", "no player construction ready") and the one live
  // tile is always Available Contracts — because during onboarding every
  // operation is sequence-gated onto the Mission Board (see
  // `isMissionBoardMission`). Showing that mostly-dead grid to a brand-new
  // player, with no coach pointer wired to any tile in it, was reported as
  // "users are not told what to do." Skip straight to the one thing that's
  // actually there: their assigned starter mission(s) on the Mission Board.
  const openMissionMenu = () => {
    if (player.pendingLaunch) {
      onLaunchpadAction()
      return
    }
    if (!hasFreeOpsAccess) {
      onViewContracts()
      return
    }
    setOperationBrief(null)
    setMissionMenu(true)
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
      className="game-screen theme-deep ln-scene-launchpad"
      data-testid="launchpad-focus-screen"
      data-game-hydrated={hydrated ? 'true' : 'false'}
    >
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
        <button type="button" className="launchpad-scene-object launchpad-tower" data-testid="launchpad-status-card" data-action="primary-mission" onClick={openMissionMenu} aria-label={padActionLabel}>
          <span className="launchpad-tower-art" data-launch-state={player.pendingLaunch ? 'hot' : 'idle'}>
            <LaunchpadModules />
            {player.pendingLaunch && <img className="launchpad-tower-rocket" src={rocketImageSrc} alt="Rocket on launchpad" />}
          </span>
          <span className="launchpad-primary-pad-control" data-testid="launchpad-primary-mission-btn">
            <small>LAUNCHPAD CONTROL</small>
            <strong>{padActionTitle}</strong>
          </span>
        </button>

        {player.activeMission && onResumeMission && !activeMissionCalloutDismissed && !visibleMissionMenuOpen && !missionRunsOpen && (
          <section className="launchpad-active-mission" data-testid="launchpad-active-mission-callout" aria-label="Mission in progress">
            <div>
              <span className="launchpad-guide-kicker">MISSION IN PROGRESS</span>
              <h2>{player.activeMission.label}</h2>
              <p>{(player.missionPhase ?? 'transit').toUpperCase()} · VEHICLE ACTIVE</p>
            </div>
            <div className="launchpad-active-mission__actions">
              <button type="button" className="launchpad-active-mission__dismiss" onClick={() => setActiveMissionCalloutDismissed(true)}>DISMISS</button>
              <button type="button" className="launchpad-active-mission__resume" onClick={onResumeMission}><MissionGlyph /> RESUME MISSION</button>
            </div>
          </section>
        )}

        {visibleMissionMenuOpen && !player.pendingLaunch && (
          <section className="launchpad-mission-menu" data-testid="launchpad-new-mission-menu" aria-labelledby="launchpad-new-mission-title">
            <div className="launchpad-mission-menu-header">
              <div>
                <span className="launchpad-guide-kicker">LAUNCHPAD / MISSION CONTROL</span>
                <h2 id="launchpad-new-mission-title">New mission</h2>
                <p>Choose the operation to prepare. Every route begins from this launchpad.</p>
              </div>
              <button type="button" className="launchpad-mission-menu-close" data-testid="launchpad-new-mission-close" onClick={() => setMissionMenu(false)}>CLOSE</button>
            </div>
            {!operationBrief ? <div className="launchpad-mission-menu-options">
              <button
                type="button"
                className="launchpad-mission-choice"
                data-testid="launchpad-new-mission-satellite-btn"
                hidden={!focusVisible('instruments')}
                disabled={!infrastructureOperation}
                onClick={() => setOperationBrief('instrument')}
              >
                <SatelliteGlyph />
                <strong>LAUNCH SATELLITE / TOOL</strong>
                <span>{infrastructureOperation ? 'Deploy an instrument that keeps working for your program.' : 'No owned instrument launch is queued yet.'}</span>
              </button>
              <button
                type="button"
                className="launchpad-mission-choice"
                data-testid="launchpad-new-mission-mining-btn"
                hidden={!focusVisible('mining')}
                disabled={!ownMiningOperation}
                onClick={() => setOperationBrief('mining')}
              >
                <MiningGlyph />
                <strong>GO MINING</strong>
                <span>{ownMiningOperation ? 'Set storage and inspect market conditions before dispatch.' : 'Self-directed mining unlocks with Free Operations.'}</span>
              </button>
              <button
                type="button"
                className="launchpad-mission-choice"
                data-testid="launchpad-new-mission-build-btn"
                hidden={!focusVisible('construction')}
                disabled={!buildOperation}
                onClick={() => setOperationBrief('build')}
              >
                <InfrastructureGlyph />
                <strong>BUILD SOMETHING YOURSELF</strong>
                <span>{buildOperation ? 'Choose a permanent program build and its assigned site.' : 'No player construction mission is ready for dispatch.'}</span>
              </button>
              <button
                type="button"
                className="launchpad-mission-choice"
                data-testid="launchpad-new-mission-contracts-btn"
                hidden={!focusVisible('client-contracts')}
                onClick={onViewContracts}
              >
                <MissionGlyph />
                <strong>AVAILABLE CONTRACTS</strong>
                <span>Review client missions and choose an available contract.</span>
              </button>
              {resourceFocusOperation && (
                <button
                  type="button"
                  className="launchpad-mission-choice launchpad-mission-choice--focus"
                  data-testid="launchpad-new-mission-resource-focus-btn"
                  onClick={() => onPick(resourceFocusOperation.id, 'store')}
                >
                  <MiningGlyph />
                  <strong>RESOURCE FOCUS</strong>
                  <span>{resourceFocusOperation.title}. Configuration is ready; choose a highlighted source and dispatch.</span>
                </button>
              )}
              {hasProgramFocus && (
                <button type="button" className="launchpad-show-all-operations" onClick={() => setShowAllOperations(value => !value)}>
                  {showAllOperations ? 'SHOW MY SUBSCRIPTIONS' : 'SHOW ALL OPERATIONS'}
                </button>
              )}
            </div> : <OperationBrief kind={operationBrief} instrument={infrastructureOperation} mining={ownMiningOperation} builds={buildOperations} player={player} catalog={catalog} onPick={onPick} onBack={() => setOperationBrief(null)} onOpenSiloBuild={onOpenSiloBuild} />}
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
                <button key={run.key} type="button" data-testid={`launchpad-resume-run-${run.key}`} onClick={() => onResumeMissionRun?.(run.key)}>
                  <MissionGlyph />
                  <span>{run.label}</span>
                  <strong>{run.phase.toUpperCase()}</strong>
                </button>
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
          {player.activeMission && onResumeMission && <button className="is-primary" data-testid="launchpad-resume-mission-btn" aria-label="Jump back to active mission" onClick={onResumeMission}><MissionGlyph /> RESUME MISSION</button>}
          {missionRuns.length > (player.activeMission ? 1 : 0) && <button data-testid="launchpad-mission-runs-btn" onClick={() => setMissionRunsOpen(true)}><MissionGlyph /> ACTIVE · {missionRuns.length}</button>}
          {freeOperations && <button data-testid="launchpad-guide-open" onClick={() => setGuideStep(0)}><GuideGlyph /> GUIDE</button>}
          <button data-testid="launchpad-open-hangar-btn" onClick={onOpenHangar}><HangarGlyph /> HANGAR</button>
          {onViewMissionLog && <button data-testid="launchpad-mission-log-btn" onClick={onViewMissionLog}><MissionGlyph /> MISSION LOG</button>}
          {!player.pendingLaunch && <button className="is-primary" data-testid="launchpad-new-mission-btn" data-action="new-mission" onClick={openMissionMenu}><MissionGlyph /> {hasFreeOpsAccess ? 'NEW MISSION' : 'YOUR MISSION'}</button>}
        </div>
      </footer>
    </div>
  )
}
