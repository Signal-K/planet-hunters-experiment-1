'use client'

import { useEffect, useState, useCallback } from 'react'
import { useGame } from '@/game-context'
import { ACADEMY_INTRO_MISSION_ID, M1_STEPS, M2_STEPS, M3_STEPS, rocketDisplayForConfig, rocketModelForConfig } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import type { Screen } from '@/lib/game-types'
import MissionSetupRoutes from '@/components/game/MissionSetupRoutes'
import MissionOperationRoutes from '@/components/game/MissionOperationRoutes'
import IntroScreen from '@/components/game/screens/IntroScreen'
import BuildPlaceScreen from '@/components/game/screens/BuildPlaceScreen'
import HubScreen from '@/components/game/screens/HubScreen'
import RefineryScreen from '@/components/game/screens/RefineryScreen'
import MarketScreen from '@/components/game/screens/MarketScreen'
import HangarScreen from '@/components/game/screens/HangarScreen'
import SkillTreeScreen from '@/components/game/screens/SkillTreeScreen'
import ScanStationScreen from '@/components/game/screens/ScanStationScreen'
import LaunchpadScreen from '@/components/game/screens/LaunchpadScreen'
import TessDiscoveryScreen from '@/components/game/screens/TessDiscoveryScreen'
import AsteroidDiscoveryScreen from '@/components/game/screens/AsteroidDiscoveryScreen'
import SurfaceOpsScreen from '@/components/game/screens/SurfaceOpsScreen'
import AcademyScreen from '@/components/game/screens/AcademyScreen'
import MissionHistoryScreen from '@/components/game/screens/MissionHistoryScreen'
import NarrativeLedgerScreen from '@/components/game/screens/NarrativeLedgerScreen'
import { enqueueSurvey } from '@/lib/surveys'
import { VISUAL_ASTEROID_CANDIDATE, VISUAL_TESS_CANDIDATE } from '@/lib/visual-fixtures'
import { captureGameEvent } from '@/lib/posthog'

export const VALID_SCREENS = new Set<Screen>([
  'intro', 'build', 'hub', 'hub-subsurface', 'missions', 'galaxy', 'targets', 'fab',
  'transit', 'landing', 'mining', 'rover-mining', 'delivery', 'debrief', 'refinery',
  'market', 'hangar', 'rocket-buy', 'skills', 'scan-station',
  'launchpad',
  'surface-ops',
  'academy',
  'asteroid-discovery',
  'mission-history',
  'narrative-ledger',
])

