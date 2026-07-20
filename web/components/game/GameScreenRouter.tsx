'use client'

import { useEffect, useState, useCallback } from 'react'
import { useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, M3_STEPS, rocketDisplayForConfig } from '@/lib/data'
import type { Screen } from '@/lib/game-types'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
import IntroScreen from '@/components/game/screens/IntroScreen'
import BuildPlaceScreen from '@/components/game/screens/BuildPlaceScreen'
import HubScreen from '@/components/game/screens/HubScreen'
import MissionBoardScreen from '@/components/game/screens/MissionBoardScreen'
import TargetPickerScreen from '@/components/game/screens/TargetPickerScreen'
import AssemblyScreen from '@/components/game/screens/AssemblyScreen'
import TransitScreen from '@/components/game/screens/TransitScreen'
import MiningScreen from '@/components/game/screens/MiningScreen'
import RoverMiningScreen from '@/components/game/screens/RoverMiningScreen'
import DebriefScreen from '@/components/game/screens/DebriefScreen'
import RefineryScreen from '@/components/game/screens/RefineryScreen'
import MarketScreen from '@/components/game/screens/MarketScreen'
import HangarScreen from '@/components/game/screens/HangarScreen'
import RocketPurchaseScreen from '@/components/game/screens/RocketPurchaseScreen'
import SkillTreeScreen from '@/components/game/screens/SkillTreeScreen'
import ScanStationScreen from '@/components/game/screens/ScanStationScreen'
import TessDiscoveryScreen from '@/components/game/screens/TessDiscoveryScreen'

