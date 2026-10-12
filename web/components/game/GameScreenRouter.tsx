'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useGame } from '@/game-context'
import { rocketDisplayForConfig, rocketModelForConfig, SUBSURFACE_EXCAVATE_COST, type CraftingRecipe } from '@/lib/data'
import { freeOperationsUnlocked } from '@/lib/systems/AgencyOnboardingSystem'
import { currentTrainingTry } from '@/lib/systems/FlightPlanSystem'
import type { Screen } from '@/lib/game-types'
import { formatCurrency } from '@/lib/format'
import { hasEstablishedMiningSettlement } from '@/lib/systems/SurfaceOpsSystem'
// IntroScreen and HubScreen are the two most likely first paints (cold start
// and post-onboarding default), so they stay in the main bundle. Every other
// screen below is code-split with next/dynamic — the switch below only ever
// renders one of them at a time, so there's no reason to ship all ~20
// screens' JS on the very first load.
import IntroScreen from '@/components/game/screens/IntroScreen'
import PageSurface from '@/components/ui/PageSurface'
import HubScreen from '@/components/game/screens/HubScreen'
import type { BaseOverlayId } from '@/components/game/hub/BaseOverlay'

const ScreenLoading = () => <div className="game-screen-loading" aria-hidden="true" />

const MissionSetupRoutes = dynamic(() => import('@/components/game/MissionSetupRoutes'), { loading: ScreenLoading })
const MissionOperationRoutes = dynamic(() => import('@/components/game/MissionOperationRoutes'), { loading: ScreenLoading })
const InstrumentHubScreen = dynamic(() => import('@/components/game/screens/InstrumentHubScreen'), { loading: ScreenLoading })
const TessDiscoveryScreen = dynamic(() => import('@/components/game/screens/TessDiscoveryScreen'), { loading: ScreenLoading })
const SaturnStormSearchScreen = dynamic(() => import('@/components/game/screens/SaturnStormSearchScreen'), { loading: ScreenLoading })
const AsteroidDiscoveryScreen = dynamic(() => import('@/components/game/screens/AsteroidDiscoveryScreen'), { loading: ScreenLoading })
const SurfaceOpsScreen = dynamic(() => import('@/components/game/screens/SurfaceOpsScreen'), { loading: ScreenLoading })
const AcademyScreen = dynamic(() => import('@/components/game/screens/AcademyScreen'), { loading: ScreenLoading })
const MissionHistoryScreen = dynamic(() => import('@/components/game/screens/MissionHistoryScreen'), { loading: ScreenLoading })
const NarrativeLedgerScreen = dynamic(() => import('@/components/game/screens/NarrativeLedgerScreen'), { loading: ScreenLoading })
import { enqueueSurvey } from '@/lib/surveys'
import { requestMissionBoardTab } from '@/lib/mission-board-nav'
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
export { VALID_SCREENS } from '@/lib/game-screens'

