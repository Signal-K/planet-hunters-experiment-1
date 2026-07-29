'use client'

import type { useGame } from '@/game-context'
import type { Screen } from '@/lib/game-types'
import { rocketDisplayForConfig } from '@/lib/data'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
import MissionBoardScreen from '@/components/game/screens/MissionBoardScreen'
import TargetPickerScreen from '@/components/game/screens/TargetPickerScreen'
import AssemblyScreen from '@/components/game/screens/AssemblyScreen'
import RocketPurchaseScreen from '@/components/game/screens/RocketPurchaseScreen'
import FreeOpsBuildScreen from '@/components/game/screens/FreeOpsBuildScreen'

type Game = ReturnType<typeof useGame>
type RocketDisplay = ReturnType<typeof rocketDisplayForConfig>
export type MissionSetupRoute = Extract<Screen, 'missions' | 'targets' | 'rocket-buy' | 'fab'>

interface MissionSetupRoutesProps {
  screen: MissionSetupRoute
  game: Game
  hasCoach: boolean
  coachManual: boolean
  deliveryTargetName?: string
  rocketDisplay: RocketDisplay
  launchPending: boolean
  onLaunch: () => void
  onLaunchComplete: () => void
}

export default function MissionSetupRoutes({
  screen,
  game,
  hasCoach,
  coachManual,
  deliveryTargetName,
  rocketDisplay,
  launchPending,
  onLaunch,
  onLaunchComplete,
}: MissionSetupRoutesProps) {
  switch (screen) {
    case 'missions':
      return (
        <MissionBoardScreen
          onBack={() => game.go('hub')}
          onPick={game.onPickMission}
          missionsDone={game.player.missionsDone}
          freeOperations={game.player.freeOperations}
          hasCoach={hasCoach}
          catalog={game.catalog}
          clientMissions={game.player.clientMissions}
          clientCooldowns={game.player.clientCooldowns}
          dailyClientPool={game.player.dailyClientPool}
          francs={game.player.francs}
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

    case 'rocket-buy':
      if (!game.mission || !game.target) return null
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

    case 'fab':
      if (!game.mission || !game.target) {
        return (
          <FreeOpsBuildScreen
            onBack={() => game.go('hub')}
            onMissions={() => game.go('missions')}
            onInfrastructure={() => game.go('build')}
          />
        )
      }
      return (
        <>
          <AssemblyScreen
            mission={game.mission}
            target={game.target}
            rocket={game.rocket}
            parts={game.catalog.parts}
            missionsDone={game.player.missionsDone}
            unlockedSkillNodes={game.player.unlockedSkillNodes ?? []}
            onLaunch={onLaunch}
            onBack={() => game.go('rocket-buy')}
            hasCoach={hasCoach}
            coachManual={coachManual}
            deliveryTargetName={deliveryTargetName}
          />
          {launchPending && (
            <ErrorBoundary fallback={null} onError={onLaunchComplete}>
              <LaunchSequenceCanvas
                rocketName={rocketDisplay.name}
                rocketImageSrc={rocketDisplay.img}
                targetName={game.target.name}
                onComplete={onLaunchComplete}
              />
            </ErrorBoundary>
          )}
        </>
      )
  }
}
