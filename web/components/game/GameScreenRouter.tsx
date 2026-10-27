'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useGame } from '@/game-context'
import { canAffordStructure, ROCKET_MODELS, rocketDisplayForConfig, rocketModelForConfig, structureAffordabilityGaps, structureUnlocked, SUBSURFACE_EXCAVATE_COST } from '@/lib/data'
import { rocketCompatibleWithMission } from '@/lib/rockets'
import { freeOperationsUnlocked } from '@/lib/systems/AgencyOnboardingSystem'
import { currentTrainingTry } from '@/lib/systems/FlightPlanSystem'
import type { Screen } from '@/lib/game-types'
import { formatCurrency } from '@/lib/format'
import { ORIONIDS_DEBRIS_PRESET, isDebrisEventActive } from '@/lib/data/sky-events'
import { ORIONIDS_NIGHT_RUN_ID, ORIONIDS_SURFACE_RESEARCH_MISSION_ID } from '@/lib/data/missions'
// IntroScreen and HubScreen are the two most likely first paints (cold start
// and post-onboarding default), so they stay in the main bundle. Every other
// screen below is code-split with next/dynamic — the switch below only ever
// renders one of them at a time, so there's no reason to ship all ~20
// screens' JS on the very first load.
import IntroScreen from '@/components/game/screens/IntroScreen'
import PageSurface from '@/components/ui/PageSurface'
import { buyBlocker, exchangeBuilt } from '@/lib/systems/MarketplaceSystem'
import HubScreen, { type HubBuildOption } from '@/components/game/screens/HubScreen'

const ScreenLoading = () => (
  <div className="game-screen-loading" role="status" aria-label="Loading screen">
    <span>LOADING</span>
  </div>
)

const loadMissionSetupRoutes = () => import('@/components/game/MissionSetupRoutes')
const loadMarketScreen = () => import('@/components/game/screens/MarketScreen')
const loadLaunchpadScreen = () => import('@/components/game/screens/LaunchpadScreen')
const loadMissionHistoryScreen = () => import('@/components/game/screens/MissionHistoryScreen')

const MissionSetupRoutes = dynamic(loadMissionSetupRoutes, { loading: ScreenLoading })
const MissionOperationRoutes = dynamic(() => import('@/components/game/MissionOperationRoutes'), { loading: ScreenLoading })
const RefineryScreen = dynamic(() => import('@/components/game/screens/RefineryScreen'), { loading: ScreenLoading })
const MarketScreen = dynamic(loadMarketScreen, { loading: ScreenLoading })
const HangarScreen = dynamic(() => import('@/components/game/screens/HangarScreen'), { loading: ScreenLoading })
const LaunchpadScreen = dynamic(loadLaunchpadScreen, { loading: ScreenLoading })
const InstrumentHubScreen = dynamic(() => import('@/components/game/screens/InstrumentHubScreen'), { loading: ScreenLoading })
const TessDiscoveryScreen = dynamic(() => import('@/components/game/screens/TessDiscoveryScreen'), { loading: ScreenLoading })
const SaturnStormSearchScreen = dynamic(() => import('@/components/game/screens/SaturnStormSearchScreen'), { loading: ScreenLoading })
const AsteroidDiscoveryScreen = dynamic(() => import('@/components/game/screens/AsteroidDiscoveryScreen'), { loading: ScreenLoading })
const MissionHistoryScreen = dynamic(loadMissionHistoryScreen, { loading: ScreenLoading })
const CommunityResearchScreen = dynamic(() => import('@/components/game/screens/CommunityResearchScreen'), { loading: ScreenLoading })
const NarrativeLedgerScreen = dynamic(() => import('@/components/game/screens/NarrativeLedgerScreen'), { loading: ScreenLoading })
import { enqueueSurvey } from '@/lib/surveys'
import { requestMissionBoardEvent, requestMissionBoardTab } from '@/lib/mission-board-nav'
import { TRAINING_TESS_CANDIDATE, VISUAL_ASTEROID_CANDIDATE, VISUAL_TESS_CANDIDATE } from '@/lib/visual-fixtures'
import { captureFreeOpsUnlocked, captureGameEvent } from '@/lib/posthog'
import { dismissHubPrompt } from '@/lib/hub-prompts'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import {
  DEEP_SPACE_TELESCOPE_INSTRUMENT_ID,
  SATURN_IMAGER_INSTRUMENT_ID,
  TRANSIT_TELESCOPE_INSTRUMENT_ID,
  instrumentDigestDateKey,
  markInstrumentDigestNotified,
} from '@/lib/systems/InstrumentFeedSystem'
import { missionResumeScreen } from '@/lib/mission-resume'
import { isSettledMissionRun } from '@/lib/systems/MissionRunLifecycle'
import { surfaceForScreen } from '@/lib/screen-layouts'
import { SurfaceLayout } from '@/components/layout/frame/ScreenLayouts'
import SceneTransition from '@/components/game/SceneTransition'
import { useCommunityResearch } from '@/lib/research/useCommunityResearch'
import { buyResearchItem, convertResearchFragments } from '@/lib/research/marketplace'
import { choosePath, claimResearchReward } from '@/lib/research/paths'
export { VALID_SCREENS } from '@/lib/game-screens'

