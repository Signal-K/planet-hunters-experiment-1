'use client'

import type { useGame } from '@/game-context'
import type { Screen } from '@/lib/game-types'
import type { Target } from '@/lib/data'
import { isFreeHaulMission, isOwnProgramMission, laserCapacitorBonus, rocketDisplayForConfig } from '@/lib/data'
import { ORIONIDS_NIGHT_RUN_ID } from '@/lib/data/missions'
import { effectiveCargoCapacity } from '@/lib/data/skills'
import TransitScreen from '@/components/game/screens/TransitScreen'
import LandingScreen from '@/components/game/screens/LandingScreen'
import MiningScreen from '@/components/game/screens/MiningScreen'
import RoverSurveyScreen from '@/components/game/screens/RoverSurveyScreen'
import HomecomingScreen from '@/components/game/screens/HomecomingScreen'
import DeliveryScreen from '@/components/game/screens/DeliveryScreen'
import DebriefScreen from '@/components/game/screens/DebriefScreen'
import { earthStorageBuilt, hasOperationalRemoteSilo, storageCapacity, storedUnits, sellQuote } from '@/lib/systems/EconomySystem'
import { TRANSPORT_LESSON_MISSIONS_DONE } from '@/lib/systems/AgencyOnboardingSystem'
import { isFreeHaulEligibleMission } from '@/lib/data'
import { DEBRIS_PRESETS, applyDebrisMined, getSkyEvent } from '@/lib/data/sky-events'
import { debrisNow } from '@/lib/hooks/useDebrisEvent'
import { FIREBALL_2026_BADGE, FIREBALL_SUBJECT_ID, grantFireballCatch } from '@/lib/orionids/fireball'
import { catchesForNight, recordFragmentCatch } from '@/lib/orionids/night-catches'
import { queueEventBadge } from '@/lib/orionids/persist'
import { captureGameEvent } from '@/lib/posthog'
import { missionResumeScreen } from '@/lib/mission-resume'

const reportedDebrisBadges = new Set<string>()

function flightStops(player: Game['player']): Screen[] {
  const stops: Screen[] = ['hub', 'missions']
  if (player.freeOperations) stops.push('market')
  const resume = missionResumeScreen(player)
  if (!stops.includes(resume)) stops.push(resume)
  return stops
}

function stepFlightDock(game: Game, dir: -1 | 1) {
  const stops = flightStops(game.player)
  const at = Math.max(0, stops.indexOf(game.screen))
  game.go(stops[(at + dir + stops.length) % stops.length])
}

type Game = ReturnType<typeof useGame>
type RocketDisplay = ReturnType<typeof rocketDisplayForConfig>
export type MissionOperationRoute = Extract<Screen, 'transit' | 'landing' | 'mining' | 'rover-survey' | 'delivery' | 'debrief'>

interface MissionOperationRoutesProps {
  screen: MissionOperationRoute
  game: Game
  trainingMiningTry: boolean
  transitTarget: Target
  debriefOriginTarget: Target
  deliveryTargetName?: string
  originTargetName?: string
  rocketDisplay: RocketDisplay
}

