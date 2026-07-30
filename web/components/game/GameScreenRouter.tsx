'use client'

import { useEffect, useState, useCallback } from 'react'
import { useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, M3_STEPS, rocketDisplayForConfig } from '@/lib/data'
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
import SurfaceOpsScreen from '@/components/game/screens/SurfaceOpsScreen'
import { enqueueSurvey } from '@/lib/surveys'

export const VALID_SCREENS = new Set<Screen>([
  'intro', 'build', 'hub', 'missions', 'galaxy', 'targets', 'fab',
  'transit', 'mining', 'rover-mining', 'debrief', 'refinery',
  'market', 'hangar', 'rocket-buy', 'skills', 'scan-station',
  'launchpad',
  'surface-ops',
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
  /** Overrides HangarScreen's onBack; falls back to game.go('hub'). */
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
  const coachSteps = !game.tutorial ? [] :
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
    if (screen === 'surface-ops' && !game.player.freeOperations) game.go('hub')
    // The Build tab is a Free Ops entry point. Keep the onboarding assembly
    // flow reachable only when it has a real mission context; a bare/deep
    // linked fab route must never show a prefilled rocket.
    if (screen === 'fab' && !game.player.freeOperations && (!game.mission || !game.target)) game.go('hub')
  }, [screen, game.player.freeOperations, game.mission, game.target, game.go])

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
            placementPlots: game.player.placementPlots,
          }}
          onPlaced={(kind, plot) => {
            const structure = game.catalog.structures.find(s => s.id === kind)
            game.placeStructure(structure, kind, plot)
            game.completeStep(0)
            enqueueSurvey('lnm_base_building', 1200)
            game.go('hub')
          }}
        />
      )

    case 'hub':
      return (
        <HubScreen
          player={game.player}
          hasCoach={hasCoach}
          onNav={s => {
            if (s === 'missions') { game.goToMissions(); return }
            game.go(s)
          }}
          onGoBuilding={building => {
            if (building === 'build') return game.go('build')
            if (building === 'refinery') return game.go('refinery')
            if (building === 'hangar') return game.go('hangar')
            if (building === 'skills') return game.go('skills')
            if (building === 'scan-station') return game.go('scan-station')
            if (building === 'satellite-monitoring-station') return game.go('galaxy')
            if (building === 'launchpad' || building === 'missions') {
              // A run in flight always wins — the pad is how you get back to it.
              if (game.player.activeMission) {
                enqueueSurvey('lnm_resume_mission', 1200)
                return game.go(game.player.missionPhase ?? 'transit')
              }
              if (game.player.pendingLaunch) return game.go('fab')
              // Tapping the launchpad opens the player's own program first;
              // client contracts are one press further in. During onboarding it
              // still goes straight to the board: M1/M2 are a coached sequence
              // that names the Mission Board as the next step, and the player
              // owns nothing of their own to launch yet.
              if (building === 'launchpad' && game.player.freeOperations) return game.go('launchpad')
              game.goToMissions()
            }
          }}
          onUpgradeLaunchpad={() => game.upgradeLaunchpad()}
        />
      )

    case 'galaxy':
      return (
        <TessDiscoveryScreen
          player={game.player}
          onBack={() => game.go('hub')}
          onBuildStation={() => game.go('build')}
          onOpenProgram={() => game.go('launchpad')}
          onSubmit={game.submitTessClassification}
          onChooseTarget={game.chooseSatelliteTarget}
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
    case 'mining':
    case 'rover-mining':
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
          francs={game.player.francs}
          onSell={game.sellMinerals}
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
          onConfirmShipCustomizerBuild={game.confirmShipCustomizerBuild}
          onBack={onBackFromHangar ?? (() => game.go('hub'))}
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
      return (
        <LaunchpadScreen
          onBack={() => game.go('hub')}
          onPick={game.onPickMission}
          onViewContracts={() => game.goToMissions()}
          missionsDone={game.player.missionsDone}
          freeOperations={game.player.freeOperations}
          catalog={game.catalog}
          francs={game.player.francs}
        />
      )

    case 'surface-ops':
      return (
        <SurfaceOpsScreen
          player={game.player}
          onBack={() => game.go('hub')}
          onPurchaseRights={game.purchaseTerrainRights}
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