// Shared per-screen render map — the single source of truth for "which
// component renders for game.screen". Used by both the URL-synced
// (main)/[screen] route and the standalone ship-customizer dev route, which
// otherwise diverged silently (each bugfix had to be ported twice).
export function ScreenContent({
  screen,
  game,
  hasCoach,
  onBackFromHangar,
}: {
  screen: Screen
  game: ReturnType<typeof useGame>
  hasCoach: boolean
  /** Overrides HangarScreen's onBack; falls back to the remembered entry scene. */
  onBackFromHangar?: () => void
}) {
  // Launch sequence state lives here so it's scoped to the fab screen
  const [launchPending, setLaunchPending] = useState(false)
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

  // Derive the coach step for coachManual (needed by AssemblyScreen)
  const coachSteps = !game.tutorial || game.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE ? [] :
    game.player.missionsDone === 0 ? M1_STEPS :
    game.player.missionsDone === 1 ? M2_STEPS :
    game.player.missionsDone === 2 ? M3_STEPS : []
  // An active run always outranks onboarding copy. A player returning to an
  // in-flight mission must see the resume affordance, not a fresh-contract
  // coach card that routes them back to mission creation.
  const coach = game.player.activeMission
    ? null
    : coachSteps.find(s => s.screen === screen && !game.doneSteps[s.id]) ?? null

  // Market is a Free Ops feature — a player without freeOperations landing
  // here directly (bookmarked URL, back/forward) shouldn't see a locked
  // screen render at all.
  useEffect(() => {
    if (screen === 'market' && !game.player.freeOperations) game.go('hub')
    // The old solo settlement/permit screen conflicts with client territory
    // and predefined site rights. Keep its saved data migratable, but do not
    // route new or returning players into a mechanic that KES-287 replaces.
    if (screen === 'surface-ops') game.go('hub')
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

  // HubScreen's surface/subsurface slide is driven by ephemeral UI state
  // (game.subsurfaceView), not the route, so a real navigation into
  // 'hub-subsurface' (e.g. Launchpad's "Open Subsurface") or plain 'hub'
  // needs to seed/reset that state the same way the old per-mount
  // `initialSubsurface` prop used to.
  useEffect(() => {
    if (screen === 'hub-subsurface') game.setSubsurfaceView(true)
    else if (screen === 'hub') game.setSubsurfaceView(false)
  }, [screen, game.setSubsurfaceView])

  switch (screen) {
    case 'intro':
      return (
        <IntroScreen
          onBegin={() => game.go('build')}
          returning={game.player.missionsDone > 0 || game.player.placed.length > 0}
          missionsDone={game.player.missionsDone}
          totalEarned={game.player.francs}
          awaitingRemoteState={!game.hydrated}
        />
      )

    case 'build':
      return (
        <BuildPlaceScreen
          onBack={() => game.go('hub')}
          hasCoach={hasCoach}
          player={{
            francs: game.player.francs,
            stash: game.player.stash,
            placed: game.player.placed,
            freeOperations: game.player.freeOperations,
            refineryUnlocked: !!game.player.refineryUnlocked,
            academyResearched: !!game.player.academyResearched,
            placementPlots: game.player.placementPlots,
            transitSatelliteLevel: game.player.transitSatelliteLevel,
            clientMissions: game.player.clientMissions,
            deepSpaceTelescopeMissionCompletedAt: game.player.deepSpaceTelescopeMissionCompletedAt,
            scanStationMissionCompletedAt: game.player.scanStationMissionCompletedAt,
          }}
          onPlaced={(kind, plot) => {
            const structure = game.catalog.structures.find(s => s.id === kind)
            game.placeStructure(structure, kind, plot)
            game.completeStep(0)
            captureGameEvent('structure_placed', { structure_kind: kind })
            enqueueSurvey('lnm_base_building', 1200)
            if (kind === 'astronaut-academy') enqueueSurvey('lnm_crew_academy_built', 1200)
            game.go('hub')
          }}
        />
      )

    case 'hub':
    case 'hub-subsurface':
      return (
        <HubScreen
          player={game.player}
          rocketVariant={rocketModelForConfig(game.rocket).tier >= 2 ? 'prospector' : 'explorer'}
          hasCoach={hasCoach}
          onOpenScene={s => {
            if (s === 'missions') { game.goToMissions(); return }
            if (s === 'launchpad') { game.openLaunchpad(); return }
            game.go(s)
          }}
          onFocusBuilding={building => {
            if (building === 'build') return game.go('build')
            if (building === 'refinery') return game.go('refinery')
            if (building === 'hangar') return game.go('hangar')
            if (building === 'skills') return game.go('skills')
            if (building === 'scan-station') return game.go('scan-station')
            if (building === 'deep-space-telescope') return game.go('asteroid-discovery')
            if (building === 'academy' || building === 'astronaut-academy') return game.go('academy')
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
              // The Launchpad is an in-world interaction surface for every
              // entry point; it must not fall back to a dashboard overview.
              return game.openLaunchpadMissionMenu()
            }
          }}
          onUpgradeLaunchpad={() => game.upgradeLaunchpad()}
          onExcavateSubsurface={() => game.excavateSubsurface()}
          onBuildSubsurfaceRoom={roomId => game.buildSubsurfaceRoom(roomId)}
          subsurface={game.subsurfaceView}
          onSubsurfaceChange={game.setSubsurfaceView}
        />
      )

    case 'galaxy':
      return (
        <TessDiscoveryScreen
          player={game.player}
          visualCandidate={game.visualFixture === 'tess' ? VISUAL_TESS_CANDIDATE : undefined}
          onBack={() => game.go('hub')}
          onBuildStation={() => game.go('build')}
          onOpenProgram={game.openLaunchpad}
          onSubmit={game.submitTessClassification}
          onChooseTarget={game.chooseSatelliteTarget}
        />
      )

    case 'asteroid-discovery':
      return (
        <AsteroidDiscoveryScreen
          player={game.player}
          visualCandidate={game.visualFixture === 'asteroid' ? VISUAL_ASTEROID_CANDIDATE : undefined}
          onBack={() => game.go('hub')}
          onBuildTelescope={() => game.go('build')}
          onSubmit={game.submitAsteroidClassification}
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
          hasCoach={hasCoach}
          coachManual={coach?.manual ?? false}
          deliveryTargetName={deliveryTargetName}
          rocketDisplay={rocketDisplay}
          launchPending={launchPending}
          onLaunch={handleLaunch}
          onLaunchComplete={handleLaunchComplete}
        />
      )

    case 'transit':
    case 'landing':
    case 'mining':
    case 'rover-mining':
    case 'delivery':
    case 'debrief':
      if (!transitTarget || !debriefOriginTarget) return null
      return (
        <MissionOperationRoutes
          screen={screen}
          game={game}
          hasCoach={hasCoach}
          coachManual={coach?.manual ?? false}
          transitTarget={transitTarget}
          debriefOriginTarget={debriefOriginTarget}
          deliveryTargetName={deliveryTargetName}
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
            staffed: !!game.player.structureCrewAssignments?.refinery,
          }}
          onBack={() => game.go('hub')}
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
          francs={game.player.francs}
          onSell={game.sellMinerals}
          refinedGoods={game.player.refinedGoods}
          onSellRefined={game.sellRefinedGoods}
          onBack={() => game.go('hub')}
          onOpenMissions={() => game.go('missions')}
          clientId={game.player.lastClient}
        />
      )

    case 'hangar':
      return (
        <HangarScreen
          francs={game.player.francs}
          missionsDone={game.player.missionsDone}
          unlockedSkillNodes={game.player.unlockedSkillNodes ?? []}
          shipCustomizerParts={game.player.shipCustomizerParts}
          crewModuleResearched={game.player.crewModuleResearched}
          landingResearched={game.player.landingResearched}
          pendingLaunch={game.player.pendingLaunch}
          pendingRocketName={rocketDisplay.name}
          onConfirmShipCustomizerBuild={game.confirmShipCustomizerBuild}
          onBack={onBackFromHangar ?? game.returnFromHangar}
        />
      )

    case 'skills':
      return (
        <SkillTreeScreen
          skillPoints={game.player.skillPoints ?? 0}
          unlockedSkillNodes={game.player.unlockedSkillNodes ?? []}
          onUnlock={game.unlockSkillNode}
          onBack={() => game.go('hub')}
          researchXP={game.player.researchXP ?? 0}
          licenseGrade={game.player.licenseGrade ?? 'Grade I'}
          onUpgradeLicenseGrade={game.upgradeLicenseGrade}
          firsts={{
            firstMissionDone: game.player.missionsDone > 0,
            firstSatelliteLaunched: !!game.player.transitSatelliteLaunchedAt,
            firstTessClassification: Object.keys(game.player.tessClassifications ?? {}).length > 0,
            firstBlueprintUnlocked: (game.player.unlockedBlueprints ?? []).length > 0,
            refineryBuilt: game.player.refineryBuilt,
            launchpadUpgraded: game.player.launchpadUpgraded,
          }}
        />
      )

    case 'mission-history':
      return (
        <MissionHistoryScreen
          records={game.player.completedMissions ?? []}
          clients={game.catalog.clients}
          targets={game.catalog.targets}
          player={game.player}
          onBack={() => game.go('hub')}
        />
      )

    case 'narrative-ledger':
      return <NarrativeLedgerScreen onBack={() => game.go('hub')} />

    case 'scan-station':
      return (
        <ScanStationScreen
          player={game.player}
          targets={game.catalog.targets}
          onBack={() => game.go('hub')}
          onStartScan={game.startScan}
          onCollectScan={game.collectScan}
        />
      )

    case 'launchpad':
      {
        const currentRunKey = game.player.activeMission
          ? (game.player.missionRunId ?? `${game.player.activeMission.id}:${game.player.transitStartedAt ?? 'current'}`)
          : null
        const missionRuns = [
          ...(game.player.activeMission && currentRunKey ? [{
            key: currentRunKey,
            label: game.player.activeMission.label,
            phase: game.player.missionPhase ?? 'transit',
          }] : []),
          ...(game.player.pausedMissionRuns ?? []).map(run => ({
            key: run.key,
            label: run.activeMission.label,
            phase: run.missionPhase ?? 'transit',
          })),
        ]
      return (
        <LaunchpadScreen
          onBack={() => game.go('hub')}
          onPick={id => {
            if (id === ACADEMY_INTRO_MISSION_ID) return game.go('academy')
            game.onPickMission(id)
          }}
          onViewContracts={() => game.goToMissions()}
          onLaunchpadAction={() => {
            if (game.player.pendingLaunch) return game.go('fab')
            game.goToMissions()
          }}
          onOpenHangar={() => game.go('hangar')}
          missionMenuOpen={game.launchpadMissionMenuOpen}
          onMissionMenuOpenChange={game.setLaunchpadMissionMenuOpen}
          onResumeMission={game.player.activeMission ? () => {
            captureGameEvent('mission_resumed', { mission_phase: game.player.missionPhase ?? 'transit' })
            enqueueSurvey('lnm_resume_mission', 1200)
            game.go(game.player.missionPhase ?? 'transit')
          } : undefined}
          missionRuns={missionRuns}
          onResumeMissionRun={key => {
            if (key === currentRunKey) {
              game.go(game.player.missionPhase ?? 'transit')
              return
            }
            game.resumeMissionRun(key)
          }}
          onViewMissionLog={() => game.go('mission-history')}
          missionsDone={game.player.missionsDone}
          freeOperations={game.player.freeOperations}
          catalog={game.catalog}
          player={game.player}
          rocketImageSrc={rocketDisplay.img}
          selectedRocketName={rocketDisplay.name}
          francs={game.player.francs}
        />
      )
      }

    case 'academy':
      return (
        <AcademyScreen
          player={game.player}
          catalog={game.catalog}
          onBack={() => game.go('hub')}
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
          onBack={() => game.go('hub')}
          onPurchaseSiteAccess={game.purchaseSiteAccess}
          onStartFieldOperation={game.startFieldOperation}
          onBuildLaunchpad={game.buildSettlementLaunchpad}
          onMined={game.recordSurfaceMined}
          onDispatch={game.dispatchSurfaceFerry}
          onRetry={game.retrySurfaceFerry}
          onReconcile={game.reconcileSurfaceFerry}
          onAcknowledge={game.acknowledgeSurfaceFerry}
        />
      )

    default:
      return null
  }
}
