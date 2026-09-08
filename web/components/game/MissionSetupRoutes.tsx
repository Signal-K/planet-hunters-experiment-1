'use client'

import type { useGame } from '@/game-context'
import type { Screen } from '@/lib/game-types'
import { rocketDisplayForConfig } from '@/lib/data'
import { earthStorageBuilt } from '@/lib/systems/EconomySystem'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
import MissionBoardScreen from '@/components/game/screens/MissionBoardScreen'
import TargetPickerScreen from '@/components/game/screens/TargetPickerScreen'
import AssemblyScreen from '@/components/game/screens/AssemblyScreen'
import RocketPurchaseScreen from '@/components/game/screens/RocketPurchaseScreen'
import FreeOpsBuildScreen from '@/components/game/screens/FreeOpsBuildScreen'
import MissionSetupShell from '@/components/game/screens/MissionSetupShell'
import MissionSceneBackdrop from '@/components/game/screens/MissionSceneBackdrop'

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
  if (screen === 'fab' && (!game.mission || !game.target)) {
    return (
      <FreeOpsBuildScreen
        onBack={() => game.goBack()}
        onMissions={() => game.go('missions')}
        onInfrastructure={() => game.go('build')}
      />
    )
  }

  let className: string
  let eyebrow: string
  let title: string
  let onBack: () => void
  let levelBadge: string | undefined
  let francs: number | undefined
  let step: React.ReactNode

  switch (screen) {
    case 'missions': {
      className = 'mission-setup-screen--mission'
      eyebrow = `LAUNCHPAD · ${game.player.freeOperations ? `${game.sceneScope.label.toUpperCase()} · FREE OPS` : `${game.sceneScope.label.toUpperCase()} · L${game.player.missionsDone + 1}`}`
      title = 'Mission Dispatch'
      onBack = () => game.goBack()
      levelBadge = `LV. ${game.player.missionsDone + 1}`
      francs = game.player.francs
      step = (
        <MissionBoardScreen
          onBack={onBack}
          onPick={game.onPickMission}
          missionsDone={game.player.missionsDone}
          freeOperations={game.player.freeOperations}
          hasCoach={hasCoach}
          catalog={game.catalog}
          clientMissions={game.player.clientMissions}
          clientCooldowns={game.player.clientCooldowns}
          dailyClientPool={game.player.dailyClientPool}
          francs={game.player.francs}
          crew={game.player.crew}
          player={game.player}
          sceneScope={game.sceneScope}
        />
      )
      break
    }

    case 'targets': {
      if (!game.mission) return null
      className = 'mission-setup-screen--target'
      eyebrow = game.mission.title.toUpperCase()
      title = 'Pick Target'
      onBack = () => game.go('missions')
      step = (
        <TargetPickerScreen
          mission={game.mission}
          onPick={game.onPickTarget}
          hasCoach={hasCoach}
          catalog={game.catalog}
          missionsDone={game.player.missionsDone}
          launchpadUpgraded={game.player.launchpadUpgraded}
          unlockedSkillNodes={game.player.unlockedSkillNodes ?? []}
        />
      )
      break
    }

    case 'rocket-buy': {
      if (!game.mission || !game.target) return null
      className = 'mission-setup-screen--rocket'
      eyebrow = 'LAUNCHPAD · VEHICLE'
      title = 'Select Rocket'
      onBack = () => game.goBack()
      step = (
        <RocketPurchaseScreen
          missionsDone={game.player.missionsDone}
          francs={game.player.francs}
          mission={game.mission}
          deliveryTargetName={deliveryTargetName}
          onPurchase={game.onPurchaseRocket}
          onFabricatePart={game.onFabricateRocketPart}
          onAssembleFabricatedRocket={game.onAssembleFabricatedRocket}
          siloOnline={earthStorageBuilt(game.player)}
          stash={game.player.stash ?? {}}
          fabricatedParts={game.player.fabricatedRocketParts ?? {}}
          onBack={onBack}
          hasCoach={hasCoach}
        />
      )
      break
    }

    case 'fab': {
      if (!game.mission || !game.target) return null
      className = 'mission-setup-screen--assembly'
      eyebrow = 'LAUNCHPAD · PREFLIGHT'
      title = 'Confirm Rocket'
      onBack = () => game.goBack('rocket-buy')
      step = (
        <AssemblyScreen
          mission={game.mission}
          target={game.target}
          rocket={game.rocket}
          parts={game.catalog.parts}
          missionsDone={game.player.missionsDone}
          unlockedSkillNodes={game.player.unlockedSkillNodes ?? []}
          onLaunch={onLaunch}
          hasCoach={hasCoach}
          coachManual={coachManual}
          deliveryTargetName={deliveryTargetName}
          crew={game.player.crew}
          crewModuleFitted={game.player.shipCustomizerParts?.['crew-module'] === 'crew-quarters-t1'}
        />
      )
      break
    }
  }

  return (
    <>
      <MissionSetupShell
        className={className}
        eyebrow={eyebrow}
        title={title}
        onBack={onBack}
        hasCoach={hasCoach}
        coachManual={coachManual}
        levelBadge={levelBadge}
        francs={francs}
        sceneBackground={<MissionSceneBackdrop composition="earth-base-pad" />}
      >
        {step}
      </MissionSetupShell>
      {screen === 'fab' && launchPending && game.target && (
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
