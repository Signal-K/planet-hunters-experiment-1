'use client'

import { useEffect, useRef, useState } from 'react'
import { asLoadout, loadoutBonuses } from '@/lib/launchpad/rocketBuilder'
import type { useGame } from '@/game-context'
import type { Screen } from '@/lib/game-types'
import type { Target } from '@/lib/data'
import { isFreeHaulMission, isOwnProgramMission, laserCapacitorBonus, rocketDisplayForConfig } from '@/lib/data'
import { ORIONIDS_NIGHT_RUN_ID } from '@/lib/data/missions'
import TransitScreen from '@/components/game/screens/TransitScreen'
import LandingScreen from '@/components/game/screens/LandingScreen'
import MiningScreen from '@/components/game/screens/MiningScreen'
import HomecomingScreen from '@/components/game/screens/HomecomingScreen'
import DeliveryScreen from '@/components/game/screens/DeliveryScreen'
import DebriefScreen from '@/components/game/screens/DebriefScreen'
import { earthStorageBuilt, storageCapacity, storedUnits, sellQuote } from '@/lib/systems/EconomySystem'
import { TRANSPORT_LESSON_MISSIONS_DONE } from '@/lib/systems/AgencyOnboardingSystem'
import { isFreeHaulEligibleMission } from '@/lib/data'
import { DEBRIS_PRESETS, applyDebrisMined, getSkyEvent } from '@/lib/data/sky-events'
import { debrisNow } from '@/lib/hooks/useDebrisEvent'
import { FIREBALL_2026_BADGE, FIREBALL_SUBJECT_ID, grantFireballCatch } from '@/lib/orionids/fireball'
import { addStamp } from '@/lib/research/stamps'
import { addCaughtFragments } from '@/lib/orionids/fragments'
import { showerRunCatches, showerRunFilled, showerRunPayout, withoutShowerFragments } from '@/lib/orionids/shower-run'
import { queueEventBadge, queueOrionidsEventProof } from '@/lib/orionids/persist'
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
export type MissionOperationRoute = Extract<Screen, 'transit' | 'landing' | 'mining' | 'delivery' | 'debrief'>

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

// How long a run may stay unresolvable while online before it is treated as lost. The runtime
// catalog fetch has long settled by then, so a missing mission or target is not "still loading".
const UNAVAILABLE_GRACE_MS = 4000
const DISCARD_AFTER_MS = 6000

/** What the page knows about a run whose mission or target cannot be found. */
function describeMissingRun(game: Game) {
  const run = game.player.activeMission
  return {
    screen: game.screen,
    missionId: game.missionId ?? null,
    targetId: game.targetId ?? null,
    deliveryTargetId: game.deliveryTargetId ?? null,
    missionFound: !!game.mission,
    targetFound: !!game.target,
    runId: game.player.missionRunId ?? null,
    runMissionId: run?.id ?? null,
    runLabel: run?.label ?? null,
    runHasMissionCopy: !!run?.mission,
    runHasTargetCopy: !!run?.target,
    missionPhase: game.player.missionPhase ?? null,
    cargoKinds: Object.keys(game.player.miningCargoInProgress ?? {}).length,
    pausedRuns: game.player.pausedMissionRuns?.length ?? 0,
    catalogMissions: game.catalog.missions.length,
    catalogTargets: game.catalog.targets.length,
    online: navigator.onLine,
  }
}

/**
 * A saved run whose mission or target cannot be found used to render nothing: a blank scene with
 * only the HUD. This logs what is missing, and says so. A run that carries no copy of the missing
 * piece and still cannot resolve while online is unrecoverable, so it is discarded (no payout
 * penalty) and the player returns to the Base. Offline, the run is kept: the data may still arrive.
 */
