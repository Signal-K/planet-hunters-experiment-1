'use client'

import type { useGame } from '@/game-context'
import type { Screen } from '@/lib/game-types'
import type { Target } from '@/lib/data'
import { isFreeHaulMission, isOwnProgramMission, rocketDisplayForConfig } from '@/lib/data'
import TransitScreen from '@/components/game/screens/TransitScreen'
import LandingScreen from '@/components/game/screens/LandingScreen'
import MiningScreen from '@/components/game/screens/MiningScreen'
import RoverMiningScreen from '@/components/game/screens/RoverMiningScreen'
import DeliveryScreen from '@/components/game/screens/DeliveryScreen'
import DebriefScreen from '@/components/game/screens/DebriefScreen'
import { earthStorageBuilt, hasOperationalRemoteSilo, storageCapacity, storedUnits, sellQuote } from '@/lib/systems/EconomySystem'
import { isFreeHaulEligibleMission } from '@/lib/data'

type Game = ReturnType<typeof useGame>
type RocketDisplay = ReturnType<typeof rocketDisplayForConfig>
export type MissionOperationRoute = Extract<Screen, 'transit' | 'landing' | 'mining' | 'rover-mining' | 'delivery' | 'debrief'>

interface MissionOperationRoutesProps {
  screen: MissionOperationRoute
  game: Game
  hasCoach: boolean
  coachManual: boolean
  transitTarget: Target
  debriefOriginTarget: Target
  deliveryTargetName?: string
  rocketDisplay: RocketDisplay
}