export default function MissionOperationRoutes({
  screen,
  game,
  trainingMiningTry,
  transitTarget,
  debriefOriginTarget,
  deliveryTargetName,
  originTargetName,
  rocketDisplay,
}: MissionOperationRoutesProps) {
  const debriefCargo = game.deliveredCargo ?? game.lastCargo ?? {}
  const debriefIsFreeHaul = game.mission ? isFreeHaulMission(game.mission, debriefCargo) && !game.player.cargoSettledOffworld : false

  switch (screen) {
    case 'transit':
      return (
        <TransitScreen
          target={transitTarget}
          arrivalAt={game.player.arrivalAt}
          transitStartedAt={game.player.transitStartedAt}
          returning={!!game.player.returningToEarth}
          isDelivery={!!game.player.headingToDelivery}
          francs={game.player.francs}
          parts={game.player.shipCustomizerParts}
          onBack={() => game.go('hub')}
          onPrev={() => stepFlightDock(game, -1)}
          onNext={() => stepFlightDock(game, 1)}
          onHub={() => game.go('hub')}
          onArrive={() => {
            if (game.player.returningToEarth) {
              game.onReturnArrived()
              return
            }
            if (game.player.headingToDelivery) {
              game.onDeliveryArrived()
              return
            }
            const isRoverSurvey = game.mission?.survey?.onWorldVehicle === 'starter-rover'
            const hasLander = !isRoverSurvey && !!game.player.shipCustomizerParts?.lander
            if (game.mission?.payload?.type === 'satellite' || game.mission?.payload?.type === 'deep-space-survey' || game.target?.type === 'exoplanet') {
              game.setPlayer(player => ({
                ...player,
                missionPhase: 'debrief',
                transitSatelliteLaunchedAt: game.mission?.payload?.instrumentId === 'transit-telescope'
                  ? (player.transitSatelliteLaunchedAt ?? Date.now())
                  : player.transitSatelliteLaunchedAt,
                transitSatelliteLevel: game.mission?.payload?.instrumentId === 'transit-telescope'
                  ? Math.max(1, player.transitSatelliteLevel ?? 1)
                  : player.transitSatelliteLevel,
                // One telescope: launching it brings the transit and asteroid feeds online together.
                deepSpaceTelescopeBuilt: game.mission?.payload?.instrumentId === 'transit-telescope' || player.deepSpaceTelescopeBuilt,
                deepSpaceTelescopeLaunchedAt: game.mission?.payload?.instrumentId === 'transit-telescope'
                  ? (player.deepSpaceTelescopeLaunchedAt ?? Date.now())
                  : player.deepSpaceTelescopeLaunchedAt,
                saturnImagerLaunchedAt: game.mission?.payload?.instrumentId === 'saturn-imager'
                  ? (player.saturnImagerLaunchedAt ?? Date.now())
                  : player.saturnImagerLaunchedAt,
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
            game.setPlayer(player => ({
              ...player,
              missionPhase: isRoverSurvey ? 'survey' : 'mining',
            }))
            game.go(isRoverSurvey ? 'rover-survey' : 'mining')
          }}
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
              game.onLandingTouchdown()
              return
            }
            game.onRedockComplete(game.player.miningCargoInProgress ?? {}, game.player.pendingRemoteDisposition)
          }}
        />
      )
    }

    case 'mining': {
      if (!game.mission || !game.target) return null
      const chassis = game.catalog.parts.chassis.find(part => part.id === game.rocket.chassis)
      const nightHold = game.mission.id === ORIONIDS_NIGHT_RUN_ID && chassis
        ? effectiveCargoCapacity(chassis, game.player.unlockedSkillNodes)
        : undefined
      return (
        <MiningScreen
          mission={game.mission}
          target={game.target}
          rocketImageSrc={rocketDisplay.img}
          initialCargo={game.player.miningCargoInProgress}
          initialCharges={game.player.miningLaserCharges}
          francs={game.player.francs}
          onSpendFrancs={amount => game.setPlayer(player => ({ ...player, francs: Math.max(0, player.francs - amount) }))}
          onPersist={(cargo, charges) => {
            game.setPlayer(player => ({
              ...player,
              miningCargoInProgress: Object.keys(cargo).length > 0 ? cargo : undefined,
              miningLaserCharges: charges,
            }))
          }}
          onBack={(cargo, charges) => {
            game.setPlayer(player => ({
              ...player,
              missionPhase: 'mining',
              miningCargoInProgress: Object.keys(cargo).length > 0 ? cargo : undefined,
              miningLaserCharges: charges,
            }))
            game.go('hub')
          }}
          onComplete={(cargo, remoteDisposition, earthDisposition) => {
            game.completeStep(6)
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
          laserBonusCharges={laserCapacitorBonus(game.player.laserCapacitorLevel)}
          laserTier={game.catalog.parts.drill.find(p => p.id === game.rocket.drill)?.tier ?? 1}
          trainingMiningTry={trainingMiningTry}
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
          orionidsBadgeTier={game.player.badges?.['orionids-2026']?.tier ?? null}
          fragmentCatches={catchesForNight(game.player.orionidsNightCatches, debrisNow())}
          cargoCapacity={nightHold}
          fireballCaughtAt={game.player.fireball2026CaughtAt ?? null}
          onFireballCaught={() => {
            const now = debrisNow()
            const preview = grantFireballCatch(game.player, now)
            if (preview.badge && !reportedDebrisBadges.has(preview.badge.eventId)) {
              reportedDebrisBadges.add(preview.badge.eventId)
              captureGameEvent('badge_earned', { event_id: preview.badge.eventId, tier: preview.badge.tier, activity: 'fireball' })
              game.addToast(`Fireball 2026 ${preview.badge.tier} badge. The fragment is worth far more at the Exchange.`, 'ok')
              queueEventBadge({
                eventId: FIREBALL_2026_BADGE,
                tier: preview.badge.tier,
                earnedAt: preview.badge.earnedAt,
                subjectId: FIREBALL_SUBJECT_ID,
                marker: FIREBALL_2026_BADGE,
              })
            }
            game.setPlayer(player => grantFireballCatch(player, now).player)
          }}
          onDebrisMined={resourceId => {
            const now = debrisNow()
            const preset = DEBRIS_PRESETS.find(p => p.resourceId === resourceId)
            if (!preset) return
            captureGameEvent('sky_event_debris_mined', { event_id: preset.eventId, resource: resourceId })
            // State update is pure and idempotent; the toast/analytics side effects
            // are deduped per event so a re-run updater or fast second chunk can't repeat them.
            const { badge } = applyDebrisMined(game.player, preset, now)
            if (badge && !reportedDebrisBadges.has(badge.eventId)) {
              reportedDebrisBadges.add(badge.eventId)
              captureGameEvent('badge_earned', { event_id: badge.eventId, tier: badge.tier, activity: 'debris-mining' })
              const name = getSkyEvent(badge.eventId)?.name ?? preset.label
              game.addToast(`${name} ${badge.tier} badge earned`, 'ok')
            }
            game.setPlayer(player => {
              const mined = applyDebrisMined(player, preset, now).player
              if (resourceId !== 'orionid_debris') return mined
              return { ...mined, orionidsNightCatches: recordFragmentCatch(player.orionidsNightCatches, now) }
            })
          }}
        />
      )
    }

    case 'rover-survey': {
      if (!game.mission || !game.target) return null
      const roverTarget = game.target
      return (
        <RoverSurveyScreen
          mission={game.mission}
          target={roverTarget}
          rocketImageSrc={rocketDisplay.img}
          player={game.player}
          onFieldBuild={game.recordFieldBuild}
          onFieldDemolish={game.recordFieldDemolish}
          onFabricate={game.fabricateAtField}
          onSeedBiosphere={game.seedBiosphere}
          onComplete={game.onRoverSurveyComplete}
          onBack={() => {
            game.setPlayer(player => ({ ...player, missionPhase: 'survey' }))
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
          useTakeonDropoff={game.player.missionsDone === TRANSPORT_LESSON_MISSIONS_DONE}
          rocketImageSrc={rocketDisplay.img}
        />
      )

    case 'debrief':
      if (!game.mission || !game.target) return null
      if (game.player.homeDeliveryPending && game.lastCargo) {
        return (
          <HomecomingScreen
            player={game.player}
            mission={game.mission}
            cargo={game.lastCargo}
            minerals={game.catalog.minerals}
            clientName={game.mission.client ? game.catalog.clients[game.mission.client]?.name : undefined}
            onConfirm={game.onHomeDelivery}
          />
        )
      }
      return (
        <DebriefScreen
          mission={game.mission}
          target={debriefOriginTarget}
          originTargetName={originTargetName}
          cargo={debriefCargo}
          onDone={game.onDebriefDone}
          onBuyLaserCapacitor={game.onBuyLaserCapacitor}
          laserCapacitorLevel={game.player.laserCapacitorLevel ?? 0}
          stashUnits={storedUnits(game.player.stash)}
          badges={game.player.badges}
          minerals={game.catalog.minerals}
          clients={game.catalog.clients}
          clientMissions={game.player.clientMissions}
          freeOperations={game.player.freeOperations}
          annotations={game.player.researchAnnotations}
          missionsDone={game.player.missionsDone}
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