function MissionRunUnavailable({ game }: { game: Game }) {
  const [slow, setSlow] = useState(false)
  const details = describeMissingRun(game)
  const unrecoverable = !(details.missionFound || details.runHasMissionCopy)
    || !(details.targetFound || details.runHasTargetCopy)
  const online = details.online
  const { abandonMission } = game
  const detailsKey = JSON.stringify(details)

  // The latest values, read by timers that must not restart on every game state change.
  const latest = useRef({ abandonMission, detailsKey, unrecoverable })
  latest.current = { abandonMission, detailsKey, unrecoverable }

  useEffect(() => {
    console.warn('mission run unavailable', detailsKey)
    captureGameEvent('mission_run_unavailable', JSON.parse(detailsKey))
  }, [detailsKey])

  useEffect(() => {
    const slowTimer = window.setTimeout(() => setSlow(true), UNAVAILABLE_GRACE_MS)
    const discardTimer = window.setTimeout(() => {
      const { abandonMission: abandon, detailsKey: key, unrecoverable: lost } = latest.current
      if (!navigator.onLine || !lost) return
      console.warn('mission run unrecoverable, discarding', key)
      captureGameEvent('mission_run_discarded', { ...JSON.parse(key), source: 'panel' })
      abandon({ confirmed: true, waivePenalty: true })
    }, DISCARD_AFTER_MS)
    return () => {
      window.clearTimeout(slowTimer)
      window.clearTimeout(discardTimer)
    }
  }, [])

  const button = {
    minHeight: 44, padding: '10px 24px', background: 'transparent', color: 'var(--ln-cyan, #00e5ff)',
    border: '1px solid rgba(0, 229, 255, 0.4)', borderRadius: 4, fontSize: 14, cursor: 'pointer',
  } as const
  return (
    <div className="game-screen" role="status" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: 24, textAlign: 'center', minHeight: '100%',
    }}>
      <h1 style={{ fontSize: 18, letterSpacing: '0.1em', margin: 0 }}>
        {slow ? 'MISSION DETAILS UNAVAILABLE' : 'LOADING MISSION'}
      </h1>
      {slow && (
        <>
          <p style={{ fontSize: 14, margin: 0, maxWidth: 320, lineHeight: 1.5, opacity: 0.8 }}>
            {!online
              ? 'This run is saved, but its mission has not loaded and you are offline. Your run and cargo are kept.'
              : unrecoverable
                ? 'This run has lost its mission data and cannot be resumed. It will be cleared and you will return to the Base.'
                : 'This run is saved, but its mission has not loaded. Try again, or return to the Base. Your run and cargo are kept.'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" style={button} onClick={() => window.location.reload()}>TRY AGAIN</button>
            <button type="button" style={button} onClick={() => {
              // A run that cannot be flown is cleared on the way out, or the Base keeps showing it as a craft.
              if (unrecoverable && online) abandonMission({ confirmed: true, waivePenalty: true })
              else game.go('hub')
            }}>BACK TO BASE</button>
          </div>
        </>
      )}
    </div>
  )
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
  // SSL-651: a filled shower run pays its francs and keeps the fragments, so the debrief shows both and leaves them out of the sale.
  const showerRun = game.mission?.id === ORIONIDS_NIGHT_RUN_ID && showerRunFilled(game.player)
    ? { francs: showerRunPayout(game.player.missionsDone), fragments: showerRunCatches(game.player) }
    : null

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
          fragmentCount={Math.max(0, Math.floor(game.player.stash?.orionid_debris ?? 0))}
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
            const hasLander = !!game.player.shipCustomizerParts?.lander
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
              missionPhase: 'mining',
            }))
            game.go('mining')
          }}
        />
      )

    case 'landing': {
      if (!game.mission || !game.target) return <MissionRunUnavailable game={game} />
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
            game.onRedockComplete(game.player.miningCargoInProgress ?? {})
          }}
        />
      )
    }

    case 'mining': {
      if (!game.mission || !game.target) return <MissionRunUnavailable game={game} />
      const miningTargetId = game.target.id
      const chassis = game.catalog.parts.chassis.find(part => part.id === game.rocket.chassis)
      const nightHold = game.mission.id === ORIONIDS_NIGHT_RUN_ID && chassis
        ? (chassis.cargo ?? 0)
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
          onSwitchMission={(cargo, charges) => {
            // SSL-708: the mining menu's Switch mission keeps this run's progress, like Return to hub.
            game.setPlayer(player => ({
              ...player,
              missionPhase: 'mining',
              miningCargoInProgress: Object.keys(cargo).length > 0 ? cargo : undefined,
              miningLaserCharges: charges,
            }))
            game.go('missions')
          }}
          onComplete={(cargo, earthDisposition) => {
            game.completeStep(6)
            if (game.player.shipCustomizerParts?.lander) {
              game.setPlayer(player => ({
                ...player,
                missionPhase: 'landing',
                landingReturnStartedAt: Date.now(),
                miningCargoInProgress: cargo,
                freeHaulDisposition: earthDisposition ?? player.freeHaulDisposition,
              }))
              game.go('landing')
              return
            }
            if (earthDisposition) game.setPlayer(player => ({ ...player, freeHaulDisposition: earthDisposition }))
            game.onMiningDone(cargo)
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
          // KES-283: gate a self-directed run on a storage destination before
          // mining starts, unless one was already chosen before a prior
          // back-to-hub pause on this same mission.
          isFreeHaulEligible={isFreeHaulEligibleMission(game.mission)}
          hasEarthStorage={earthStorageBuilt(game.player)}
          initialEarthDisposition={game.player.freeHaulDisposition}
          orionidsBadgeTier={game.player.badges?.['orionids-2026']?.tier ?? null}
          fragmentCatches={showerRunCatches(game.player)}
          cargoCapacity={nightHold}
          fireballCaughtAt={game.player.fireball2026CaughtAt ?? null}
          skyEventLocation={game.player.skyEventLocation}
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
              return addStamp(addCaughtFragments(mined, 1, 'count'), 'event', now)
            })
          }}
          onEventProof={screenshot => {
            if (game.mission?.id !== ORIONIDS_NIGHT_RUN_ID) return
            const missionRunId = game.player.missionRunId ?? (game.player.transitStartedAt ? `launch-${game.player.transitStartedAt}` : '')
            if (!missionRunId) return
            queueOrionidsEventProof({
              missionId: game.mission.id,
              missionRunId,
              targetId: miningTargetId,
              screenshot,
              capturedAt: debrisNow(),
            })
          }}
        />
      )
    }

    case 'delivery':
      if (!game.mission || !game.deliveryTargetId) return <MissionRunUnavailable game={game} />
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
      if (!game.mission || !game.target) return <MissionRunUnavailable game={game} />
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
          homeSettlement={game.player.homeSettlement}
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
          hasEarthStorage={earthStorageBuilt(game.player)}
          storageCapacity={storageCapacity(game.player)}
          storageUsed={storedUnits(game.player.stash)}
          haulMarketValue={sellQuote(showerRun ? withoutShowerFragments(debriefCargo) : debriefCargo, game.player, debriefIsFreeHaul ? undefined : game.player.lastClient)}
          showerRun={showerRun}
          initialDisposition={game.player.freeHaulDisposition}
        />
      )
  }
}