export const VALID_SCREENS = new Set<Screen>([
  'intro', 'build', 'hub', 'missions', 'galaxy', 'targets', 'fab',
  'transit', 'mining', 'rover-mining', 'debrief', 'refinery',
  'market', 'hangar', 'rocket-buy', 'skills', 'scan-station',
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
  const coach = coachSteps.find(s => s.screen === screen && !game.doneSteps[s.id]) ?? null

  // Market is a Free Ops feature — a player without freeOperations landing
  // here directly (bookmarked URL, back/forward) shouldn't see a locked
  // screen render at all.
  useEffect(() => {
    if (screen === 'market' && !game.player.freeOperations) game.go('hub')
  }, [screen, game.player.freeOperations, game.go])

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
            game.setPlayer(player => ({
              ...player,
              francs: player.francs - (structure?.cost ?? 0),
              stash: Object.entries(structure?.costMaterials ?? {}).reduce((stash, [mineral, amount]) => ({
                ...stash,
                [mineral]: Math.max(0, (stash[mineral] ?? 0) - amount),
              }), { ...(player.stash ?? {}) }),
              placed: Array.from(new Set([...player.placed, kind])),
              placementPlots: { ...player.placementPlots, [kind]: plot },
              refineryBuilt: kind === 'refinery' ? true : player.refineryBuilt,
              scannerBuilt: kind === 'scan-station' ? true : player.scannerBuilt,
              satelliteMonitoringBuilt: kind === 'satellite-monitoring-station' ? true : player.satelliteMonitoringBuilt,
              satelliteMonitoringLevel: kind === 'satellite-monitoring-station' ? Math.max(1, player.satelliteMonitoringLevel ?? 1) : player.satelliteMonitoringLevel,
            }))
            game.completeStep(0)
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
            if (s === 'missions') { game.completeStep(1); game.go('missions'); return }
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
              game.completeStep(1)
              game.go('missions')
            }
          }}
          onUpgradeLaunchpad={() => game.upgradeLaunchpad()}
        />
      )

    case 'missions':
      return (
        <MissionBoardScreen
          onBack={() => game.go('hub')}
          onPick={game.onPickMission}
          missionsDone={game.player.missionsDone}
          freeOperations={game.player.freeOperations}
          hasCoach={hasCoach}
          catalog={game.catalog}
          contractorMissions={game.player.contractorMissions}
          contractorCooldowns={game.player.contractorCooldowns}
          dailyContractorPool={game.player.dailyContractorPool}
        />
      )

    case 'galaxy':
      return (
        <TessDiscoveryScreen
          player={game.player}
          onBack={() => game.go('hub')}
          onBuildStation={() => game.go('build')}
          onOpenMissions={() => game.go('missions')}
          onSubmit={game.submitTessClassification}
          onChooseTarget={game.chooseSatelliteTarget}
        />
      )

    case 'targets':
      if (!game.mission) return null
      return (
        <TargetPickerScreen
          mission={game.mission}
          onBack={() => game.go('missions')}
          onPick={game.onPickTarget}
          hasCoach={hasCoach}
          catalog={game.catalog}
        />
      )

    case 'rocket-buy': {
      if (!game.mission || !game.target) return null
      const deliveryTargetId = game.mission.deliveryTargetId
      const deliveryTargetName = deliveryTargetId ? game.catalog.targets.find(t => t.id === deliveryTargetId)?.name : null
      return (
        <RocketPurchaseScreen
          missionsDone={game.player.missionsDone}
          francs={game.player.francs}
          mission={game.mission}
          deliveryTargetName={deliveryTargetName}
          onPurchase={game.onPurchaseRocket}
          onBack={() => game.go(game.mission?.targetId ? 'missions' : 'targets')}
          hasCoach={hasCoach}
        />
      )
    }

    case 'fab':
      if (!game.mission || !game.target) return null
      return (
        <>
          <AssemblyScreen
            mission={game.mission}
            target={game.target}
            rocket={game.rocket}
            parts={game.catalog.parts}
            missionsDone={game.player.missionsDone}
            unlockedSkillNodes={game.player.unlockedSkillNodes ?? []}
            onLaunch={handleLaunch}
            onBack={() => game.go('rocket-buy')}
            hasCoach={hasCoach}
            coachManual={coach?.manual ?? false}
          />
          {launchPending && (
            <ErrorBoundary fallback={null} onError={handleLaunchComplete}>
              <LaunchSequenceCanvas
                rocketName={rocketDisplay.name}
                rocketImageSrc={rocketDisplay.img}
                targetName={game.target.name}
                onComplete={handleLaunchComplete}
              />
            </ErrorBoundary>
          )}
        </>
      )

    case 'transit':
      if (!transitTarget) return null
      return (
        <TransitScreen
          target={transitTarget}
          rocketImageSrc={rocketDisplay.img}
          arrivalAt={game.player.arrivalAt}
          returning={!!game.player.returningToEarth}
          isDelivery={!!game.player.headingToDelivery}
          cargo={game.lastCargo}
          minerals={game.catalog.minerals}
          onBack={() => game.go('hub')}
          onArrive={() => {
            if (game.player.returningToEarth) {
              game.onReturnArrived()
              return
            }
            if (game.player.headingToDelivery) {
              game.onDeliveryArrived()
              return
            }
            const isRoverMission = game.mission?.survey?.onWorldVehicle === 'starter-rover'
            if (game.mission?.payload?.type === 'satellite' || game.target?.type === 'exoplanet') {
              game.setPlayer(player => ({
                ...player,
                missionPhase: 'debrief',
                transitSatelliteLaunchedAt: game.mission?.payload?.type === 'satellite'
                  ? (player.transitSatelliteLaunchedAt ?? Date.now())
                  : player.transitSatelliteLaunchedAt,
                transitSatelliteLevel: game.mission?.payload?.type === 'satellite'
                  ? Math.max(1, player.transitSatelliteLevel ?? 1)
                  : player.transitSatelliteLevel,
              }))
              game.setLastCargo({})
              game.go('debrief')
              return
            }
            game.setPlayer(player => ({ ...player, missionPhase: 'mining' }))
            game.go(isRoverMission ? 'rover-mining' : 'mining')
          }}
          onAbandon={game.abandonMission}
        />
      )

    case 'mining':
      if (!game.mission || !game.target) return null
      return (
        <MiningScreen
          mission={game.mission}
          target={game.target}
          onBack={() => {
            game.setPlayer(player => ({ ...player, missionPhase: 'mining' }))
            game.go('hub')
          }}
          onComplete={(cargo) => { game.completeStep(6); game.completeStep(7); game.onMiningDone(cargo) }}
          minerals={game.catalog.minerals}
          laserChargeCap={game.laserChargeCap}
          laserTier={game.catalog.parts.drill.find(p => p.id === game.rocket.drill)?.tier ?? 1}
          hasCoach={hasCoach}
          coachManual={coach?.manual ?? false}
          onCoachDone={() => game.completeStep(6)}
          deliveryTargetName={deliveryTargetName}
          onAbandon={game.abandonMission}
          addToast={game.addToast}
          hasPriorFreeOpsExperience={
            Object.keys(game.player.contractorMissions ?? {}).length > 0
            || (game.player.dailyContractorPool?.completedIds.length ?? 0) > 0
          }
        />
      )

    case 'rover-mining':
      if (!game.mission || !game.target) return null
      return (
        <RoverMiningScreen
          mission={game.mission}
          target={game.target}
          onComplete={game.onRoverMiningDone}
          onBack={() => game.go('hub')}
        />
      )

    case 'debrief':
      if (!game.mission || !game.target) return null
      return (
        <DebriefScreen
          mission={game.mission}
          target={debriefOriginTarget ?? game.target}
          cargo={game.lastCargo ?? {}}
          onDone={game.onDebriefDone}
          minerals={game.catalog.minerals}
          contractors={game.catalog.contractors}
          contractorMissions={game.player.contractorMissions}
          freeOperations={game.player.freeOperations}
          annotations={game.player.researchAnnotations}
          missionsDone={game.player.missionsDone}
          hasCoach={hasCoach}
          shipDestroyed={!!game.player.shipDestroyed}
          rocket={game.rocket}
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
          contractorId={game.player.lastContractor}
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

    default:
      return null
  }
}