export default function MissionOperationRoutes({
  screen,
  game,
  hasCoach,
  coachManual,
  transitTarget,
  debriefOriginTarget,
  deliveryTargetName,
  rocketDisplay,
}: MissionOperationRoutesProps) {
  const debriefCargo = game.deliveredCargo ?? game.lastCargo ?? {}
  const debriefIsFreeHaul = game.mission ? isFreeHaulMission(game.mission, debriefCargo) && !game.player.cargoSettledOffworld : false

  switch (screen) {
    case 'transit':
      return (
        <TransitScreen
          target={transitTarget}
          rocketImageSrc={rocketDisplay.img}
          arrivalAt={game.player.arrivalAt}
          transitStartedAt={game.player.transitStartedAt}
          returning={!!game.player.returningToEarth}
          isDelivery={!!game.player.headingToDelivery}
          cargo={game.lastCargo}
          minerals={game.catalog.minerals}
          mission={game.mission}
          client={game.mission?.client ? game.catalog.clients[game.mission.client] ?? null : null}
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
            const hasLander = !isRoverMission && !!game.player.shipCustomizerParts?.lander
            const isTutorialDelivery = game.player.missionsDone === 2 && !!game.mission?.deliveryTargetId
            if (game.mission?.payload?.type === 'satellite' || game.mission?.payload?.type === 'deep-space-survey' || game.mission?.payload?.type === 'scan-station-commission' || game.target?.type === 'exoplanet') {
              game.setPlayer(player => ({
                ...player,
                missionPhase: 'debrief',
                transitSatelliteLaunchedAt: game.mission?.payload?.type === 'satellite'
                  ? (player.transitSatelliteLaunchedAt ?? Date.now())
                  : player.transitSatelliteLaunchedAt,
                transitSatelliteLevel: game.mission?.payload?.type === 'satellite'
                  ? Math.max(1, player.transitSatelliteLevel ?? 1)
                  : player.transitSatelliteLevel,
                deepSpaceTelescopeMissionCompletedAt: game.mission?.payload?.type === 'deep-space-survey'
                  ? (player.deepSpaceTelescopeMissionCompletedAt ?? Date.now())
                  : player.deepSpaceTelescopeMissionCompletedAt,
                scanStationMissionCompletedAt: game.mission?.payload?.type === 'scan-station-commission'
                  ? (player.scanStationMissionCompletedAt ?? Date.now())
                  : player.scanStationMissionCompletedAt,
              }))
              game.setLastCargo({})
              game.go('debrief')
              return
            }
            if (hasLander) {
              game.setPlayer(player => ({
                ...player,
                missionPhase: 'landing',
                landingStartedAt: Date.now(),
              }))
              game.go('landing')
              return
            }
            if (isTutorialDelivery) {
              game.setPlayer(player => ({
                ...player,
                missionPhase: 'landing',
                landingStartedAt: Date.now(),
              }))
              game.go('landing')
              return
            }
            game.setPlayer(player => ({
              ...player,
              missionPhase: 'mining',
              // A rover mission starts with a scouting observation. Its clock
              // begins only after the player turns that observation into a
              // deposit lead, so the result is gameplay rather than flavour.
              roverMiningStartedAt: isRoverMission ? undefined : player.roverMiningStartedAt,
            }))
            game.go(isRoverMission ? 'rover-mining' : 'mining')
          }}
          onAbandon={game.abandonMission}
        />
      )

    case 'landing': {
      if (!game.mission || !game.target) return null
      const mode = game.player.landingReturnStartedAt ? 'ascend' : 'descend'
      return (
        <LandingScreen
          target={game.target}
          mode={mode}
          startedAt={mode === 'ascend' ? game.player.landingReturnStartedAt : game.player.landingStartedAt}
          onBack={() => game.go('hub')}
          onContinue={() => {
            if (mode === 'descend') {
              if (game.player.missionsDone === 2 && !!game.mission?.deliveryTargetId) {
                game.setPlayer(player => ({
                  ...player,
                  missionPhase: 'mining',
                  landingStartedAt: undefined,
                  hasLanded: true,
                }))
                game.go('rover-mining')
              } else {
                game.onLandingTouchdown()
              }
              return
            }
            game.onRedockComplete(game.player.miningCargoInProgress ?? {}, game.player.pendingRemoteDisposition)
          }}
        />
      )
    }

    case 'mining':
      if (!game.mission || !game.target) return null
      return (
        <MiningScreen
          mission={game.mission}
          target={game.target}
          rocketImageSrc={rocketDisplay.img}
          initialCargo={game.player.miningCargoInProgress}
          onBack={(cargo) => {
            game.setPlayer(player => ({
              ...player,
              missionPhase: 'mining',
              miningCargoInProgress: Object.keys(cargo).length > 0 ? cargo : undefined,
            }))
            game.go('hub')
          }}
          onComplete={(cargo, remoteDisposition, earthDisposition) => {
            game.completeStep(6)
            game.completeStep(7)
            if (game.player.shipCustomizerParts?.lander) {
              game.setPlayer(player => ({
                ...player,
                missionPhase: 'landing',
                landingReturnStartedAt: Date.now(),
                miningCargoInProgress: cargo,
                pendingRemoteDisposition: remoteDisposition,
                freeHaulDisposition: earthDisposition ?? player.freeHaulDisposition,
              }))
              game.go('landing')
              return
            }
            if (earthDisposition) game.setPlayer(player => ({ ...player, freeHaulDisposition: earthDisposition }))
            game.onMiningDone(cargo, remoteDisposition)
          }}
          minerals={game.catalog.minerals}
          laserChargeCap={game.laserChargeCap}
          laserTier={game.catalog.parts.drill.find(p => p.id === game.rocket.drill)?.tier ?? 1}
          hasCoach={hasCoach}
          coachManual={coachManual}
          onCoachDone={() => game.completeStep(6)}
          deliveryTargetName={deliveryTargetName}
          onAbandon={game.abandonMission}
          addToast={game.addToast}
          hasPriorFreeOpsExperience={
            Object.keys(game.player.clientMissions ?? {}).length > 0
            || (game.player.dailyClientPool?.completedIds.length ?? 0) > 0
          }
          remoteSiloAvailable={!!game.mission && isOwnProgramMission(game.mission) && !game.mission.deliveryTargetId && !game.mission.construction && hasOperationalRemoteSilo(game.player, game.target.id)}
          remoteSiloUsed={storedUnits(game.player.remoteStorage?.[game.target.id])}
          // KES-283: gate a self-directed run on a storage destination before
          // mining starts, unless one was already chosen before a prior
          // back-to-hub pause on this same mission.
          isFreeHaulEligible={isFreeHaulEligibleMission(game.mission)}
          hasEarthStorage={earthStorageBuilt(game.player)}
          initialEarthDisposition={game.player.freeHaulDisposition}
        />
      )

    case 'rover-mining': {
      if (!game.mission || !game.target) return null
      const roverTarget = game.target
      return (
        <RoverMiningScreen
          mission={game.mission}
          target={roverTarget}
          onComplete={(cargo) => {
            if (game.player.missionsDone === 2 && game.mission?.deliveryTargetId) {
              game.setPlayer(player => ({
                ...player,
                missionPhase: 'landing',
                landingReturnStartedAt: Date.now(),
                miningCargoInProgress: cargo,
              }))
              game.go('landing')
              return
            }
            game.onRoverMiningDone(cargo)
          }}
          onBack={() => {
            game.setPlayer(player => ({ ...player, missionPhase: 'mining' }))
            game.go('hub')
          }}
        />
      )
    }

    case 'delivery':
      if (!game.mission || !game.deliveryTargetId) return null
      return (
        <DeliveryScreen
          target={transitTarget}
          mission={game.mission}
          cargo={game.lastCargo ?? {}}
          minerals={game.catalog.minerals}
          startedAt={game.player.deliveryUnloadStartedAt}
          onBack={() => game.go('hub')}
          onComplete={game.onDeliveryUnloadComplete}
          clientName={game.mission.client ? game.catalog.clients[game.mission.client]?.name : undefined}
          useTakeonDropoff={game.player.missionsDone === 2}
        />
      )

    case 'debrief':
      if (!game.mission || !game.target) return null
      return (
        <DebriefScreen
          mission={game.mission}
          target={debriefOriginTarget}
          cargo={debriefCargo}
          onDone={game.onDebriefDone}
          minerals={game.catalog.minerals}
          clients={game.catalog.clients}
          clientMissions={game.player.clientMissions}
          freeOperations={game.player.freeOperations}
          annotations={game.player.researchAnnotations}
          missionsDone={game.player.missionsDone}
          hasCoach={hasCoach}
          shipDestroyed={!!game.player.shipDestroyed}
          rocket={game.rocket}
          rocketSource={game.player.missionRocketSource}
          deliveryTargetName={deliveryTargetName}
          loanDebt={game.player.loanDebt}
          firstCrewArrival={
            (game.player.missionCrewIds?.length ?? 0) > 0
            && !!game.target
            && !(game.player.crewVisitedTargets ?? []).includes(game.target.id)
          }
          hasEarthStorage={earthStorageBuilt(game.player)}
          storageCapacity={storageCapacity(game.player)}
          storageUsed={storedUnits(game.player.stash)}
          haulMarketValue={sellQuote(debriefCargo, game.player, debriefIsFreeHaul ? undefined : game.player.lastClient)}
          initialDisposition={game.player.freeHaulDisposition}
        />
      )
  }
}
