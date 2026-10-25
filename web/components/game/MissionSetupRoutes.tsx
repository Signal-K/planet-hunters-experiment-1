'use client'

import { useEffect, useRef, useState } from 'react'
import type { useGame } from '@/game-context'
import type { Screen } from '@/lib/game-types'
import { asLoadout, loadoutBonuses } from '@/lib/launchpad/rocketBuilder'
import { isOwnProgramMission, rocketDisplayForConfig, rocketModelForConfig, validateBuild } from '@/lib/data'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
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
  const relay = useMissionRelayModels({ catalog: game.catalog, missionsDone: game.player.missionsDone, freeOperations: game.player.freeOperations, francs: game.player.francs, player: game.player, sceneScope: game.sceneScope })
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

  // Free Ops has no setup screen of its own: with no mission picked, the launch route sends the player to the Mission Board,
  // where own-program work and client contracts share the same launch review.
  const goMissions = game.go
  const noSetup = screen === 'fab' && (!game.mission || !game.target)
  useEffect(() => { if (noSetup) goMissions('missions') }, [noSetup, goMissions])

  if (screen === 'fab' && (!game.mission || !game.target)) return null

  if (screen === 'missions') {
    return <MissionBoard
      catalog={game.catalog}
      player={game.player}
      cards={relay.cardModels}
      selectedIndex={relay.selectedIndex}
      onSelectRelative={relay.selectRelativeSignal}
      onSelectMission={relay.selectSignal}
      onAccept={(id, disposition) => game.onPickMission(id, disposition)}
      onClose={() => game.goBack()}
      onOpenLog={() => game.go('mission-history')}
      onOpenBuild={() => game.go('build')}
      onOpenEvent={screen => game.go(screen)}
      onPickTarget={game.onPickTarget}
      onRedeemFragments={game.onRedeemFragments}
      onCombineFragments={game.onCombineFragments}
      rocketImg={rocketDisplayForConfig(game.rocket).img}
      tutorialBlocked={relay.tutorialMissionInProgress}
      onboardingComplete={relay.onboardingComplete}
    />
  }

  if (!game.mission || !game.target) return null
  const target = game.target
  const selectedRocket = rocketModelForConfig(game.rocket)
  const launchReady = validateBuild({ mission: game.mission, target, rocket: game.rocket, parts: game.catalog.parts, loadoutBonus: loadoutBonuses(asLoadout(game.player.shipCustomizerParts)) }).ok
  const preparing = !selectedVehicle || selectedVehicle.location !== 'launchpad'
  const ownProgram = isOwnProgramMission(game.mission)

  return (
    <div data-testid="mission-launch-review" className={styles.builderHost}>
      <MissionPlanStrip game={game} launched={launchPending} blockedReason={launchReady ? null : (validateBuild({ mission: game.mission, target, rocket: game.rocket, parts: game.catalog.parts, loadoutBonus: loadoutBonuses(asLoadout(game.player.shipCustomizerParts)) }).problems[0] ?? 'Mission requirements not met')} />
      <LaunchpadScreen
        onBack={() => game.go(ownProgram ? 'launchpad' : 'missions')}
        onPick={game.onPickMission}
        onViewContracts={() => game.go('missions')}
        onLaunchpadAction={() => game.go('fab')}
        missionsDone={game.player.missionsDone}
        freeOperations={game.player.freeOperations}
        catalog={game.catalog}
        player={game.player}
        rocketImageSrc={rocketDisplay.img}
        selectedRocketName={rocketDisplay.name}
        hydrated={game.hydrated}
        mission={{ title: game.mission.title, payload: game.mission.payload }}
        target={target}
        rocket={game.rocket}
        hasStagedRocket={selectedVehicle?.location === 'launchpad'}
        onDismantle={() => game.onDismantleStagedRocket()}
        assembly={rolling ? 'building' : preparing ? 'design' : 'ready'}
        launchTestId={preparing ? 'prepare-launch-btn' : 'launch-btn'}
        launchDisabled={!!rolling || !selectedVehicle || selectedVehicle.location === 'hangar' || (!preparing && !launchReady)}
        onInstallLoadout={(next, prev) => game.confirmShipCustomizerBuild(next, prev)}
        earthBiome={game.player.earthBiome}
        onRequestLaunch={() => { if (preparing) setRolling(selectedRocket.id); else onLaunch() }}
        launching={launchPending}
        onLaunchComplete={onLaunchComplete}
      />
    </div>
  )
}
