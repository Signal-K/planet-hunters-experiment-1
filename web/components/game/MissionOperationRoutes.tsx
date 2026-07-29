'use client'

import type { useGame } from '@/game-context'
import type { Screen } from '@/lib/game-types'
import type { Target } from '@/lib/data'
import { rocketDisplayForConfig } from '@/lib/data'
import TransitScreen from '@/components/game/screens/TransitScreen'
import MiningScreen from '@/components/game/screens/MiningScreen'
import RoverMiningScreen from '@/components/game/screens/RoverMiningScreen'
import DebriefScreen from '@/components/game/screens/DebriefScreen'

type Game = ReturnType<typeof useGame>
type RocketDisplay = ReturnType<typeof rocketDisplayForConfig>
export type MissionOperationRoute = Extract<Screen, 'transit' | 'mining' | 'rover-mining' | 'debrief'>

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
            game.setPlayer(player => ({
              ...player,
              missionPhase: 'mining',
              roverMiningStartedAt: isRoverMission ? Date.now() : player.roverMiningStartedAt,
            }))
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
          initialCargo={game.player.miningCargoInProgress}
          onBack={(cargo) => {
            game.setPlayer(player => ({
              ...player,
              missionPhase: 'mining',
              miningCargoInProgress: Object.keys(cargo).length > 0 ? cargo : undefined,
            }))
            game.go('hub')
          }}
          onComplete={(cargo) => { game.completeStep(6); game.completeStep(7); game.onMiningDone(cargo) }}
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
        />
      )

    case 'rover-mining':
      if (!game.mission || !game.target) return null
      return (
        <RoverMiningScreen
          mission={game.mission}
          target={game.target}
          startedAt={game.player.roverMiningStartedAt}
          onComplete={game.onRoverMiningDone}
          onBack={() => {
            game.setPlayer(player => ({ ...player, missionPhase: 'mining' }))
            game.go('hub')
          }}
        />
      )

    case 'debrief':
      if (!game.mission || !game.target) return null
      return (
        <DebriefScreen
          mission={game.mission}
          target={debriefOriginTarget}
          cargo={game.lastCargo ?? {}}
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
          deliveryTargetName={deliveryTargetName}
          loanDebt={game.player.loanDebt}
        />
      )
  }
}