// Shared per-screen render map — the single source of truth for "which
// component renders for game.screen". Used by both the URL-synced
// (main)/[screen] route and the standalone ship-customizer dev route, which
// otherwise diverged silently (each bugfix had to be ported twice).
type ScreenContentProps = {
  screen: Screen
  game: ReturnType<typeof useGame>
  onboardingActive: boolean
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
  onBackFromHangar,
}: ScreenContentProps) {
  // Launch sequence state lives here so it's scoped to the fab screen
  // Dev-only: `?launchscene=1` mounts the launch sequence so it can be rendered headless.
  const [launchPending, setLaunchPending] = useState(() =>
    process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('launchscene'))
  const [inspectSignal, setInspectSignal] = useState<InstrumentSignal | null>(null)
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

  // The Exchange is a permanent Earth Base building the player can tap at any
  // stage (SSL-477), so Market is no longer gated on freeOperations.
  useEffect(() => {
    // Refining is commissioned at an approved off-world site. An old save
    // that contains a Base refinery remains readable, but no unbuilt player
    // can enter the retired Earth-refinery screen.
    if (screen === 'refinery' && !game.player.refineryBuilt) game.go('hub')
    // The Build tab is a Free Ops entry point. Keep the onboarding assembly
    // flow reachable only when it has a real mission context; a bare/deep
    // linked fab route must never show a prefilled rocket.
    if (screen === 'fab' && !game.player.freeOperations && (!game.mission || !game.target)) game.go('hub')
    // Build placement is a valid destination from Hub, Academy, instrument
    // screens, and the Launchpad availability panel. It has its own back
    // action, so a returning player must be allowed to open it and place a
    // newly unlocked structure.
  }, [screen, game.player.freeOperations, game.player.hasLanded, game.mission, game.target, game.go])

  // The silo is a card on the live base. A saved hub-subsurface route must
  // not slide the pale underground page over the scene.
  useEffect(() => {
    if (screen !== 'mission-history') game.setSubsurfaceView(false)
  }, [screen, game.setSubsurfaceView])

  const renderBase = (overlay: BaseOverlayId | null) => {
    const activeSettled = !!game.player.activeMission && isSettledMissionRun(game.player, {
      runId: game.player.missionRunId,
      missionId: game.player.activeMission.id,
      targetId: game.targetId,
      launchedAt: game.player.transitStartedAt,
    })
    const canRun = !!game.player.activeMission && !activeSettled
    return (
      <>
        <HubScreen
          player={game.player}
          rocketVariant={rocketModelForConfig(game.rocket).tier >= 2 ? 'prospector' : 'explorer'}
          onboardingActive={onboardingActive}
          onOpenScene={s => {
            if (s === 'missions') { game.goToMissions(); return }
            if (s === 'launchpad') { game.openLaunchpad(); return }
            game.go(s)
          }}
          onDismissHubPrompt={key => game.setPlayer(current => dismissHubPrompt(current, key))}
          onFocusBuilding={building => {
            if (building === 'deep-space-telescope') return game.go('asteroid-discovery')
            if (building === 'academy' || building === 'astronaut-academy') return game.go('academy')
            if (building === 'missions') {
              if (game.player.pendingLaunch) return game.go('fab')
              return game.goToMissions()
            }
            if (building === 'launchpad' && game.player.pendingLaunch) return game.go('fab')
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
          onFocusResources={(label, minerals) => {
            game.setPlayer(player => ({ ...player, resourceFocus: { label, minerals } }))
            game.addToast(`${label} added to focus`, 'info')
            requestMissionBoardTab('program')
            game.goToMissions()
          }}
          subsurface={false}
          onSubsurfaceChange={() => game.go('hub')}
          forcedOverlay={overlay}
          onCloseOverlay={() => {
            if (screen === 'hangar' && onBackFromHangar) onBackFromHangar()
            else game.go('hub')
          }}
          onCreateMission={() => {
            if (game.player.pendingLaunch) return game.go('fab')
            game.goToMissions()
          }}
          onResumeMission={canRun ? () => {
            captureGameEvent('mission_resumed', { mission_phase: game.player.missionPhase ?? 'transit' })
            enqueueSurvey('lnm_resume_mission', 1200)
            game.go(missionResumeScreen(game.player))
          } : undefined}
          onScrubMission={canRun ? () => game.abandonMission({ confirmed: true }) : undefined}
          onOpenStation={() => game.go('instrument-hub')}
          missionLabel={game.player.activeMission?.label}
          buildPlayer={{
            francs: game.player.francs,
            stash: game.player.stash,
            placed: game.player.placed,
            freeOperations: game.player.freeOperations,
            refineryUnlocked: !!game.player.refineryUnlocked,
            academyResearched: !!game.player.academyResearched,
            missionsDone: game.player.missionsDone,
            hasMiningSettlement: hasEstablishedMiningSettlement(game.player),
          }}
          onPlaceStructure={(kind, plot) => {
            const structure = game.catalog.structures.find(s => s.id === kind)
            const enteringFreeOps = !game.player.freeOperations
              && freeOperationsUnlocked({ missionsDone: game.player.missionsDone, placed: [...game.player.placed, kind] })
            const placed = game.placeStructure(structure, kind, plot)
            if (!placed) return false
            game.completeStep(0)
            captureGameEvent('structure_placed', { structure_kind: kind })
            if (enteringFreeOps) captureFreeOpsUnlocked(game.player.missionsDone, 'silo')
            enqueueSurvey('lnm_base_building', 1200)
            if (kind === 'astronaut-academy') enqueueSurvey('lnm_crew_academy_built', 1200)
            if (screen !== 'hub') game.go('hub')
            return true
          }}
          exchange={{
            stash: game.player.stash ?? {},
            marketSupply: game.player.marketSupply ?? {},
            marketSupplyUpdatedAt: game.player.marketSupplyUpdatedAt ?? {},
            dailyEconomySnapshot: game.player.dailyEconomySnapshot,
            francs: game.player.francs,
            onSell: game.sellMinerals,
            refinedGoods: game.player.refinedGoods,
            onSellRefined: game.sellRefinedGoods,
            onBack: () => game.go('hub'),
            onOpenMissions: () => game.go('missions'),
            clientId: game.player.lastClient,
            placedStructures: game.player.placed,
            fieldKits: game.player.fieldKits ?? {},
            onBuildRecipe: (recipe: CraftingRecipe) => recipe.producedAt === 'field' ? game.buildFieldKit(recipe.id) : false,
          }}
          hangar={{
            francs: game.player.francs,
            missionsDone: game.player.missionsDone,
            installed: game.player.shipCustomizerParts ?? {},
            crewModuleResearched: game.player.crewModuleResearched,
            landingResearched: game.player.landingResearched,
            onConfirm: game.confirmShipCustomizerBuild,
          }}
          refinery={{
            queue: game.player.refineryQueue ?? [],
            refinedGoods: game.player.refinedGoods ?? {},
            onStart: game.onStartRefine,
            onCollect: game.onCollectRefined,
          }}
          skills={{
            points: game.player.skillPoints ?? 0,
            unlocked: game.player.unlockedSkillNodes ?? [],
            onUnlock: game.unlockSkillNode,
          }}
          onMissions={() => game.go('missions')}
        />
        {screen === 'mission-history' && (
          <PageSurface tray testId="mission-history-tray" ariaLabel="Mission Log">
            <MissionHistoryScreen
              records={game.player.completedMissions ?? []}
              clients={game.catalog.clients}
              targets={game.catalog.targets}
              missions={game.catalog.missions}
              player={game.player}
              onBack={() => game.goBack('hub')}
            />
          </PageSurface>
        )}
      </>
    )
  }

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
        />
      )

    case 'hub':
    case 'hub-subsurface':
    case 'mission-history':
    case 'launchpad':
    case 'hangar':
    case 'market':
    case 'build':
    case 'refinery':
    case 'skills':
      return renderBase(screen === 'launchpad' ? 'launchpad'
        : screen === 'hangar' ? 'hangar'
        : screen === 'market' ? 'exchange'
        : screen === 'build' ? 'build'
        : screen === 'refinery' ? 'refinery'
        : screen === 'skills' ? 'skills'
        : screen === 'hub-subsurface' ? 'silo'
        : null)

    case 'instrument-hub':
      return (
        <InstrumentHubScreen
          player={game.player}
          onClaimSurveyPlot={game.claimSaturnSurveyTerritory}
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
          onClaimTerritory={game.claimSaturnSurveyTerritory}
        />
      )

    case 'fab':
      if (!game.mission || !game.target) return renderBase(game.player.freeOperations ? 'operation' : null)
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

    case 'missions':
    case 'targets':
    case 'rocket-buy':
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
      if (!transitTarget || !debriefOriginTarget) return null
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

    case 'academy':
      return (
        <AcademyScreen
          player={game.player}
          catalog={game.catalog}
          onBack={() => game.goBack()}
          onBuild={() => game.go('build')}
          onOpenHangar={() => game.go('hangar')}
          onResearch={game.researchAcademy}
          onFunding={game.setAcademyFunding}
          onHire={game.hireCrew}
          onRehire={game.rehireCrew}
          onTrain={game.startCrewTraining}
          onTrainCandidate={game.startCandidateTraining}
          onCollectTraining={game.collectCrewTraining}
          onResearchCrewModule={game.researchCrewModule}
          onAssign={game.assignCrewToStructure}
          onShareCharts={game.shareChartsWithClient}
        />
      )

    case 'surface-ops':
      return (
        <SurfaceOpsScreen
          player={game.player}
          onBack={() => game.goBack()}
          onPurchaseSiteAccess={game.purchaseSiteAccess}
          onStartFieldOperation={game.startFieldOperation}
          onBuildLaunchpad={game.buildSettlementLaunchpad}
          onMined={game.recordSurfaceMined}
          onDispatch={game.dispatchSurfaceFerry}
          onRetry={game.retrySurfaceFerry}
          onReconcile={game.reconcileSurfaceFerry}
          onAcknowledge={game.acknowledgeSurfaceFerry}
          onFieldBuild={game.recordFieldBuild}
          onFieldDemolish={game.recordFieldDemolish}
          onFieldRefine={game.runFieldRefining}
          onFabricate={game.fabricateAtField}
          onSeedBiosphere={game.seedBiosphere}
        />
      )

    default:
      return null
  }
}