// Shared per-screen render map — the single source of truth for "which
// component renders for game.screen". Used by both the URL-synced
// (main)/[screen] route and the standalone ship-customizer dev route, which
// otherwise diverged silently (each bugfix had to be ported twice).
type ScreenContentProps = {
  screen: Screen
  game: ReturnType<typeof useGame>
  onboardingActive: boolean
  /** The coach strip is on screen; hub callouts wait so two guides never compete. */
  coachVisible?: boolean
  /** Overrides HangarScreen's onBack; falls back to the remembered entry scene. */
  onBackFromHangar?: () => void
}

// SSL-441: every scene change fades through a void veil instead of hard-cutting.
export function ScreenContent(props: ScreenContentProps) {
  return (
    <SceneTransition sceneKey={props.screen}>
      {/* SSL-35 / SSL-452: every screen renders inside the shared frame,
          labelled with the layout type its route maps to in GAME_ROUTES. */}
      <SurfaceLayout surface={surfaceForScreen(props.screen)}>
        <ScreenBody {...props} />
      </SurfaceLayout>
    </SceneTransition>
  )
}

function ScreenBody({
  screen,
  game,
  onboardingActive,
  coachVisible,
  onBackFromHangar,
}: ScreenContentProps) {
  // Launch sequence state lives here so it's scoped to the fab screen
  // Dev-only: `?launchscene=1` mounts the launch sequence so it can be rendered headless.
  const [launchPending, setLaunchPending] = useState(() =>
    process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('launchscene'))
  const [inspectSignal, setInspectSignal] = useState<InstrumentSignal | null>(null)
  const communityResearch = useCommunityResearch(screen === 'instrument-hub' || screen === 'market' || screen === 'community-research')

  useEffect(() => {
    if (screen !== 'hub') return
    const warmCommonDestinations = () => {
      void Promise.allSettled([
        loadMissionSetupRoutes(),
        loadLaunchpadScreen(),
        loadMarketScreen(),
        loadMissionHistoryScreen(),
      ])
    }
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(warmCommonDestinations, { timeout: 1500 })
      return () => idleWindow.cancelIdleCallback?.(idleId)
    }
    const timer = globalThis.setTimeout(warmCommonDestinations, 600)
    return () => globalThis.clearTimeout(timer)
  }, [screen])
  const handleLaunch = useCallback(() => setLaunchPending(true), [])
  const handleLaunchComplete = useCallback(() => {
    setLaunchPending(false)
    game.onLaunch()
  }, [game.onLaunch])
  const rocketDisplay = rocketDisplayForConfig(game.rocket)
  const transitTarget = game.player.headingToDelivery && game.deliveryTargetId
    ? game.catalog.targets.find(t => t.id === game.deliveryTargetId) ?? game.target
    : game.target
  // Debrief should attribute the Earth-return leg to the ship's last waypoint —
  // for two-leg "mine then deliver" missions that's the delivery target, not
  // the original mining site, otherwise the delivery stop reads as if it never happened.
  const debriefOriginTarget = game.mission?.deliveryTargetId
    ? game.catalog.targets.find(t => t.id === game.mission!.deliveryTargetId) ?? game.target
    : game.target
  const deliveryTargetName = game.mission?.deliveryTargetId
    ? game.catalog.targets.find(t => t.id === game.mission!.deliveryTargetId)?.name
    : undefined
  // For the debrief Route chip specifically: debriefOriginTarget above is
  // deliberately the delivery target (last waypoint), so the Route display
  // needs the actual mining site's name separately, resolved from
  // mission.targetId rather than reusing debriefOriginTarget (KES-352 —
  // this rendered as "deliveryTarget -> deliveryTarget" before this fix).
  const originTargetName = game.mission?.deliveryTargetId
    ? game.catalog.targets.find(t => t.id === game.mission!.targetId)?.name
    : undefined

  // Flight Plan supersedes the retired coach sequence. Keep the contextual
  // mining seam tied to the active try rather than the legacy coach state.
  const trainingMiningTry = currentTrainingTry(game.player.flightPlan) === 'mining'

  useEffect(() => {
    // Refining is commissioned at an approved off-world site. An old save
    // that contains a Base refinery remains readable, but no unbuilt player
    // can enter the retired Earth-refinery screen.
    if (screen === 'refinery' && !game.player.refineryBuilt) game.go('hub')
    // The Build tab is a Free Ops entry point. Keep the onboarding assembly
    // flow reachable only when it has a real mission context; a bare/deep
    // linked fab route must never show a prefilled rocket.
    if (screen === 'fab' && !game.player.freeOperations && (!game.mission || !game.target)) game.go('hub')
    // A brand-new account has no base yet: send it to the intro (choose a site, then place the launchpad) instead of an empty field
    // whose coach says "Tap the tower". Wait for the remote save first so a returning player on a new device is not sent back.
    if (screen === 'hub' && game.hydrated && game.player.placed.length === 0 && game.player.missionsDone === 0 && !game.player.freeOperations) game.go('intro')
    // Build placement is a valid destination from Hub, Academy, instrument
    // screens, and the Launchpad availability panel. It has its own back
    // action, so a returning player must be allowed to open it and place a
    // newly unlocked structure.
  }, [screen, game.hydrated, game.player.placed.length, game.player.missionsDone, game.player.freeOperations, game.player.hasLanded, game.mission, game.target, game.go])

  // HubScreen's surface/subsurface slide is driven by ephemeral UI state
  // (game.subsurfaceView), not the route, so a real navigation into
  // 'hub-subsurface' (e.g. Launchpad's "Open Subsurface") or plain 'hub'
  // needs to seed/reset that state the same way the old per-mount
  // `initialSubsurface` prop used to.
  useEffect(() => {
    if (screen === 'hub-subsurface') game.setSubsurfaceView(true)
    // Any other screen clears it, so a stale flag from a visit to
    // Subsurface can't leak into /game/launchpad (SSL-476).
    else game.setSubsurfaceView(false)
  }, [screen, game.setSubsurfaceView])

  switch (screen) {
    case 'intro':
      return (
        <IntroScreen
          onBegin={biome => {
            if (biome) game.setPlayer(current => ({ ...current, earthBiome: biome }))
            game.go('build')
          }}
          returning={game.player.missionsDone > 0 || game.player.placed.length > 0}
          missionsDone={game.player.missionsDone}
          totalEarned={game.player.francs}
          awaitingRemoteState={!game.hydrated}
          savedBiome={game.player.earthBiome}
        />
      )

    case 'build':
    case 'hub':
    case 'hub-subsurface': {
      const unlockOpts = {
        refineryUnlocked: !!game.player.refineryUnlocked,
        placed: game.player.placed,
        freeOperations: game.player.freeOperations,
        missionsDone: game.player.missionsDone,
      }
      const eventSiloFree = (game.missionId === ORIONIDS_NIGHT_RUN_ID || game.player.activeMission?.id === ORIONIDS_NIGHT_RUN_ID)
        && isDebrisEventActive(ORIONIDS_DEBRIS_PRESET, Date.now())
      // Only unlocked structures that are not already on the base are offered.
      const buildOptions: HubBuildOption[] = game.catalog.structures
        .filter(structure => structure.id !== 'garage' && structure.id !== 'astronaut-academy'
          && !game.player.placed.includes(structure.id)
          && (structureUnlocked(structure, unlockOpts) || (eventSiloFree && structure.id === 'surface-silo')))
        .map(structure => {
          const pricedStructure = eventSiloFree && structure.id === 'surface-silo' ? { ...structure, cost: 0 } : structure
          const gaps = structureAffordabilityGaps(pricedStructure, { francs: game.player.francs, stash: game.player.stash })
          const mineralCost = Object.entries(structure.costMaterials ?? {}).map(([mineral, amount]) => `${amount} ${mineral}`).join(' · ')
          const francs = pricedStructure.cost === 0 ? 'Free' : formatCurrency(pricedStructure.cost, { compact: true })
          return {
            id: structure.id,
            name: structure.name,
            cost: mineralCost ? `${francs} · ${mineralCost}` : francs,
            affordable: canAffordStructure(pricedStructure, { francs: game.player.francs, stash: game.player.stash }),
            reason: gaps.length ? `Need ${gaps.join(', ')}` : undefined,
          }
        })
      const placeStructureFromBase = (kind: string, plot: number): boolean => {
        const structure = game.catalog.structures.find(s => s.id === kind)
        const enteringFreeOps = !game.player.freeOperations
          && freeOperationsUnlocked({ missionsDone: game.player.missionsDone, placed: [...game.player.placed, kind] })
        const placed = game.placeStructure(structure, kind, plot)
        if (!placed) return false
        game.completeStep(0)
        captureGameEvent('structure_placed', { structure_kind: kind })
        if (enteringFreeOps) captureFreeOpsUnlocked(game.player.missionsDone, 'silo')
        enqueueSurvey('lnm_base_building', 1200)
        if (screen === 'build') game.go('hub')
        return true
      }
      const hub = (
        <HubScreen
          player={game.player}
          placementMode={screen === 'build'}
          buildOptions={buildOptions}
          onPlaceStructure={placeStructureFromBase}
          rocketVariant={rocketModelForConfig(game.rocket).tier >= 2 ? 'prospector' : 'explorer'}
          onboardingActive={onboardingActive}
          coachVisible={coachVisible}
          onOpenScene={s => {
            if (s === 'missions') { game.goToMissions(); return }
            if (s === 'launchpad') { game.openLaunchpad(); return }
            game.go(s)
          }}
          onDismissHubPrompt={key => game.setPlayer(current => dismissHubPrompt(current, key))}
          onFocusBuilding={building => {
            if (building === 'build') return game.go('build')
            if (building === 'refinery') return game.go('refinery')
            if (building === 'market') return game.go('market')
            if (building === 'control-station') return game.go('instrument-hub')
            // Mission first: the hangar opens on its rocket choice only once a mission and
            // destination are set up. Otherwise it starts at the contract board.
            if (building === 'hangar') return game.mission && game.target ? game.go('hangar') : game.goToMissions()
            if (building === 'deep-space-telescope') return game.go('asteroid-discovery')
            if (building === 'missions') {
              // Unlike Launchpad below, a run in flight does NOT bounce the
              // player away from the Mission Board — they may reasonably want
              // to browse/plan the next contract while a leg is in flight.
              // The Hub resume banner and MissionTicker already cover getting
              // back into the active mission, so the Board doesn't need to
              // also gate on it (KES-262).
              if (game.player.pendingLaunch) return game.go('fab')
              return game.goToMissions()
            }
            if (building === 'launchpad') {
              // The physical building opens the Launchpad scene even while a
              // mission is active. Resuming flight is an explicit footer
              // action on that scene, not an accidental consequence of
              // clicking the building.
              if (game.player.pendingLaunch) return game.go('fab')
              // The Launchpad building opens the pad scene. Contracts, the
              // program chain and events live on the Mission Board.
              return game.openLaunchpad()
            }
          }}
          onUpgradeBuilding={id => game.upgradeBuilding(id)}
          onExcavateSubsurface={() => game.excavateSubsurface()}
          onExcavateSubsurfaceUnavailable={() => {
            const cost = SUBSURFACE_EXCAVATE_COST
            const missing = [
              ...(game.player.francs < cost.cost ? [`${formatCurrency(cost.cost - game.player.francs)} more`] : []),
              ...Object.entries(cost.costMaterials)
                .map(([mineral, amount]) => ({ mineral, amount: amount - (game.player.stash?.[mineral] ?? 0) }))
                .filter(({ amount }) => amount > 0)
                .map(({ mineral, amount }) => `${amount} more ${mineral}`),
            ]
            game.addToast(`Cannot excavate: need ${missing.join(' and ')}`, 'warn')
          }}
          onBuildSubsurfaceRoom={roomId => game.buildSubsurfaceRoom(roomId)}
          onOpenMarket={() => game.go('market')}
          onDismissEconomyArrival={() => game.setPlayer(current => ({ ...current, economyArrival: undefined }))}
          onOpenEvents={() => {
            // Completing the sky reading should reveal the event brief first.
            // Accepting the focused event is the explicit step that starts
            // mission setup and lets the player choose a ship.
            requestMissionBoardEvent('orionids-2026')
            game.goToMissions()
          }}
          onFocusResources={(label, minerals) => {
            game.setPlayer(player => ({ ...player, resourceFocus: { label, minerals } }))
            game.addToast(`${label} added to focus`, 'info')
            requestMissionBoardTab('program')
            game.goToMissions()
          }}
          subsurface={game.subsurfaceView}
          onSubsurfaceChange={open => game.go(open ? 'hub-subsurface' : 'hub')}
        />
      )
      return hub
    }

    case 'mission-history':
      // Mission Log is its own page with its own panel, not a tray over the Base.
      return (
        <PageSurface testId="mission-history-page" ariaLabel="Mission Log">
          <MissionHistoryScreen
            records={game.player.completedMissions ?? []}
            clients={game.catalog.clients}
            targets={game.catalog.targets}
            missions={game.catalog.missions}
            player={game.player}
            onBack={() => game.goBack('hub')}
          />
        </PageSurface>
      )

    case 'instrument-hub':
      return (
        <InstrumentHubScreen
          player={game.player}
          communityResearch={communityResearch}
          targets={game.catalog.targets}
          onStartScan={game.startSurveyScan}
          onResolveScan={game.resolveSurveyScan}
          onBack={() => game.goBack()}
          onBuild={() => game.go('build')}
          onInspect={signal => {
            setInspectSignal(signal)
            game.go(signal.inspectorScreen)
          }}
          onSnoozePing={() => {
            const dateKey = instrumentDigestDateKey()
            game.setPlayer(player => markInstrumentDigestNotified(
              markInstrumentDigestNotified(
                markInstrumentDigestNotified(player, TRANSIT_TELESCOPE_INSTRUMENT_ID, dateKey),
                DEEP_SPACE_TELESCOPE_INSTRUMENT_ID,
                dateKey,
              ),
              SATURN_IMAGER_INSTRUMENT_ID,
              dateKey,
            ))
          }}
        />
      )

    case 'galaxy':
      // Legacy inspector. Telescope tab and post-launch landing use instrument-hub.
      // Inspect still arrives here until the plate owns real TESS verdicts.
      return (
        <TessDiscoveryScreen
          player={game.player}
          inspectSubjectId={inspectSignal?.kind === 'transit' ? inspectSignal.id : undefined}
          visualCandidate={currentTrainingTry(game.player.flightPlan) === 'scan'
            ? TRAINING_TESS_CANDIDATE
            : game.visualFixture === 'tess' ? VISUAL_TESS_CANDIDATE : undefined}
          onBack={() => game.goBack()}
          onBuildStation={() => game.go('build')}
          onOpenProgram={() => { requestMissionBoardTab('program'); game.goToMissions() }}
          onSubmit={game.submitTessClassification}
          onChooseTarget={game.chooseSatelliteTarget}
          onReplayTraining={currentTrainingTry(game.player.flightPlan) === 'scan' ? () => game.replayTrainingTry('scan') : undefined}
        />
      )

    case 'asteroid-discovery':
      return (
        <AsteroidDiscoveryScreen
          player={game.player}
          inspectSubjectId={inspectSignal?.kind === 'deep-space' ? inspectSignal.id : undefined}
          visualCandidate={game.visualFixture === 'asteroid' ? VISUAL_ASTEROID_CANDIDATE : undefined}
          onBack={() => game.goBack()}
          onLaunchTelescope={() => game.go('launchpad')}
          onSubmit={game.submitAsteroidClassification}
        />
      )

    case 'saturn-storm-search':
      return (
        <SaturnStormSearchScreen
          player={game.player}
          inspectSubjectId={inspectSignal?.kind === 'saturn' ? inspectSignal.id : undefined}
          onBack={() => game.goBack()}
          onLaunchImager={() => game.go('launchpad')}
          onSubmit={game.submitSaturnClassification}
        />
      )

    case 'missions':
    case 'targets':
    case 'rocket-buy':
    case 'fab':
      return (
        <MissionSetupRoutes
          screen={screen}
          game={game}
          rocketDisplay={rocketDisplay}
          launchPending={launchPending}
          onTransferToLaunchpad={game.onTransferToLaunchpad}
          onLaunch={handleLaunch}
          onLaunchComplete={handleLaunchComplete}
        />
      )

    case 'transit':
    case 'landing':
    case 'mining':
    case 'rover-survey':
    case 'delivery':
    case 'debrief':
      if (!transitTarget || !debriefOriginTarget) {
        return (
          <div className="game-screen theme-blueprint" data-testid="mission-operation-recovery" role="status" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
            <div style={{ maxWidth: 520, padding: 24, color: 'var(--ln-blueprint-ink)', background: 'var(--ln-blueprint-paper)', border: '2px solid var(--ln-blueprint-ink)', textAlign: 'center' }}>
              <p style={{ margin: '0 0 16px' }}>The flight details are still loading.</p>
              <button type="button" onClick={() => game.go('missions')} style={{ minHeight: 44, padding: '0 16px', color: 'var(--ln-blueprint-paper)', background: 'var(--ln-blueprint-blue)', border: '2px solid var(--ln-blueprint-ink)', font: '800 14px var(--ln-font-display)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Back to missions</button>
            </div>
          </div>
        )
      }
      return (
        <MissionOperationRoutes
          screen={screen}
          game={game}
          trainingMiningTry={trainingMiningTry}
          transitTarget={transitTarget}
          debriefOriginTarget={debriefOriginTarget}
          deliveryTargetName={deliveryTargetName}
          originTargetName={originTargetName}
          rocketDisplay={rocketDisplay}
        />
      )

    case 'refinery':
      return (
        <RefineryScreen
          player={{
            francs: game.player.francs,
            stash: game.player.stash,
            refineryQueue: game.player.refineryQueue,
            refinedGoods: game.player.refinedGoods,
            refineryLastStartedAt: game.player.refineryLastStartedAt,
            researchPermanentBonuses: game.player.researchPermanentBonuses,
          }}
          onBack={() => game.goBack()}
          onStartRefine={game.onStartRefine}
          onCollect={game.onCollectRefined}
        />
      )

    case 'market':
      return (
        <MarketScreen
          stash={game.player.stash ?? {}}
          marketSupply={game.player.marketSupply ?? {}}
          marketSupplyUpdatedAt={game.player.marketSupplyUpdatedAt ?? {}}
          dailyEconomySnapshot={game.player.dailyEconomySnapshot}
          researchFragments={game.player.researchFragments ?? 0}
          researchUniversalFragments={game.player.researchUniversalFragments ?? 0}
          researchPurchases={game.player.researchPurchases}
          researchPermanentBonuses={game.player.researchPermanentBonuses}
          francs={game.player.francs}
          exchangeBuilt={exchangeBuilt(game.player)}
          priceAlerts={game.player.priceAlerts}
          buyBlocker={(id, amount) => buyBlocker(game.player, id, amount)}
          onSell={game.sellMinerals}
          onBuy={game.buyMinerals}
          onSetAlert={game.setPriceAlert}
          onRemoveAlert={game.removePriceAlert}
          refinedGoods={game.player.refinedGoods}
          onSellRefined={game.sellRefinedGoods}
          onBack={() => game.goBack()}
          onBuild={() => game.go('build')}
          onHub={() => game.go('instrument-hub')}
          onNext={() => game.go(game.player.activeMission ? 'launchpad' : 'missions')}
          onConvertResearchFragments={() => game.setPlayer(current => convertResearchFragments(current))}
          onBuyResearchItem={itemId => game.setPlayer(current => buyResearchItem(current, itemId))}
          clientId={game.player.lastClient}
        />
      )

    case 'hangar':
      return (
        <HangarScreen
          francs={game.player.francs}
          missionsDone={game.player.missionsDone}
          shipCustomizerParts={game.player.shipCustomizerParts}
          landingResearched={game.player.landingResearched}
          pendingLaunch={game.player.pendingLaunch}
          pendingRocketName={rocketDisplay.name}
          onConfirmShipCustomizerBuild={game.confirmShipCustomizerBuild}
          missionTitle={game.mission?.title ?? null}
          compatibleRocketIds={game.mission && game.target
            ? ROCKET_MODELS.filter(model => rocketCompatibleWithMission(model, game.mission!)).map(model => model.id)
            : null}
          stagedTier={(() => {
            const vehicle = game.player.stagedRockets?.find(candidate => candidate.id === game.player.selectedStagedRocketId && candidate.location === 'hangar')
            return vehicle ? (ROCKET_MODELS.find(model => model.id === vehicle.rocketId)?.tier ?? 1) : null
          })()}
          selectedRocketId={game.player.stagedRockets?.find(candidate => candidate.id === game.player.selectedStagedRocketId)?.rocketId ?? null}
          onChooseMission={() => game.goToMissions()}
          onBuildRocket={game.onPurchaseRocket}
          onBack={onBackFromHangar ?? game.returnFromHangar}
        />
      )

    case 'community-research':
      return (
        <CommunityResearchScreen
          player={game.player}
          communityResearch={communityResearch}
          onBack={() => game.goBack('hub')}
          onChoosePath={path => game.setPlayer(current => choosePath(current, path, Date.now()))}
          onClaimReward={(step, progress) => game.setPlayer(current => claimResearchReward(current, step, progress, Date.now()))}
          onGo={kind => {
            if (kind === 'event') requestMissionBoardEvent('orionids-2026')
            else if (kind === 'discovery-mission') requestMissionBoardTab('free')
            else if (kind === 'exchange-sale' || kind === 'price-alert') return game.go('market')
            else if (kind === 'contract-run') requestMissionBoardTab('contracts')
            else if (kind === 'classification' || kind === 'survey') {
              const hasInstruments = game.player.placed.includes('control-station') || !!game.player.transitSatelliteLaunchedAt
              if (hasInstruments) return game.go('instrument-hub')
              requestMissionBoardTab('program')
            }
            game.goToMissions()
          }}
        />
      )

    case 'narrative-ledger':
      return <NarrativeLedgerScreen onBack={() => game.goBack()} />

    case 'launchpad':
      {
        const currentRunKey = game.player.activeMission
          ? (game.player.missionRunId ?? `${game.player.activeMission.id}:${game.player.transitStartedAt ?? 'current'}`)
          : null
        const activeSettled = !!game.player.activeMission && isSettledMissionRun(game.player, {
          runId: game.player.missionRunId,
          missionId: game.player.activeMission.id,
          targetId: game.targetId,
          launchedAt: game.player.transitStartedAt,
        })
        const missionRuns = [
          ...(game.player.activeMission && currentRunKey && !activeSettled ? [{
            key: currentRunKey,
            label: game.player.activeMission.label,
            phase: game.player.missionPhase ?? 'transit',
          }] : []),
          ...(game.player.pausedMissionRuns ?? [])
            .filter(run => !isSettledMissionRun(game.player, {
              runId: run.missionRunId,
              missionId: run.missionId,
              targetId: run.targetId,
              launchedAt: run.transitStartedAt,
            }))
            .map(run => ({
              key: run.key,
              label: run.activeMission.label,
              phase: run.missionPhase ?? 'transit',
            })),
        ]
      return (
        <LaunchpadScreen
          onBack={() => game.goBack()}
          onPick={(id, freeHaulDisposition) => {
            game.onPickMission(id, freeHaulDisposition)
          }}
          onViewContracts={() => game.goToMissions()}
          onLaunchpadAction={() => {
            if (game.player.pendingLaunch) return game.go('fab')
            game.goToMissions()
          }}
          missionMenuOpen={game.launchpadMissionMenuOpen}
          onMissionMenuOpenChange={game.setLaunchpadMissionMenuOpen}
          onResumeMission={game.player.activeMission && !activeSettled ? () => {
            captureGameEvent('mission_resumed', { mission_phase: game.player.missionPhase ?? 'transit' })
            enqueueSurvey('lnm_resume_mission', 1200)
            game.go(missionResumeScreen(game.player))
          } : undefined}
          missionRuns={missionRuns}
          onResumeMissionRun={key => {
            if (key === currentRunKey) {
              game.go(missionResumeScreen(game.player))
              return
            }
            game.resumeMissionRun(key)
          }}
          onOpenSiloBuild={() => game.go('build')}
          onOpenControlStation={() => game.go('instrument-hub')}
          onAbandonMission={game.player.activeMission && !activeSettled ? () => game.abandonMission({ confirmed: true }) : undefined}
          missionsDone={game.player.missionsDone}
          freeOperations={game.player.freeOperations}
          hydrated={game.hydrated}
          catalog={game.catalog}
          player={game.player}
          rocketImageSrc={rocketDisplay.img}
          selectedRocketName={rocketDisplay.name}
          mission={game.mission ? { title: game.mission.title } : null}
          target={game.target}
          rocket={game.rocket}
          hasStagedRocket={game.player.stagedRockets?.some(vehicle => vehicle.id === game.player.selectedStagedRocketId && vehicle.location === 'launchpad') ?? false}
          onDismantle={() => game.onDismantleStagedRocket()}
          guided={onboardingActive}
          onInstallLoadout={(next, prev) => game.confirmShipCustomizerBuild(next, prev)}
          onRequestLaunch={() => {
            const vehicle = game.player.stagedRockets?.find(candidate => candidate.id === game.player.selectedStagedRocketId)
            if (!vehicle || vehicle.location !== 'launchpad') {
              // A default config is only a design preview. Never turn the
              // launch CTA into an implicit rocket purchase.
              game.go('hangar')
              return
            }
            handleLaunch()
          }}
          launching={launchPending}
          onLaunchComplete={handleLaunchComplete}
        />
      )
      }

    default:
      return null
  }
}
