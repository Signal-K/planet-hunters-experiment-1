'use client'

import { planQuote } from '@/lib/mission-planner'
import { buildingLevel, padNeedsService } from '@/lib/data/building-levels'
import { communityBonusRate } from '@/lib/research/marketplace'
import { useEffect } from 'react'
import type { useGame } from '@/game-context'
import type { Screen } from '@/lib/game-types'
import { asLoadout, loadoutBonuses } from '@/lib/launchpad/rocketBuilder'
import { ROCKET_MODELS, buildHoldLine, rocketDisplayForConfig, validateBuild } from '@/lib/data'
import { useMissionRelayModels } from '@/lib/hooks/useMissionRelayModels'
import LaunchpadScreen from '@/components/game/screens/LaunchpadScreen'
import MissionBoard from '@/components/game/MissionBoard'
import LaunchReviewPanel from '@/components/game/LaunchReviewPanel'
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
  const prepareAgencyRocket = game.prepareAgencyRocket
  useEffect(() => {
    if (screen === 'rocket-buy' || (screen === 'fab' && !selectedVehicle)) prepareAgencyRocket()
  }, [screen, selectedVehicle, prepareAgencyRocket])

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
      onOpenPlanner={() => game.go('mission-planner')}
      onOpenLog={() => game.go('mission-history')}
      onOpenBuild={() => game.go('hub')}
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
  const preparing = !selectedVehicle || selectedVehicle.location !== 'launchpad'
  // SSL-750: check the rocket that would actually fly. A vehicle left on the pad from another contract keeps its own
  // parts, so the job is checked against it, not against the design the builder would make for this job.
  const flyingRocket = selectedVehicle?.rocket ?? game.rocket
  const check = validateBuild({ mission: game.mission, target, rocket: flyingRocket, parts: game.catalog.parts, loadoutBonus: loadoutBonuses(asLoadout(game.player.shipCustomizerParts)), fuelFraction: communityBonusRate(game.player).fuel, launchpadLevel: buildingLevel(game.player, 'launchpad') })
  const padWorn = padNeedsService(game.player)
  const customHold = game.mission.customPlan ? planQuote(game.mission.customPlan, game.player, game.catalog).issues[0] : undefined
  const launchReady = check.ok && !padWorn && !customHold
  const vehicleName = selectedVehicle ? ROCKET_MODELS.find(model => model.id === selectedVehicle.rocketId)?.name : null
  const hold = check.holds?.[0]
  const blockedReason = launchReady ? null : customHold ? customHold : padWorn ? 'The launchpad needs service. Tap it on the Base.' : hold ? buildHoldLine(hold, vehicleName) : (check.problems[0] ?? 'Mission requirements not met')
  // Nothing is built or launched that cannot do the job (Liam, 02.11).
  // SSL-842: Launch stays on screen through the lift-off; a second tap must not launch again.
  const actionDisabled = launchPending || !selectedVehicle || selectedVehicle.location === 'hangar' || !launchReady
  const actionLabel = !launchReady ? "Can't launch" : preparing ? 'Preparing rocket' : 'Launch'

  return (
    <div data-testid="mission-launch-review" className={styles.builderHost}>
      {/* The plan is settled once the engines light: the strip leaves the sky clear for the ascent. */}
      {!launchPending && <LaunchReviewPanel
        game={game}
        launched={launchPending}
        blockedReason={blockedReason}
        primaryLabel={actionLabel}
        primaryDisabled={actionDisabled}
        primaryAction={onLaunch}
      />}
      <LaunchpadScreen
        onBack={() => game.go('missions')}
        review
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
        rocket={flyingRocket}
        hasStagedRocket={selectedVehicle?.location === 'launchpad'}
        assembly={preparing ? 'design' : 'ready'}
        launchTestId={preparing ? 'prepare-launch-btn' : 'launch-btn'}
        launchDisabled={actionDisabled}
        launchLabel={actionLabel}
        cargoNeed={game.mission.requires.cargo_min}
        earthBiome={game.player.earthBiome}
        onRequestLaunch={onLaunch}
        launching={launchPending}
        onLaunchComplete={onLaunchComplete}
      />
    </div>
  )
}
