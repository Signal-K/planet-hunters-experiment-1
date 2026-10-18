'use client'

import { useEffect, useRef, useState } from 'react'
import type { useGame } from '@/game-context'
import type { Screen } from '@/lib/game-types'
import { ACADEMY_INTRO_MISSION_ID, isOwnProgramMission, rocketDisplayForConfig, rocketModelForConfig, validateBuild } from '@/lib/data'
import { crewRequirementStatus } from '@/lib/systems/AcademySystem'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import FreeOpsBuildScreen from '@/components/game/screens/FreeOpsBuildScreen'
import LaunchpadScreen from '@/components/game/screens/LaunchpadScreen'
import { ROLLOUT_MS } from '@/components/game/screens/RocketBuilderScene'
import MissionBoard from '@/components/game/MissionBoard'
import MissionPlanStrip from '@/components/game/MissionPlanStrip'
import styles from './MissionSetupRoutes.module.css'

type Game = ReturnType<typeof useGame>
type RocketDisplay = ReturnType<typeof rocketDisplayForConfig>
export type MissionSetupRoute = Extract<Screen, 'missions' | 'targets' | 'rocket-buy' | 'fab'>

interface MissionSetupRoutesProps {
  screen: MissionSetupRoute
  game: Game
  rocketDisplay: RocketDisplay
  launchPending: boolean
  onTransferToLaunchpad: () => void
  onLaunch: () => void
  onLaunchComplete: () => void
}

export default function MissionSetupRoutes({ screen, game, rocketDisplay, launchPending, onTransferToLaunchpad, onLaunch, onLaunchComplete }: MissionSetupRoutesProps) {
  const relay = useMissionRelayModels({ catalog: game.catalog, missionsDone: game.player.missionsDone, freeOperations: game.player.freeOperations, francs: game.player.francs, crew: game.player.crew, player: game.player, sceneScope: game.sceneScope })
  const selectedVehicle = game.player.stagedRockets?.find(vehicle => vehicle.id === game.player.selectedStagedRocketId)
  // SSL-375: the rocket stands in the Workshop while it is prepared, then rolls to the pad in-scene on confirm.
  const [rolling, setRolling] = useState<string | null>(null)
  const purchaseRef = useRef(game.onPurchaseRocket)
  purchaseRef.current = game.onPurchaseRocket
  useEffect(() => {
    if (!rolling) return
    const timer = window.setTimeout(() => { purchaseRef.current(rolling); setRolling(null) }, ROLLOUT_MS)
    return () => window.clearTimeout(timer)
  }, [rolling])

  // Older saves may still hold a prepared vehicle in the hangar. The R1 route
  // never asks for a second confirmation: roll it onto the pad on mount.
  useEffect(() => {
    if (screen === 'fab' && game.mission && game.target && selectedVehicle?.location === 'hangar') onTransferToLaunchpad()
  }, [game.mission, game.target, onTransferToLaunchpad, screen, selectedVehicle?.location])

  if (screen === 'fab' && (!game.mission || !game.target)) return <FreeOpsBuildScreen onBack={() => game.goBack()} onMissions={() => game.go('missions')} onInfrastructure={() => game.go('build')} />

  if (screen === 'missions') {
    return <MissionBoard
      catalog={game.catalog}
      player={game.player}
      cards={relay.cardModels}
      selectedIndex={relay.selectedIndex}
      onSelectRelative={relay.selectRelativeSignal}
      onSelectMission={relay.selectSignal}
      onAccept={(id, disposition) => id === ACADEMY_INTRO_MISSION_ID ? game.go('academy') : game.onPickMission(id, disposition)}
      onClose={() => game.goBack()}
      onOpenLog={() => game.go('mission-history')}
      onOpenBuild={() => game.go('build')}
      onOpenEvent={screen => game.go(screen)}
      onPickTarget={game.onPickTarget}
      rocketImg={rocketDisplayForConfig(game.rocket).img}
      tutorialBlocked={relay.tutorialMissionInProgress}
      onboardingComplete={relay.onboardingComplete}
    />
  }

  if (!game.mission || !game.target) return null
  const target = game.target
  const selectedRocket = rocketModelForConfig(game.rocket)
  const crewStatus = crewRequirementStatus(game.mission.requires.crew, game.player.crew ?? [])
  const launchReady = validateBuild({ mission: game.mission, target, rocket: game.rocket, parts: game.catalog.parts, unlockedSkillNodes: game.player.unlockedSkillNodes ?? [] }).ok && (!game.mission.requires.crew || crewStatus.met)
  const preparing = !selectedVehicle || selectedVehicle.location !== 'launchpad'
  const ownProgram = isOwnProgramMission(game.mission)

  return (
    <div data-testid="mission-launch-review" className={styles.builderHost}>
      <MissionPlanStrip game={game} launched={launchPending} blockedReason={launchReady ? null : (validateBuild({ mission: game.mission, target, rocket: game.rocket, parts: game.catalog.parts, unlockedSkillNodes: game.player.unlockedSkillNodes ?? [] }).problems[0] ?? crewStatus.reason ?? 'Mission requirements not met')} />
      <LaunchpadScreen
        onBack={() => game.go(ownProgram ? 'launchpad' : 'missions')}
        onPick={game.onPickMission}
        onViewContracts={() => game.go('missions')}
        onLaunchpadAction={() => game.go('fab')}
        onOpenHangar={() => game.go('hangar')}
        missionsDone={game.player.missionsDone}
        freeOperations={game.player.freeOperations}
        catalog={game.catalog}
        player={game.player}
        rocketImageSrc={rocketDisplay.img}
        selectedRocketName={rocketDisplay.name}
        francs={game.player.francs}
        hydrated={game.hydrated}
        mission={{ title: game.mission.title }}
        target={target}
        rocket={game.rocket}
        helpScreen={screen}
        assembly={rolling ? 'building' : preparing ? 'design' : 'ready'}
        launchTestId={preparing ? 'prepare-launch-btn' : 'launch-btn'}
        launchDisabled={!!rolling || selectedVehicle?.location === 'hangar' || (!preparing && !launchReady)}
        onInstallLoadout={(next, prev) => game.confirmShipCustomizerBuild(next, prev)}
        onRequestLaunch={() => { if (preparing) setRolling(selectedRocket.id); else onLaunch() }}
        launching={launchPending}
        onLaunchComplete={onLaunchComplete}
      />
    </div>
  )
}
