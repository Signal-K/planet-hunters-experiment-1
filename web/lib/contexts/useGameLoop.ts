import { addStamp, isDiscoveryMission, type StampKind } from '@/lib/research/stamps'
import { buildingLevel } from '@/lib/data/building-levels'
import { asLoadout, loadoutBonuses } from '@/lib/launchpad/rocketBuilder'
import { useCallback, useRef } from 'react'
import {
  MISSIONS, TARGETS, ROCKET_MODELS, FREE_OPS_START_MISSIONS_DONE,
  BASE_LASER_CHARGES, rocketModelForConfig, travelDurationMs, suggestBuild,
  feasibleTargetsFor, validateBuild, rocketConfigForModel,
  isOwnProgramMission,
  isFreeHaulMission,
  isOrionidsEventMission,
  artifactNarrativeEligible,
  missionTypePrimer,
} from '@/lib/data'
import { applyMiningDone, applyReturnArrived } from '@/lib/systems/MiningSystem'
import { applyDeliveryArrived, applyDeliveryUnloadComplete } from '@/lib/systems/DeliverySystem'
import { applyLandingTouchdown, applyRedockComplete } from '@/lib/systems/LandingSystem'
import { applyAssembleFabricatedRocket, applyFabricateRocketPart, applyBuyLaserCapacitor, applyFreeHaulDisposition, applyPurchaseRocket, applyRocketStageRecovery, earthStorageBuilt, rocketPurchaseRefusal } from '@/lib/systems/EconomySystem'
import { rocketCompatibleWithMission } from '@/lib/rockets'
import { applyConstructionCompletion } from '@/lib/systems/ConstructionSystem'
import { enqueueSurvey, isRepeatSurveyEligible, getMilestoneSurveyVariant } from '@/lib/surveys'
import { captureFreeOpsUnlocked, captureGameEvent } from '@/lib/posthog'
import type { Catalog } from '@/lib/catalog'
import type { GameState, Player, MissionRunSnapshot, StagedRocket } from '@/lib/game-types'
import { resolveSaturnBadgeTier, isSaturnPoolCandidateId, grantBadgesForActivity, skyEventNow, grantWswBadge, wswMissionTypeFor, type SkyActivityKind, type WswMissionType } from '@/lib/data'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import type { Mission, Target, TessVerdict, TransitRange, AsteroidVerdict, SaturnVerdict } from '@/lib/data'
import type { Toast } from '@/components/ui/ToastLayer'
import { applyStartScan, applyResolveScan } from '@/lib/systems/SurveyScanSystem'
import { applyGainResearchXP, applyUnlockBlueprint } from '@/lib/systems/ProgressionSystem'
import { pbShared } from '@/lib/pb'
import { pbLandnam } from '@/lib/pb-landnam'
import { queueCreate, queueUpdate } from '@/lib/offline/pbOutbox'
import { grantOrionidsPlanetFind } from '@/lib/orionids/finds'
import { queueMeteoriteMastery, queueOrionidsFind } from '@/lib/orionids/persist'
import { applyLaunchCatch, combineFragments, redeemFragments, FRAGMENT_REDEEM_BATCH, FRAGMENTS_PER_FIREBALL } from '@/lib/orionids/fragments'
import { freeOperationsUnlocked } from '@/lib/systems/AgencyOnboardingSystem'
import { clearActiveRunPlayer, isSettledMissionRun } from '@/lib/systems/MissionRunLifecycle'
import { applyHomeSplit, clientDemand, clientPayout, type HomeSplit } from '@/lib/systems/HomeDeliverySystem'
import { completeFlightPlanEvent, currentTrainingTry, earnsTrainingReplayReward, TRAINING_REPLAY_REWARD } from '@/lib/systems/FlightPlanSystem'
import { TRAINING_ID_PREFIX } from '@/lib/visual-fixtures'
import { FREE_OPS_MISSION_SEQUENCE } from '@/lib/data/mission-generator'
import { ORIONIDS_NIGHT_RUN_ID, ORIONIDS_SURFACE_RESEARCH_MISSION_ID, orionidsNightRun, orionidsSurfaceResearchMission } from '@/lib/data/missions'
import { settleShowerRun, showerRunFilled, startShowerRun, withoutShowerFragments } from '@/lib/orionids/shower-run'
import { requestMissionBoardTab } from '@/lib/mission-board-nav'

// 42s/orbit-unit — a ~65% cut from the original 2min/unit pace (KES-262):
// full round trips were running long enough that players felt locked out of
// the game for the whole leg.
const ORBIT_MS_PER_UNIT = 42 * 1000
// First-time-only reward for classifying a TESS candidate — repeat looks at an
// already-classified subject earn nothing (see submitTessClassification).
const RESEARCH_XP_PER_FIRST_TESS_CLASSIFICATION = 15
const RESEARCH_XP_PER_FIRST_ASTEROID_CLASSIFICATION = 15
const RESEARCH_XP_PER_ENCELADUS_CHART = 30
interface GameLoopOpts {
  stateRef: React.RefObject<GameState>
  setState: React.Dispatch<React.SetStateAction<GameState>>
  catalog: Catalog
  addToast: (message: string, kind?: Toast['kind'], options?: { sticky?: boolean }) => void
}

function snapshotActiveMission(state: GameState): MissionRunSnapshot | null {
  const { activeMission } = state.player
  if (!activeMission || !state.missionId || !state.targetId) return null
  const key = state.player.missionRunId ?? `${activeMission.id}:${state.player.transitStartedAt ?? Date.now()}`
  return {
    key,
    activeMission,
    missionId: state.missionId,
    targetId: state.targetId,
    deliveryTargetId: state.deliveryTargetId,
    rocket: state.rocket,
    lastCargo: state.lastCargo,
    deliveredCargo: state.deliveredCargo,
    missionRunId: state.player.missionRunId,
    missionPhase: state.player.missionPhase,
    miningCargoInProgress: state.player.miningCargoInProgress,
    miningLaserCharges: state.player.miningLaserCharges,
    deliveryUnloadStartedAt: state.player.deliveryUnloadStartedAt,
    landingStartedAt: state.player.landingStartedAt,
    landingReturnStartedAt: state.player.landingReturnStartedAt,
    arrivalAt: state.player.arrivalAt,
    transitStartedAt: state.player.transitStartedAt,
    missionRocketSource: state.player.missionRocketSource,
    debriefPending: state.player.debriefPending,
    cargoSettledOffworld: state.player.cargoSettledOffworld,
    freeHaulDisposition: state.player.freeHaulDisposition,
    returningToEarth: state.player.returningToEarth,
    headingToDelivery: state.player.headingToDelivery,
    shipDestroyed: state.player.shipDestroyed,
  }
}

function stagedRocketSupportsMission(stagedRocket: StagedRocket, state: GameState, mission: Mission, target: Target, catalog: Catalog): boolean {
  return validateBuild({
    mission,
    target,
    rocket: stagedRocket.rocket,
    parts: catalog.parts,
    loadoutBonus: loadoutBonuses(asLoadout(state.player.shipCustomizerParts)),
  }).ok
}

function stagedRocketForMission(state: GameState, missionId: string, targetId: string): StagedRocket | undefined {
  return state.player.stagedRockets?.find(vehicle => vehicle.missionId === missionId && vehicle.targetId === targetId)
}

function selectStagedRocket(state: GameState, vehicle: StagedRocket): GameState {
  return {
    ...state,
    rocket: vehicle.rocket,
    player: {
      ...state.player,
      pendingLaunch: true,
      pendingRocketId: vehicle.rocketId,
      pendingRocketLocation: vehicle.location,
      pendingRocketSource: vehicle.source,
      selectedStagedRocketId: vehicle.id,
    },
  }
}

function missionById(s: GameState, catalog: Catalog, id: string | null): Mission | null {
  if (!id) return null
  return catalog.missions.find(m => m.id === id) ?? s.player.dailyClientPool?.missions.find(m => m.id === id) ?? null
}

/** Shared by the Map step and the one-screen setup: lock a target in and move on to the rocket. */
function pickTargetState(s: GameState, catalog: Catalog, id: string): GameState {
  const mission = missionById(s, catalog, s.missionId)
  const target = catalog.targets.find(t => t.id === id) ?? null
  if (!mission || !target) return s
  if (!feasibleTargetsFor(mission, catalog.targets, catalog.parts, s.player.missionsDone, s.player.launchpadUpgraded, buildingLevel(s.player, 'launchpad')).some(item => item.id === id)) return s
  const next = suggestBuild({ mission, target, missionsDone: s.player.missionsDone, launchpadUpgraded: s.player.launchpadUpgraded, launchpadLevel: buildingLevel(s.player, 'launchpad'), parts: catalog.parts })
  // SSL-450: switching target releases a free (F0) vehicle built for the old one, so Change never strands a rocket.
  const freeIds = new Set(ROCKET_MODELS.filter(model => model.costFrancs === 0).map(model => model.id))
  const stagedRockets = (s.player.stagedRockets ?? []).filter(vehicle =>
    !(vehicle.missionId === mission.id && vehicle.targetId !== target.id && freeIds.has(vehicle.rocketId)))
  const base = { ...s, player: { ...s.player, stagedRockets } }
  const stagedVehicle = stagedRocketForMission(base, mission.id, target.id)
  const setup = {
    ...base,
    targetId: id,
    rocket: stagedVehicle?.rocket ?? next,
    screen: stagedVehicle ? ('fab' as const) : ('rocket-buy' as const),
    doneSteps: { ...s.doneSteps, 3: true },
  }
  return stagedVehicle ? selectStagedRocket(setup, stagedVehicle) : setup
}

/**
 * SSL-450: Accept Contract lands straight on the launch review. The
 * recommended target is chosen for the player, but vehicle selection remains
 * an explicit action. A default config is only a build preview, never a
 * physical rocket on the pad.
 */
function finishQuickSetup(s: GameState, catalog: Catalog): GameState {
  let next = s
  if (next.screen === 'targets' && next.missionId) {
    const mission = missionById(next, catalog, next.missionId)
    if (!mission) return next
    const feasible = feasibleTargetsFor(mission, catalog.targets, catalog.parts, next.player.missionsDone, next.player.launchpadUpgraded, buildingLevel(next.player, 'launchpad'))
    const pick = feasible.find(target => target.recommended) ?? feasible[0]
    if (!pick) return next
    next = pickTargetState(next, catalog, pick.id)
  }
  return next
}

/** Moves the selected hangar vehicle to the launchpad; null when there is nothing to move. */
function rollOutToPad(s: GameState): GameState | null {
  const vehicle = s.player.stagedRockets?.find(candidate => candidate.id === s.player.selectedStagedRocketId)
  if (!vehicle) return null
  const onPad = { ...vehicle, location: 'launchpad' as const }
  return selectStagedRocket({
    ...s,
    doneSteps: { ...s.doneSteps, 8: true },
    player: { ...s.player, stagedRockets: s.player.stagedRockets?.map(candidate => candidate.id === vehicle.id ? onPad : candidate) },
  }, onPad)
}

/** Park a live sortie so another mission can be set up, or drop it when it was already collected. */
function parkOrDropActiveRun(state: GameState): GameState {
  if (!state.player.activeMission) return state
  const settled = isSettledMissionRun(state.player, {
    runId: state.player.missionRunId,
    missionId: state.player.activeMission.id,
    targetId: state.targetId,
    launchedAt: state.player.transitStartedAt,
  })
  const snapshot = settled ? null : snapshotActiveMission(state)
  const paused = (state.player.pausedMissionRuns ?? []).filter(run => !isSettledMissionRun(state.player, {
    runId: run.missionRunId,
    missionId: run.missionId,
    targetId: run.targetId,
    launchedAt: run.transitStartedAt,
  }))
  const pausedMissionRuns = snapshot
    ? [...paused.filter(run => run.key !== snapshot.key), snapshot]
    : paused
  return {
    ...state,
    lastCargo: null,
    deliveredCargo: null,
    missionId: null,
    targetId: null,
    deliveryTargetId: null,
    player: { ...clearActiveRunPlayer(state.player), pausedMissionRuns },
  }
}

function restoreMissionSnapshot(state: GameState, snapshot: MissionRunSnapshot): GameState {
  return {
    ...state,
    screen: snapshot.missionPhase === 'survey' ? 'rover-survey' : (snapshot.missionPhase ?? 'transit'),
    missionId: snapshot.missionId,
    targetId: snapshot.targetId,
    deliveryTargetId: snapshot.deliveryTargetId,
    rocket: snapshot.rocket,
    lastCargo: snapshot.lastCargo,
    deliveredCargo: snapshot.deliveredCargo,
    player: {
      ...state.player,
      activeMission: snapshot.activeMission,
      missionRunId: snapshot.missionRunId,
      missionPhase: snapshot.missionPhase,
      miningCargoInProgress: snapshot.miningCargoInProgress,
      miningLaserCharges: snapshot.miningLaserCharges,
      deliveryUnloadStartedAt: snapshot.deliveryUnloadStartedAt,
      landingStartedAt: snapshot.landingStartedAt,
      landingReturnStartedAt: snapshot.landingReturnStartedAt,
      arrivalAt: snapshot.arrivalAt,
      transitStartedAt: snapshot.transitStartedAt,
      missionRocketSource: snapshot.missionRocketSource,
      debriefPending: snapshot.debriefPending,
      cargoSettledOffworld: snapshot.cargoSettledOffworld,
      freeHaulDisposition: snapshot.freeHaulDisposition,
      returningToEarth: snapshot.returningToEarth,
      headingToDelivery: snapshot.headingToDelivery,
      shipDestroyed: snapshot.shipDestroyed,
    },
  }
}

// SSL-491: grant sky-event badges for an activity. Time comes from
// skyEventNow so dev/staging can override the date; production uses the clock.
const reportedBadges = new Set<string>()
function grantSkyBadges(player: Player, kind: SkyActivityKind, at: number): Player {
  const { player: next, granted } = grantBadgesForActivity(player, kind, at)
  for (const badge of granted) {
    const key = `${badge.eventId}:${badge.tier}`
    if (reportedBadges.has(key)) continue
    reportedBadges.add(key)
    captureGameEvent('badge_earned', { event_id: badge.eventId, tier: badge.tier, activity: kind })
    enqueueSurvey('lnm_badge_earned', 4000)
  }
  return next
}

// Our own World Space Week mission-type badges (wsw-badges.ts), same clock.
function grantWswBadges(player: Player, type: WswMissionType, at: number): Player {
  const { player: next, granted } = grantWswBadge(player, type, at)
  if (granted) {
    const key = `${granted.eventId}:${granted.tier}`
    if (!reportedBadges.has(key)) {
      reportedBadges.add(key)
      captureGameEvent('badge_earned', { event_id: granted.eventId, tier: granted.tier, activity: type })
    }
  }
  return next
}

export function useGameLoop({ stateRef, setState, catalog, addToast }: GameLoopOpts) {
  const missionRunIdRef = useRef<string | null>(null)
  const setPlayer: React.Dispatch<React.SetStateAction<import('@/lib/game-types').Player>> = useCallback(
    (update) => setState(s => ({
      ...s,
      player: typeof update === 'function' ? update(s.player) : update,
    })),
    [setState],
  )

  const setMissionId = useCallback((id: string | null) => {
    setState(s => ({ ...s, missionId: id }))
  }, [setState])

  const setTargetId = useCallback((id: string | null) => {
    setState(s => ({ ...s, targetId: id }))
  }, [setState])

  const setRocket = useCallback((r: import('@/lib/data').RocketConfig | ((prev: import('@/lib/data').RocketConfig) => import('@/lib/data').RocketConfig)) => {
    setState(s => ({
      ...s,
      rocket: typeof r === 'function' ? r(s.rocket) : r,
    }))
  }, [setState])

  const setLastCargo = useCallback((c: Record<string, number> | null) => {
    setState(s => ({ ...s, lastCargo: c }))
  }, [setState])

  const resumeMissionRun = useCallback((key: string) => {
    setState(s => {
      const selected = s.player.pausedMissionRuns?.find(run => run.key === key)
      if (!selected) return s
      const current = snapshotActiveMission(s)
      const pausedMissionRuns = [
        ...(s.player.pausedMissionRuns ?? []).filter(run => run.key !== key),
        ...(current ? [current] : []),
      ]
      return restoreMissionSnapshot({
        ...s,
        player: { ...s.player, pausedMissionRuns },
      }, selected)
    })
  }, [setState])

  const onPickMission = useCallback((id: string, freeHaulDisposition?: 'store' | 'sell') => {
    // A launched run keeps its cargo and charges in pausedMissionRuns. Picking
    // another mission parks that run instead of replacing it. A collected run
    // is dropped, never parked, so it cannot be flown again.
    // Counterpart to mission_completed — without a started event, Trends/
    // Funnels can't tell "never picked a mission" apart from "picked one and
    // dropped off before finishing it".
    const entryMission = id === ORIONIDS_NIGHT_RUN_ID
      ? orionidsNightRun()
      : id === ORIONIDS_SURFACE_RESEARCH_MISSION_ID
        ? orionidsSurfaceResearchMission()
        : null
    const pickedMission = catalog.missions.find(m => m.id === id)
      ?? stateRef.current.player.dailyClientPool?.missions.find(m => m.id === id)
      ?? entryMission
      ?? null
    if (pickedMission) {
      captureGameEvent('mission_started', {
        mission_id: id,
        mission_type: pickedMission.payload?.type ?? null,
        missions_done: stateRef.current.player.missionsDone,
      })
    }
    setState(s => {
      const isOrionidsEntry = id === ORIONIDS_NIGHT_RUN_ID || id === ORIONIDS_SURFACE_RESEARCH_MISSION_ID
      if (s.screen !== 'missions' && s.screen !== 'launchpad' && !isOrionidsEntry) return s
      let mission = catalog.missions.find(m => m.id === id)
        ?? s.player.dailyClientPool?.missions.find(m => m.id === id)
        ?? entryMission
        ?? null
      if (!mission) return s
      const nextDailyPool = s.player.dailyClientPool
      if (mission.jointProject && s.player.francs < mission.jointProject.playerCost) return s
      const ownOperation = isOwnProgramMission(mission)
      if (s.screen === 'launchpad' && !ownOperation) return s
      // Park only once the new mission is actually accepted. A rejected pick
      // must leave the live run where it is.
      const prepared = s.player.activeMission ? parkOrDropActiveRun(s) : s
      const dailyClientPool = (nextDailyPool && id.startsWith('dcp-'))
        ? { ...nextDailyPool, acceptedId: id }
        : nextDailyPool
      // The landing-page event route is deliberately a minimal onboarding:
      // provision only the starter pad that the canonical launch/recovery
      // loop requires. The rest of the Base and training remain untouched for
      // the player to return to after the shower run.
      const entryPlayer = isOrionidsEntry && !prepared.player.placed.includes('launchpad')
        ? {
            ...prepared.player,
            placed: [...prepared.player.placed, 'launchpad'],
            placementPlots: { ...(prepared.player.placementPlots ?? {}), launchpad: 0 },
          }
        : prepared.player
      // SSL-651: the shower run's 20 fragments count from this accept.
      const runPlayer = id === ORIONIDS_NIGHT_RUN_ID ? startShowerRun(entryPlayer) : entryPlayer
      const base = {
        ...prepared,
        player: {
          ...runPlayer,
          dailyClientPool,
          francs: runPlayer.francs - (mission.jointProject?.playerCost ?? 0),
          freeHaulDisposition: freeHaulDisposition ?? runPlayer.freeHaulDisposition,
        },
      }
      if (mission?.targetId) {
        const target = catalog.targets.find(t => t.id === mission.targetId) ?? null
        const deliveryTarget = mission.deliveryTargetId ? catalog.targets.find(t => t.id === mission.deliveryTargetId) ?? null : null
        const next = suggestBuild({ mission, target, deliveryTarget, missionsDone: prepared.player.missionsDone, launchpadUpgraded: prepared.player.launchpadUpgraded, launchpadLevel: buildingLevel(prepared.player, 'launchpad'), parts: catalog.parts })
        if (mission.payload?.type === 'rover') next.drill = 'cargo-module-t1'
        const stagedVehicle = stagedRocketForMission(prepared, mission.id, mission.targetId)
        const setup = {
          ...base,
          missionId: id,
          targetId: mission.targetId,
          deliveryTargetId: mission.deliveryTargetId ?? null,
          rocket: stagedVehicle?.rocket ?? next,
          screen: stagedVehicle ? ('fab' as const) : ('rocket-buy' as const),
          doneSteps: { ...prepared.doneSteps, 2: true, 3: true },
        }
        return stagedVehicle ? selectStagedRocket(setup, stagedVehicle) : finishQuickSetup(setup, catalog)
      }
      return finishQuickSetup({
        ...base,
        missionId: id,
        targetId: null,
        deliveryTargetId: mission.deliveryTargetId ?? null,
        screen: 'targets',
        doneSteps: { ...prepared.doneSteps, 2: true },
      }, catalog)
    })
  }, [catalog, setState, stateRef])

  const onPickTarget = useCallback((id: string) => {
    setState(s => {
      // R1 keeps target changes inline on the launch review. Treat the old
      // internal setup states as one operation so a change never reopens a
      // separate map screen or strands the player midway through setup.
      if (!['targets', 'rocket-buy', 'fab'].includes(s.screen) || !s.missionId) return s
      return finishQuickSetup(pickTargetState({ ...s, screen: 'targets' }, catalog, id), catalog)
    })
  }, [catalog, setState])

  const onPurchaseRocket = useCallback((rocketId: string) => {
    const rocket = ROCKET_MODELS.find(candidate => candidate.id === rocketId)
    if (!rocket) {
      addToast('That rocket blueprint is no longer available.', 'warn')
      return
    }
    const current = stateRef.current
    const refusal = rocketPurchaseRefusal(current, rocket)
    if (refusal) {
      addToast(refusal, 'warn')
      return
    }
    const currentMission = catalog.missions.find(m => m.id === current.missionId)
      ?? current.player.dailyClientPool?.missions.find(m => m.id === current.missionId)
      ?? null
    if (currentMission && !rocketCompatibleWithMission(rocket, currentMission)) {
      addToast('This rocket cannot carry the selected mission.', 'warn')
      return
    }
    setState(s => {
      const guardedRefusal = rocketPurchaseRefusal(s, rocket)
      if (guardedRefusal) return s
      const mission = catalog.missions.find(m => m.id === s.missionId)
        ?? s.player.dailyClientPool?.missions.find(m => m.id === s.missionId)
        ?? null
      if (mission && !rocketCompatibleWithMission(rocket, mission)) {
        return s
      }
      const next = applyPurchaseRocket(s, rocket)
      // SSL-450: no separate Hangar-to-pad tap; the built vehicle rolls out on its own.
      return rollOutToPad(next) ?? { ...next, doneSteps: { ...next.doneSteps, 8: true } }
    })
  }, [addToast, catalog.missions, setState, stateRef])

  const onMoveStagedRocket = useCallback((stagedRocketId: string) => {
    setState(s => {
      if (!['rocket-buy', 'fab'].includes(s.screen) || !s.missionId || !s.targetId) return s
      const mission = catalog.missions.find(candidate => candidate.id === s.missionId)
        ?? s.player.dailyClientPool?.missions.find(candidate => candidate.id === s.missionId)
      const target = catalog.targets.find(candidate => candidate.id === s.targetId)
      const vehicle = s.player.stagedRockets?.find(candidate => candidate.id === stagedRocketId)
      if (!mission || !target || !vehicle || !stagedRocketSupportsMission(vehicle, s, mission, target, catalog)) return s
      const reassigned = { ...vehicle, missionId: mission.id, targetId: target.id, deliveryTargetId: s.deliveryTargetId }
      const reassignedState = selectStagedRocket({
        ...s,
        screen: 'fab',
        player: { ...s.player, stagedRockets: (s.player.stagedRockets ?? []).map(candidate => candidate.id === vehicle.id ? reassigned : candidate) },
      }, reassigned)
      // A reassigned compatible vehicle is ready for launch immediately.
      // The previous extra Hangar-to-pad tap made the same contract diverge
      // based on which order the player explored setup controls.
      return rollOutToPad(reassignedState) ?? reassignedState
    })
  }, [catalog.missions, catalog.parts, catalog.targets, setState])

  const onTransferToLaunchpad = useCallback(() => {
    setState(s => {
      const vehicle = s.player.stagedRockets?.find(candidate => candidate.id === s.player.selectedStagedRocketId)
      if (s.screen !== 'fab' || !vehicle || vehicle.location !== 'hangar') return s
      const transferred = { ...vehicle, location: 'launchpad' as const }
      return selectStagedRocket({ ...s, player: { ...s.player, stagedRockets: s.player.stagedRockets?.map(candidate => candidate.id === vehicle.id ? transferred : candidate) } }, transferred)
    })
  }, [catalog.missions, setState])

  /** Remove only an unlaunched physical vehicle. Mission selection stays in place so the player can build a replacement or change it. */
  const onDismantleStagedRocket = useCallback(() => {
    setState(s => {
      if (s.player.activeMission) return s
      const selectedId = s.player.selectedStagedRocketId
      const vehicle = s.player.stagedRockets?.find(candidate => candidate.id === selectedId)
      if (!vehicle) return s
      const stagedRockets = (s.player.stagedRockets ?? []).filter(candidate => candidate.id !== vehicle.id)
      const next = stagedRockets[0]
      return {
        ...s,
        player: {
          ...s.player,
          pendingLaunch: stagedRockets.length > 0,
          stagedRockets,
          selectedStagedRocketId: next?.id,
          pendingRocketId: next?.rocketId,
          pendingRocketLocation: next?.location,
          pendingRocketSource: next?.source,
        },
      }
    })
  }, [setState])

  const onFabricateRocketPart = useCallback((rocketId: string, componentId: string) => {
    setState(s => {
      if (s.screen !== 'rocket-buy' || !s.missionId || !s.targetId) return s
      if (!ROCKET_MODELS.some(rocket => rocket.id === rocketId)) return s
      return applyFabricateRocketPart(s, rocketId, componentId)
    })
  }, [setState])

  const onAssembleFabricatedRocket = useCallback((rocketId: string) => {
    setState(s => {
      if (s.screen !== 'rocket-buy' || !s.missionId || !s.targetId) return s
      const rocket = ROCKET_MODELS.find(candidate => candidate.id === rocketId)
      if (!rocket) return s
      const mission = catalog.missions.find(m => m.id === s.missionId)
        ?? s.player.dailyClientPool?.missions.find(m => m.id === s.missionId)
        ?? null
      if (mission && !rocketCompatibleWithMission(rocket, mission)) return s
      if (s.player.stagedRockets?.some(vehicle => vehicle.rocketId === rocket.id && vehicle.missionId === s.missionId && vehicle.targetId === s.targetId)) {
        return { ...s, screen: 'fab', doneSteps: { ...s.doneSteps, 8: true } }
      }
      const next = applyAssembleFabricatedRocket(s, rocket)
      return { ...next, doneSteps: { ...next.doneSteps, 8: true } }
    })
  }, [catalog.missions, setState])

  const onLaunch = useCallback(() => {
    const current = stateRef.current
    const selectedVehicle = current.player.stagedRockets?.find(vehicle => vehicle.id === current.player.selectedStagedRocketId)
    if ((current.screen !== 'fab' && current.screen !== 'launchpad') || !current.missionId || !current.targetId || current.player.activeMission || !selectedVehicle || selectedVehicle.location === 'hangar') return
    const currentMission = catalog.missions.find(m => m.id === current.missionId)
      ?? current.player.dailyClientPool?.missions.find(m => m.id === current.missionId)
      ?? null
    if (!currentMission) return
    const isFirstEver = current.player.missionsDone === 0
    let launchedTransitStartedAt: number | null = null
    let earnedLaunchBadge: 'gold' | 'silver' | null = null
    let ascentFragments = 0
    setState(s => {
      const vehicle = s.player.stagedRockets?.find(candidate => candidate.id === s.player.selectedStagedRocketId)
      if ((s.screen !== 'fab' && s.screen !== 'launchpad') || !s.missionId || !s.targetId || s.player.activeMission || !vehicle || vehicle.location !== 'launchpad') return s
      const mission = s.missionId
        ? (catalog.missions.find(m => m.id === s.missionId)
           ?? s.player.dailyClientPool?.missions.find(m => m.id === s.missionId)
           ?? null)
        : null
      const target = s.targetId ? catalog.targets.find(t => t.id === s.targetId) : null
      if (!mission || !target) return s
      const timedTransit = s.player.freeOperations
      const transitStartedAt = Date.now()
      launchedTransitStartedAt = transitStartedAt
      const remainingStagedRockets = (s.player.stagedRockets ?? []).filter(candidate => candidate.id !== vehicle.id)
      const nextStagedRocket = remainingStagedRockets[0]
      const arrivalAt = (timedTransit && target)
        ? transitStartedAt + travelDurationMs(target, ORBIT_MS_PER_UNIT)
        : null
      // SSL-491: the Rocket Revolution tier follows the launch, not the later
      // debrief, so a flight inside the window stays gold.
      const at = skyEventNow(isDevLauncherEnabled())
      const beforeBadge = s.player.badges?.['rocket-revolution-2026']
      const badged = grantSkyBadges(s.player, 'launch', at)
      const earned = badged.badges?.['rocket-revolution-2026']
      if (earned && earned !== beforeBadge) earnedLaunchBadge = earned.tier
      const ascended = applyLaunchCatch(badged, at)
      ascentFragments = (ascended.orionidsFragments?.caught ?? 0) - (badged.orionidsFragments?.caught ?? 0)
      return {
        ...s,
        player: {
          ...ascended,
          pendingLaunch: remainingStagedRockets.length > 0,
          pendingRocketId: nextStagedRocket?.rocketId,
          pendingRocketLocation: nextStagedRocket?.location,
          missionRocketSource: vehicle.source,
          pendingRocketSource: nextStagedRocket?.source,
          stagedRockets: remainingStagedRockets,
          selectedStagedRocketId: nextStagedRocket?.id,
          arrivalAt,
          // Keep the launch timestamp for tutorial legs too. Tutorial transit
          // is fast, but it must resume from its real position after a remount
          // instead of restarting at the first frame.
          transitStartedAt,
          missionPhase: 'transit',
          activeMission: mission && target
            ? { id: mission.id, label: missionTypePrimer(mission).label + ' → ' + target.name }
            : null,
        },
        screen: 'transit',
        doneSteps: { ...s.doneSteps, 5: true },
      }
    })
    const userId = pbLandnam.authStore.record?.id
    if (userId) {
      // The id is minted here so the run can be updated straight away, even
      // while offline; the outbox replays the create, then its updates, in
      // order once a connection returns (SSL-321). transitStartedAt is unique
      // per launch, so the state write below only ever lands on its own run.
      const runId = queueCreate('mission_runs', {
        user: userId,
        mission_id: currentMission.id,
        target_id: current.targetId,
        status: 'in_progress',
        phase: 'transit',
        cargo: {},
        launched_at: new Date().toISOString(),
      })
      missionRunIdRef.current = runId
      setState(s => (s.player.activeMission?.id === currentMission.id && s.player.transitStartedAt === launchedTransitStartedAt)
        ? { ...s, player: { ...s.player, missionRunId: runId } }
        : s)
    }
    captureGameEvent('rocket_launched', { mission_id: currentMission.id, target_id: current.targetId, is_first_ever: isFirstEver })
    if (earnedLaunchBadge) addToast(`Rocket Revolution badge · ${earnedLaunchBadge === 'gold' ? 'Gold' : 'Silver'}`, 'ok')
    if (ascentFragments > 0) addToast(`${ascentFragments} Orionid fragments caught on the way up`, 'info', { sticky: true })
    if (isFirstEver) enqueueSurvey('lnm_first_launch', 4000)
  }, [addToast, catalog.missions, catalog.targets, setState, stateRef])

  const onMiningDone = useCallback((cargo: Record<string, number>) => {
    let hasDelivery = false
    const transitStartedAt = Date.now()
    setState(s => {
      hasDelivery = !!s.deliveryTargetId
      const nextLegTarget = hasDelivery
        ? catalog.targets.find(t => t.id === s.deliveryTargetId)
        : (s.targetId ? catalog.targets.find(t => t.id === s.targetId) : null)
      // SSL-553: the trip home is a short playable flight (boost to arrive); only a delivery leg runs on the clock.
      const timedTransit = s.player.freeOperations && hasDelivery
      const arrivalAt = (timedTransit && nextLegTarget)
        ? transitStartedAt + travelDurationMs(nextLegTarget, ORBIT_MS_PER_UNIT)
        : null
      return applyMiningDone(s, cargo, arrivalAt, timedTransit ? transitStartedAt : null)
    })
    const runId = stateRef.current.player.missionRunId ?? missionRunIdRef.current
    if (runId) {
      queueUpdate('mission_runs', runId, {
        status: 'in_progress', phase: hasDelivery ? 'transit' : 'debrief', cargo,
      })
    }
    // The transit/debrief screen supplies this status in its own persistent
    // readout. A global toast survives the route change and obscures the next
    // operation on compact screens, so do not duplicate it here.
  }, [catalog.targets, setState, stateRef])

  const onDeliveryArrived = useCallback(() => {
    const startedAt = Date.now()
    setState(s => applyDeliveryArrived(s, startedAt))
    const runId = stateRef.current.player.missionRunId ?? missionRunIdRef.current
    if (runId) {
      queueUpdate('mission_runs', runId, {
        status: 'in_progress', phase: 'delivery',
      })
    }
    // The dedicated delivery view has the berth and transfer state in its
    // persistent HUD. Keeping another global notification across this route
    // change makes the compact layout look like a stack of modal surfaces.
  }, [setState, stateRef])

  const onDeliveryUnloadComplete = useCallback(() => {
    const transitStartedAt = Date.now()
    setState(s => {
      const deliveryTarget = s.deliveryTargetId ? catalog.targets.find(t => t.id === s.deliveryTargetId) : null
      const timedTransit = s.player.freeOperations
      const arrivalAt = (timedTransit && deliveryTarget)
        ? transitStartedAt + travelDurationMs(deliveryTarget, ORBIT_MS_PER_UNIT)
        : null
      return applyDeliveryUnloadComplete(s, arrivalAt, transitStartedAt)
    })
    const runId = stateRef.current.player.missionRunId ?? missionRunIdRef.current
    if (runId) {
      queueUpdate('mission_runs', runId, {
        status: 'in_progress', phase: 'transit', cargo: {},
      })
    }
    // Transit owns the inbound status. Do not leave a transient toast over
    // the next operation once the transfer screen disappears.
  }, [catalog.targets, setState, stateRef])

  const onReturnArrived = useCallback(() => {
    setState(s => applyReturnArrived(s))
    // Debrief owns the recovery outcome and cargo receipt; a transient global
    // notification would cover the next task if the player advances quickly.
  }, [setState])

  const onRoverSurveyComplete = useCallback(() => {
    setState(s => s.screen === 'rover-survey'
      ? { ...s, screen: 'mining', player: { ...s.player, missionPhase: 'mining' } }
      : s)
  }, [setState])

  const onLandingTouchdown = useCallback(() => {
    setState(s => {
      if (s.screen !== 'landing') return s
      return applyLandingTouchdown({
        ...s,
        player: {
          ...s.player,
          missionPhase: 'landing',
          // A resumed descent whose clock was never saved is already due.
          landingStartedAt: s.player.landingStartedAt ?? Date.now(),
        },
      })
    })
    addToast('Touchdown confirmed — surface operations underway', 'ok')
  }, [addToast, setState])

  const onRedockComplete = useCallback((cargo: Record<string, number>) => {
    let hasDelivery = false
    const transitStartedAt = Date.now()
    setState(s => {
      hasDelivery = !!s.deliveryTargetId
      const nextLegTarget = hasDelivery
        ? catalog.targets.find(t => t.id === s.deliveryTargetId)
        : (s.targetId ? catalog.targets.find(t => t.id === s.targetId) : null)
      // Same return leg as onMiningDone (SSL-553): only a delivery leg runs on the clock.
      const timedTransit = s.player.freeOperations && hasDelivery
      const arrivalAt = (timedTransit && nextLegTarget)
        ? transitStartedAt + travelDurationMs(nextLegTarget, ORBIT_MS_PER_UNIT)
        : null
      return applyRedockComplete(s, cargo, arrivalAt, timedTransit ? transitStartedAt : null)
    })
    addToast(hasDelivery ? 'Redock complete — course set for delivery' : 'Redock complete — return to Earth for recovery', 'ok')
  }, [addToast, catalog.targets, setState])

  const onRedeemFragments = useCallback(() => {
    let did = false
    setState(s => {
      const next = redeemFragments(s.player)
      if (next === s.player) return s
      did = true
      return { ...s, player: next }
    })
    if (did) addToast(`Redeemed ${FRAGMENT_REDEEM_BATCH} fragments for research`, 'ok')
  }, [addToast, setState])

  const onCombineFragments = useCallback(() => {
    let did = false
    setState(s => {
      const next = combineFragments(s.player)
      if (next === s.player) return s
      did = true
      return { ...s, player: next }
    })
    if (did) addToast(`Combined ${FRAGMENTS_PER_FIREBALL} fragments into a fireball`, 'ok')
  }, [addToast, setState])

  const gainResearchXP = useCallback((amount: number) => {
    setState(s => applyGainResearchXP(s, amount))
  }, [setState])

  const startSurveyScan = useCallback((targetId: string) => {
    setState(s => applyStartScan(s, targetId, Date.now()))
    captureGameEvent('survey_scan_started', { target_id: targetId })
  }, [setState])

  // SSL-663: one stamp per research task kind per UTC day, for the calendar in the Control Station.
  const stampResearch = useCallback((kind: StampKind) => {
    setState(s => {
      const player = addStamp(s.player, kind, Date.now())
      return player === s.player ? s : { ...s, player }
    })
  }, [setState])

  const resolveSurveyScan = useCallback(() => {
    const current = stateRef.current
    const scan = current.player.activeScan
    const at = Date.now()
    if (!scan || applyResolveScan(current, at) === current) return
    stampResearch('survey')
    const target = catalog.targets.find(item => item.id === scan.targetId)
    let marked = false
    setState(s => {
      const resolved = applyResolveScan(s, at)
      if (resolved === s || target?.type !== 'planet') return resolved
      const found = grantOrionidsPlanetFind(resolved.player, {
        subjectId: target.id,
        targetId: target.id,
        name: target.name,
        at,
      })
      if (found.granted) {
        marked = true
        queueOrionidsFind(found.granted)
        if (found.masteryGranted) queueMeteoriteMastery(found.granted.earnedAt)
      }
      return found.player === resolved.player ? resolved : { ...resolved, player: found.player }
    })
    captureGameEvent('survey_scan_completed', { target_id: scan.targetId })
    addToast(
      marked
        ? 'Scan complete. Planet charted. Orionids-found voucher owned. Redeem coming soon.'
        : 'Scan complete. Body charted and research XP awarded.',
      'ok',
    )
  }, [addToast, catalog.targets, setState, stateRef])

  const unlockBlueprint = useCallback((
    blueprintId: string,
    costFrancs = 0,
    costXP = 0,
    costMaterials: Record<string, number> = {},
  ) => {
    setState(s => applyUnlockBlueprint(s, blueprintId, costFrancs, costXP, costMaterials))
  }, [setState])

  const launchTransitSatellite = useCallback(() => {
    setState(s => {
      if (!s.player.freeOperations || s.player.transitSatelliteLaunchedAt) return s
      return {
        ...s,
        player: {
          ...s.player,
          transitSatelliteLaunchedAt: Date.now(),
          transitSatelliteLevel: Math.max(1, s.player.transitSatelliteLevel ?? 1),
        },
      }
    })
  }, [setState])

  const submitTessClassification = useCallback((subjectId: string, verdict: TessVerdict, ranges: TransitRange[], discoveredTarget?: Target) => {
    const submittedAt = Date.now()
    stampResearch('classification')
    const roundedRanges = ranges
      .map(range => ({ x1: Math.round(range.x1 * 1000) / 1000, x2: Math.round(range.x2 * 1000) / 1000 }))
      .sort((a, b) => a.x1 - b.x1)

    // SSL-512: a first classification pays research XP; say so, since the number
    // otherwise moves with no feedback at the place the player earned it.
    if (!stateRef.current.player.tessClassifications?.[subjectId]) {
      addToast(`Transit classified. +${RESEARCH_XP_PER_FIRST_TESS_CLASSIFICATION} research XP`, 'ok')
      enqueueSurvey('lnm_citizen_task_done', 3000)
    }
    const findPreview = verdict === 'planet' && !subjectId.startsWith(TRAINING_ID_PREFIX)
      ? grantOrionidsPlanetFind(stateRef.current.player, {
        subjectId,
        targetId: discoveredTarget?.id ?? null,
        name: discoveredTarget?.name ?? subjectId,
        at: submittedAt,
      })
      : null
    if (findPreview?.granted) {
      addToast(
        findPreview.masteryGranted
          ? 'Orionids-found. Voucher owned. Meteorite mastery 1. Redeem coming soon.'
          : 'Orionids-found. Voucher owned. Redeem coming soon.',
        'ok',
      )
    }

    setState(s => {
      const existing = s.player.tessClassifications?.[subjectId]
      const replayReward = earnsTrainingReplayReward(s.player.flightPlan, 'scan')
      // The training candidate is deliberately available before Free Ops. Once
      // it is classified, Galaxy would immediately re-render as its normal
      // locked Telescope gate because the active try has advanced to Part.
      // Hand the player directly to that next try instead of leaving them on a
      // screen which says the activity they just completed is unavailable.
      const completedTrainingScan = subjectId.startsWith(TRAINING_ID_PREFIX)
        && currentTrainingTry(s.player.flightPlan) === 'scan'
      const showArtifactNarrative = artifactNarrativeEligible({
        transitSatelliteLevel: s.player.transitSatelliteLevel,
        verdict,
        hasExistingClassification: !!existing,
        seenAt: s.player.artifactNarrativeSeenAt,
      })
      const next: GameState = {
        ...s,
        screen: completedTrainingScan ? 'hangar' : s.screen,
        player: {
          ...(existing ? s.player : grantWswBadges(s.player, 'citizen-science', submittedAt)),
          researchAnnotations: existing ? s.player.researchAnnotations : s.player.researchAnnotations + 1,
          francs: s.player.francs + (replayReward ? TRAINING_REPLAY_REWARD.francs : 0),
          researchXP: (s.player.researchXP ?? 0) + (replayReward ? TRAINING_REPLAY_REWARD.researchXP : 0),
          stash: replayReward ? {
            ...(s.player.stash ?? {}),
            iron: (s.player.stash?.iron ?? 0) + TRAINING_REPLAY_REWARD.stash.iron,
          } : s.player.stash,
          flightPlan: completeFlightPlanEvent(s.player.flightPlan, 'tess-classified'),
          tessClassifications: {
            ...(s.player.tessClassifications ?? {}),
            [subjectId]: { subjectId, verdict, ranges: roundedRanges, submittedAt },
          },
          artifactNarrativeSeenAt: showArtifactNarrative
            ? submittedAt
            : s.player.artifactNarrativeSeenAt,
          discoveredExoplanetTargets: verdict === 'planet' && discoveredTarget && !subjectId.startsWith(TRAINING_ID_PREFIX)
            ? {
                ...(s.player.discoveredExoplanetTargets ?? {}),
                [discoveredTarget.id]: discoveredTarget,
              }
            : s.player.discoveredExoplanetTargets,
          // Consume the satellite-pointing choice once the target it named
          // has actually been reviewed — otherwise a stale pointing choice
          // would keep re-selecting an already-classified candidate.
          satelliteTargetId: s.player.satelliteTargetId === subjectId ? null : s.player.satelliteTargetId,
        },
        popup: showArtifactNarrative ? 'artifact-signal' : s.popup,
      }
      const settled = {
        ...next,
        player: { ...next.player, freeOperations: freeOperationsUnlocked(next.player) },
        tutorial: !freeOperationsUnlocked(next.player),
      }
      const withXp = existing || replayReward ? settled : applyGainResearchXP(settled, RESEARCH_XP_PER_FIRST_TESS_CLASSIFICATION)
      if (verdict !== 'planet' || subjectId.startsWith(TRAINING_ID_PREFIX)) return withXp
      const found = grantOrionidsPlanetFind(withXp.player, {
        subjectId,
        targetId: discoveredTarget?.id ?? null,
        name: discoveredTarget?.name ?? subjectId,
        at: submittedAt,
      })
      if (found.granted) {
        queueOrionidsFind(found.granted)
        if (found.masteryGranted) queueMeteoriteMastery(found.granted.earnedAt)
      }
      return found.player === withXp.player ? withXp : { ...withXp, player: found.player }
    })

    const userId = pbShared.authStore.record?.id
    // Flight Plan training verdicts stay local: the subject is not a real record.
    if (userId && !subjectId.startsWith(TRAINING_ID_PREFIX)) {
      // subject_classifications.dip_markers is a JSON array of single x
      // positions (see backend/migrations/7_subjects_pipeline.go) — the
      // shared backend schema predates the range-drag interaction, so we
      // submit each range's midpoint as its representative marker rather
      // than the full [x1,x2] pair.
      const dipMarkers = roundedRanges.map(range => Math.round(((range.x1 + range.x2) / 2) * 1000) / 1000)
      pbShared.collection('subject_classifications').create({
        user: userId,
        subject: subjectId,
        verdict,
        dip_markers: dipMarkers,
      }).catch(error => {
        console.warn('[TESS] classification submit failed', error)
        // KES-318: the screen's own copy promises "your call feeds live
        // classification consensus" — a silent local-only save contradicts
        // that, so surface it rather than letting ANNOTATION SAVED stand
        // unqualified.
        addToast('Saved locally — could not reach the shared classification feed', 'warn')
      })
    }
    // The TESS classification step (TessDiscoveryScreen / 'galaxy' route)
    // had no analytics coverage at all — the satellite-target-picking step
    // right before it fires lnm_satellite_clarity, but the actual
    // classification submission was invisible. No live PostHog survey
    // exists yet for this step (see micro_survey_science.json, which was
    // drafted but never created against a real project), so this is an
    // event only for now — wire a survey key here once that's created.
    captureGameEvent('tess_classification_submitted', { subject_id: subjectId, verdict })
  }, [addToast, setState, stateRef])

  // Space Telescope's asteroid-discovery classification (STS-622) — a
  // passive digest, so unlike submitTessClassification there's no
  // ranges/discoveredTarget/satelliteTargetId to thread through, just the
  // verdict record itself.
  const submitAsteroidClassification = useCallback((candidateId: string, verdict: AsteroidVerdict) => {
    const submittedAt = skyEventNow(isDevLauncherEnabled())
    stampResearch('classification')

    if (!stateRef.current.player.asteroidClassifications?.[candidateId]) {
      addToast(`Asteroid candidate classified. +${RESEARCH_XP_PER_FIRST_ASTEROID_CLASSIFICATION} research XP`, 'ok')
      enqueueSurvey('lnm_citizen_task_done', 3000)
    }

    setState(s => {
      const existing = s.player.asteroidClassifications?.[candidateId]
      const next: GameState = {
        ...s,
        player: {
          ...(existing ? s.player : grantWswBadges(grantSkyBadges(s.player, 'asteroid-classification', submittedAt), 'citizen-science', submittedAt)),
          researchAnnotations: existing ? s.player.researchAnnotations : s.player.researchAnnotations + 1,
          asteroidClassifications: {
            ...(s.player.asteroidClassifications ?? {}),
            [candidateId]: { candidateId, verdict, submittedAt },
          },
        },
      }
      return existing ? next : applyGainResearchXP(next, RESEARCH_XP_PER_FIRST_ASTEROID_CLASSIFICATION)
    })

    const userId = pbShared.authStore.record?.id
    if (userId) {
      pbShared.collection('asteroid_classifications').create({
        user: userId,
        candidate: candidateId,
        verdict,
      }).catch(error => {
        console.warn('[NEOCP] classification submit failed', error)
        addToast('Saved locally — could not reach the shared classification feed', 'warn')
      })
    }
  }, [addToast, setState, stateRef])

  // Saturn imager (SSL-492): local record first (offline-safe), then a pool
  // classification (SSC-43) when the frame came from the shared pool. Badge
  // tier comes from the SSL-491 sky event config.
  const submitSaturnClassification = useCallback((candidateId: string, cellIndex: number, verdict: SaturnVerdict, storm: boolean) => {
    const submittedAt = skyEventNow(isDevLauncherEnabled())
    stampResearch('classification')
    setState(s => {
      const existing = s.player.saturnClassifications?.[candidateId]
      // Historic whole-frame records remain complete; a new 3x3 record only
      // rejects a repeat on the same square, never the other eight squares.
      if (existing && !existing.cells) return s
      if (existing?.cells?.[cellIndex]) return s
      const cells = {
        ...(existing?.cells ?? {}),
        [cellIndex]: { verdict, storm, submittedAt },
      }
      const completed = Object.keys(cells).length === 9
      const tier = completed ? resolveSaturnBadgeTier(submittedAt) : null
      const player = {
        ...s.player,
        ...(completed ? grantWswBadges(grantSkyBadges(s.player, 'saturn-classification', submittedAt), 'citizen-science', submittedAt) : {}),
        // A completed gold frame stays active until its plot is claimed, so a reload
        // shows the finished frame instead of loading a new one (SSL-492).
        saturnActiveFrameId: completed && tier !== 'gold' ? null : candidateId,
        saturnClassifications: {
          ...(s.player.saturnClassifications ?? {}),
          [candidateId]: {
            candidateId,
            verdict,
            submittedAt,
            badgeTier: tier,
            cells,
            ...(completed ? { completedAt: submittedAt } : {}),
          },
        },
      }
      const next: GameState = {
        ...s,
        player: completed && tier === 'silver'
          ? {
              ...player,
              researchXP: (s.player.researchXP ?? 0) + RESEARCH_XP_PER_ENCELADUS_CHART,
              moonSurveyCharts: {
                ...(s.player.moonSurveyCharts ?? {}),
                enceladus: {
                  moonId: 'enceladus',
                  frameId: candidateId,
                  completedAt: submittedAt,
                  tier,
                  researchXpAwarded: RESEARCH_XP_PER_ENCELADUS_CHART,
                  atlasUnlockedAt: submittedAt,
                },
              },
            }
          : completed && tier === 'gold'
            ? {
                ...player,
                moonSurveyCharts: {
                  ...(s.player.moonSurveyCharts ?? {}),
                  enceladus: { moonId: 'enceladus', frameId: candidateId, completedAt: submittedAt, tier },
                },
              }
            : player,
      }
      return next
    })

    const answeredBefore = Object.keys(stateRef.current.player.saturnClassifications?.[candidateId]?.cells ?? {}).length
    if (answeredBefore === 8) {
      addToast('Saturn frame complete. Enceladus survey chart recorded.', 'ok')
      enqueueSurvey('lnm_citizen_task_done', 3000)
    }
    const userId = pbShared.authStore.record?.id
    // The shared collection is frame-level, while the player-side Cassini
    // instrument is deliberately 3x3. Submit a single completed-frame result
    // rather than nine indistinguishable rows without a cell coordinate.
    if (answeredBefore === 8 && userId && isSaturnPoolCandidateId(candidateId)) {
      pbShared.collection('ss_saturn_storm_classifications').create({
        user: userId,
        frame: candidateId,
        answer: verdict,
      }).catch(error => {
        console.warn('[Saturn] classification submit failed', error)
        addToast('Saved locally — could not reach the shared classification feed', 'warn')
      })
    }
  }, [setState, stateRef])

  // Player picks where the satellite points for the *next* daily downlink
  // (see PixiGalaxyStarMap / TessDiscoveryScreen) — this doesn't change today's
  // candidate, just what dailyTessCandidates prefers once today's is done.
  const chooseSatelliteTarget = useCallback((subjectId: string) => {
    setState(s => ({
      ...s,
      player: { ...s.player, satelliteTargetId: subjectId, pendingRepick: false },
    }))
    captureGameEvent('satellite_target_chosen', { subject_id: subjectId })
    enqueueSurvey('lnm_satellite_clarity', 1200)
  }, [setState])

  const onBuyLaserCapacitor = useCallback((expectedLevel: number, reservedUnits: number) => {
    setState(s => applyBuyLaserCapacitor(s, expectedLevel, reservedUnits))
  }, [setState])

  const onDebriefDone = useCallback((rawTotal: number, affinity = 0, consumed: Record<string, number> = {}, disposition?: 'store' | 'sell') => {
    const current = stateRef.current
    if (current.screen !== 'debrief' || !current.missionId || !current.targetId || !current.lastCargo) return
    if (current.missionId === ORIONIDS_NIGHT_RUN_ID) requestMissionBoardTab('events')
    if (current.missionId === ORIONIDS_NIGHT_RUN_ID || current.missionId === ORIONIDS_SURFACE_RESEARCH_MISSION_ID) stampResearch('event')
    // A self-directed ("free") haul lands in the stash on return; here the
    // player's Debrief choice decides whether it stays on Earth or is sold at
    // market. Runs as its own state step before the payout/ledger update below
    // so the sell revenue is on the balance the main update reads. Client
    // contracts and no-mineral runs are untouched — nothing changes for them.
    //
    // SSL-651: a filled Orionids shower run pays its francs and keeps the
    // fragments as fragments. Read once up front, because settling resets the
    // count the haul step below would otherwise ask.
    const showerFilled = current.missionId === ORIONIDS_NIGHT_RUN_ID && showerRunFilled(current.player)
    if (showerFilled) {
      setState(s => s.screen !== 'debrief' || s.missionId !== ORIONIDS_NIGHT_RUN_ID
        ? s
        : { ...s, player: settleShowerRun(s.player, s.player.missionsDone) })
    }
    setState(s => {
      if (s.screen !== 'debrief' || !s.missionId || !s.lastCargo) return s
      const m = catalog.missions.find(item => item.id === s.missionId)
        ?? s.player.dailyClientPool?.missions.find(item => item.id === s.missionId)
        ?? null
      if (!m || s.player.cargoSettledOffworld || !isFreeHaulMission(m, s.lastCargo)) return s
      const effective = disposition ?? s.player.freeHaulDisposition ?? (earthStorageBuilt(s.player) ? 'store' : 'sell')
      const haul = showerFilled ? withoutShowerFragments(s.lastCargo) : s.lastCargo
      const settled = applyFreeHaulDisposition(s, haul, effective, Date.now())
      // Clear the pre-mining choice (KES-283) once it's been consumed here, so
      // it never carries over and silently pre-picks the next free haul.
      return settled.player.freeHaulDisposition ? { ...settled, player: { ...settled.player, freeHaulDisposition: undefined } } : settled
    })
    const newMissionsDone = current.player.missionsDone + 1
    const completedMission = catalog.missions.find(m => m.id === current.missionId)
      ?? current.player.dailyClientPool?.missions.find(m => m.id === current.missionId)
    const completedIsStoryMission = completedMission?.tag === 'STORY' && !completedMission.deliveryTargetId
    const completedIsProgramOperation = !!completedMission && isOwnProgramMission(completedMission)
    // Already through the onboarding payout floor — DebriefScreen calibrates
    // the figure it shows and hands that exact number to `onDone`, so
    // re-applying `calibrateOnboardingPayout` here only risked the screen and
    // the ledger drifting apart. Credit what the player was shown.
    //
    // A free haul is the exception: its francs and ore are fully settled by the
    // disposition step above (sold at real market price, or kept in the silo),
    // so the main ledger update must neither credit a contract payout nor
    // consume the ore again. The screen passes 0/{} for these, but neutralize
    // here too so no code path can double-count the haul.
    const completedIsFreeHaul = !!completedMission && !current.player.cargoSettledOffworld && isFreeHaulMission(completedMission, current.lastCargo)
    const completedIsOrionidsEvent = !!completedMission && isOrionidsEventMission(completedMission)
    const total = completedIsFreeHaul ? 0 : rawTotal
    const effectiveConsumed = completedIsFreeHaul || completedIsOrionidsEvent ? {} : consumed
    setState(s => {
      if (s.screen !== 'debrief' || !s.missionId || !s.targetId || !s.lastCargo) return s
      const missionsDone = s.player.missionsDone + 1
      const mission = s.missionId
        ? (catalog.missions.find(m => m.id === s.missionId)
           ?? s.player.dailyClientPool?.missions.find(m => m.id === s.missionId)
           ?? null)
        : null
      const client = mission?.client
      const isStoryMission = mission?.tag === 'STORY' && !mission?.deliveryTargetId
      const isProgramOperation = !!mission && isOwnProgramMission(mission)
      const clientMissions = { ...s.player.clientMissions }
      if (client && !isStoryMission) {
        clientMissions[client] = (clientMissions[client] ?? 0) + Math.max(1, affinity)
      }
      const stash = { ...(s.player.stash ?? {}) }
      const replayReward = earnsTrainingReplayReward(s.player.flightPlan, 'mining')
      if (replayReward) {
        stash.iron = (stash.iron ?? 0) + TRAINING_REPLAY_REWARD.stash.iron
      }
      // A delivery-target contract already moved the minerals out of the ship
      // at the unload berth, so they never entered Earth Base storage.
      if (!mission?.deliveryTargetId) {
        for (const [id, amount] of Object.entries(effectiveConsumed)) {
          stash[id] = Math.max(0, (stash[id] ?? 0) - amount)
        }
      }
      let francs = s.player.francs + total + (replayReward ? TRAINING_REPLAY_REWARD.francs : 0)
      const seen_planets = [...(s.player.seen_planets ?? [])]
      if (s.targetId && !seen_planets.includes(s.targetId)) seen_planets.push(s.targetId)
      const effectiveTargetId = mission?.targetId ?? s.targetId ?? ''
      const constructionPlayer = mission && effectiveTargetId
        ? applyConstructionCompletion(s.player, mission, effectiveTargetId)
        : s.player
      let roverDeployments = [...(s.player.roverDeployments ?? [])]
      if (mission?.payload?.type === 'rover' && client && effectiveTargetId) {
        roverDeployments = [...roverDeployments, {
          roverId: `${mission.id}-rover-${Date.now()}`,
          targetId: effectiveTargetId,
          clientId: client,
          timestamp: Date.now(),
        }]
      }
      const completedDailyPool = (s.missionId?.startsWith('dcp-') && s.player.dailyClientPool)
        ? {
          ...s.player.dailyClientPool,
          acceptedId: null,
          completedIds: [...s.player.dailyClientPool.completedIds, s.missionId],
        }
        : s.player.dailyClientPool
      const historyRunId = s.player.missionRunId ?? `${s.missionId}:${s.player.missionsDone}`
      const completedTarget = mission?.targetId
        ? catalog.targets.find(target => target.id === mission.targetId)
        : catalog.targets.find(target => target.id === s.targetId)
      const completedMissions = [
        ...(s.player.completedMissions ?? []).filter(record => record.runId !== historyRunId),
        {
          id: mission?.id ?? s.missionId,
          title: mission?.title ?? s.player.activeMission?.label ?? s.missionId,
          targetId: completedTarget?.id,
          clientName: mission?.client,
          targetName: completedTarget?.name,
          completedAt: Date.now(),
          runId: historyRunId,
          kind: isProgramOperation ? 'program' as const : 'client' as const,
        },
      ].slice(-100)
      // SSL-332: Free Ops needs the guided missions AND a storage silo, so
      // finishing the Transport lesson normally leaves the player in training
      // (Storage stage). Only a save that already qualifies — e.g. a legacy
      // three-mission run completing M3 — crosses into Free Ops here.
      const flightPlan = completeFlightPlanEvent(s.player.flightPlan, 'mining-debriefed')
      const nextFreeOperations = freeOperationsUnlocked({ ...s.player, missionsDone, flightPlan })
      const stillInTutorial = !nextFreeOperations
      // Crossing into Free Ops on a mission tick lands on hub rather than
      // auto-opening the market straight out of debrief.
      const justFinishedOnboardingNow = !s.player.freeOperations && nextFreeOperations
      // 'tutorial-complete' fires exactly once, on the single tick Free Ops
      // actually starts — here, or on silo placement (applyPlaceStructure). It
      // rides in `popup`, which is part of the GameState blob already
      // persisted to game_states, so the ack survives reload and syncs across
      // devices with the rest of the save (KES-167).
      const popup = justFinishedOnboardingNow
        ? 'tutorial-complete'
        : s.popup
      const recovered = applyRocketStageRecovery(
        { ...s, player: { ...s.player, stash } },
        rocketModelForConfig(s.rocket),
      )
      // SSL-475: our own World Space Week badge for this mission type, graded at
      // completion. The Rocket Revolution launch badge is granted at launch.
      const wswGraded = grantWswBadges(
        constructionPlayer,
        wswMissionTypeFor(mission, s.player.freeOperations),
        skyEventNow(isDevLauncherEnabled()),
      )
      // SSL-674: a survey flight to a world the player discovered is community research.
      const eventStampedPlayer = mission?.id === ORIONIDS_NIGHT_RUN_ID || mission?.id === ORIONIDS_SURFACE_RESEARCH_MISSION_ID
        ? addStamp(wswGraded, 'event', Date.now())
        : wswGraded
      const wswBadgedPlayer = isDiscoveryMission(mission?.id ?? s.missionId) ? addStamp(eventStampedPlayer, 'discovery-mission', Date.now()) : eventStampedPlayer
      const orionidsEventStage = mission?.id === ORIONIDS_NIGHT_RUN_ID
        ? Math.max(wswBadgedPlayer.orionidsEventStage ?? 0, 1) as 0 | 1 | 2
        : mission?.id === ORIONIDS_SURFACE_RESEARCH_MISSION_ID
          ? 2 as const
          : wswBadgedPlayer.orionidsEventStage ?? 0
      const next: GameState = {
        ...s,
        player: {
          ...wswBadgedPlayer,
          francs,
          researchXP: (wswBadgedPlayer.researchXP ?? 0) + (replayReward ? TRAINING_REPLAY_REWARD.researchXP : 0),
          activeMission: null,
          missionRunId: undefined,
          missionPhase: undefined,
          miningCargoInProgress: undefined,
          miningLaserCharges: undefined,
          pausedMissionRuns: (s.player.pausedMissionRuns ?? []).filter(run => {
            if (run.key === historyRunId || (run.missionRunId && run.missionRunId === historyRunId)) return false
            return !isSettledMissionRun({ completedMissions }, {
              runId: run.missionRunId,
              missionId: run.missionId,
              targetId: run.targetId,
              launchedAt: run.transitStartedAt,
            })
          }),
          debriefPending: false,
          cargoSettledOffworld: false,
          returningToEarth: false,
          deliveryUnloadStartedAt: undefined,
          shipDestroyed: false,
          missionsDone,
          flightPlan,
          missionCount: catalog.missions.filter(m => m.sequence === missionsDone + 1).length,
          freeOperations: nextFreeOperations,
          clientMissions,
          completedMissions,
          stash: recovered.player.stash,
          missionRocketSource: undefined,
          lastClient: (isStoryMission || isProgramOperation) ? s.player.lastClient : client,
          seen_planets,
          roverDeployments,
          orionidsEventStage,
          dailyClientPool: completedDailyPool,
          transitSatelliteLaunchedAt: mission?.payload?.instrumentId === 'transit-telescope'
            ? (s.player.transitSatelliteLaunchedAt ?? Date.now())
            : s.player.transitSatelliteLaunchedAt,
          transitSatelliteLevel: mission?.payload?.instrumentId === 'transit-telescope'
            ? Math.max(1, s.player.transitSatelliteLevel ?? 1) + 1
            : s.player.transitSatelliteLevel,
          // One telescope: launching it brings the transit and asteroid feeds online together.
          deepSpaceTelescopeBuilt: mission?.payload?.instrumentId === 'transit-telescope' || s.player.deepSpaceTelescopeBuilt,
          deepSpaceTelescopeLaunchedAt: mission?.payload?.instrumentId === 'transit-telescope'
            ? (s.player.deepSpaceTelescopeLaunchedAt ?? Date.now())
            : s.player.deepSpaceTelescopeLaunchedAt,
          saturnImagerLaunchedAt: mission?.payload?.instrumentId === 'saturn-imager'
            ? (s.player.saturnImagerLaunchedAt ?? Date.now())
            : s.player.saturnImagerLaunchedAt,
        },
        lastCargo: null,
        deliveredCargo: null,
        missionId: null,
        targetId: null,
        deliveryTargetId: null,
        tutorial: stillInTutorial,
        popup,
        doneSteps: { ...s.doneSteps, 9: true },
          screen: mission?.payload?.type === 'satellite'
            ? 'instrument-hub'
            : mission?.id === ORIONIDS_NIGHT_RUN_ID
              ? 'missions'
              : isProgramOperation
              ? 'launchpad'
              : flightPlan.completed.mining && !flightPlan.completed.scan
                ? 'galaxy'
              : 'hub',
      }
      return applyGainResearchXP(next, mission?.programReward?.researchXP ?? 0)
    })
    // The destination HUD/debrief presents the collected reward. Keeping a
    // second global confirmation leaks it over the following mission setup.
    const userId = pbShared.authStore.record?.id
    if (userId) {
      queueCreate('mission_log', {
        user: userId,
        mission_id: current.missionId,
        target_id: current.targetId,
        payout_francs: total,
        minerals_delivered: effectiveConsumed,
        missions_done_after: newMissionsDone,
        completed_at: new Date().toISOString(),
      })
    }
    const runId = current.player.missionRunId ?? missionRunIdRef.current
    const completedRun = {
      status: 'completed', phase: 'debrief', cargo: current.deliveredCargo ?? current.lastCargo,
      payout_francs: total, completed_at: new Date().toISOString(),
    }
    if (runId) {
      queueUpdate('mission_runs', runId, completedRun)
    } else if (userId) {
      // SSL-553: a run whose id was lost (reload, merge) used to stay in_progress
      // forever while the save said activeMission = null. Close it by contract.
      void pbLandnam.collection('mission_runs')
        .getFullList({ filter: pbLandnam.filter('user = {:user} && status = "in_progress" && mission_id = {:mission}', { user: userId, mission: current.missionId }) })
        .then(runs => runs.forEach(run => queueUpdate('mission_runs', run.id, completedRun)))
        .catch(() => {})
    }
    missionRunIdRef.current = null
    // Unconditional analytics event — separate from the (now sampled)
    // survey queue below, so mission-completion volume and drop-off stay
    // fully visible in PostHog Trends/Funnels for every player, not just
    // the ones who also get a survey this time.
    captureGameEvent('mission_completed', {
      mission_id: current.missionId,
      missions_done: newMissionsDone,
      mission_type: completedMission?.payload?.type ?? null,
      is_story_mission: completedIsStoryMission,
      payout_francs: total,
    })
    // SSL-342: fires exactly once, on the tick the freeOperations flip above
    // happens (the silo-placement route fires it from GameScreenRouter). Read
    // from `current`, not the setState updater, which may run twice.
    if (!current.player.freeOperations && freeOperationsUnlocked({ missionsDone: newMissionsDone, placed: current.player.placed })) {
      captureFreeOpsUnlocked(newMissionsDone, 'mission')
    }
    // Mission feedback belongs to the post-mission checkpoint. Queue it only
    // after debrief collection so it cannot surface over the next mission
    // board while the player is choosing a new contract.
    //
    // A player's first-ever mission always gets the full post-mission
    // survey set — it's their first encounter with the mechanic. Every
    // mission after that only surveys the PostHog-gated repeat cohort, so
    // most players aren't stopped by a popup after every single mission.
    const isFirstMissionEver = newMissionsDone === 1
    if (isFirstMissionEver || isRepeatSurveyEligible()) {
      enqueueSurvey('lnm_mission_friction', 0)
      enqueueSurvey('lnm_mining_feel', 60_000)
      if (completedMission?.payload?.type === 'rover') enqueueSurvey('lnm_rover_clarity', 60_000)
      if (current.player.missionsDone >= 1 && !completedIsStoryMission && !completedIsProgramOperation) {
        enqueueSurvey('lnm_client_pick', 60_000)
      }
    }
    if (current.player.freeOperations) enqueueSurvey('lnm_free_ops_first', 5000)
    if (isFirstMissionEver) {
      enqueueSurvey('lnm_m1_complete', 3000)
      enqueueSurvey('lnm_progression_feel', 8000)
    }
    // Guided-mission-2 feedback is split between players rather than both
    // landing on everyone — which survey a player sees is decided by the
    // `landnam-milestone-survey-variant` PostHog flag. Since SSL-332 mission 2
    // is the Transport lesson (after the Prospector purchase), so the 'm2'
    // cohort gets the mission-choice / rocket surveys and the 'm3' cohort the
    // transport surveys at the same milestone. `milestone_reached` fires
    // regardless of variant.
    if (newMissionsDone === 2) {
      captureGameEvent('milestone_reached', { milestone: 'm2' })
    }
    const milestoneVariant = getMilestoneSurveyVariant()
    // Split 2026-08-27 (KES-262) — was one 4-question survey paged in a
    // single modal; now 4 single-question surveys enqueued together and let
    // the existing 60s-gap FIFO dispatcher (lib/surveys.ts) space them out.
    if (newMissionsDone === 2 && milestoneVariant === 'm2') {
      enqueueSurvey('lnm_m2_mission_choice', 3000)
      enqueueSurvey('lnm_m2_rocket_clarity', 3000)
      enqueueSurvey('lnm_m2_rating', 3000)
      enqueueSurvey('lnm_m2_freetext', 3000)
    }
    if (newMissionsDone === 2 && milestoneVariant === 'm3') {
      enqueueSurvey('lnm_m3_transport_clarity', 5000)
      enqueueSurvey('lnm_m3_client_choice', 5000)
      enqueueSurvey('lnm_m3_rating', 5000)
      enqueueSurvey('lnm_m3_freetext', 5000)
    }
    // Guided missions are followed by the silo build, not a mission at the next
    // sequence, so only count "ran out of missions" from the first Free Ops
    // tier onward (the same point it could first fire before SSL-332).
    if (newMissionsDone >= FREE_OPS_MISSION_SEQUENCE && !catalog.missions.some(m => m.sequence === newMissionsDone + 1)) enqueueSurvey('lnm_end_of_content', 5000)
  }, [addToast, catalog.missions, setState, stampResearch, stateRef])

  const onDebriefDoneRef = useRef(onDebriefDone)
  onDebriefDoneRef.current = onDebriefDone

  /** SSL-553: settle the delivery sheet. Market and silo shares settle here; the client share runs through the debrief ledger. */
  const onHomeDelivery = useCallback((split: HomeSplit) => {
    const current = stateRef.current
    if (current.screen !== 'debrief' || !current.player.homeDeliveryPending || !current.lastCargo) return
    const mission = current.missionId
      ? catalog.missions.find(m => m.id === current.missionId) ?? current.player.dailyClientPool?.missions.find(m => m.id === current.missionId)
      : undefined
    const demand = clientDemand(mission, current.lastCargo)
    const payout = clientPayout(mission, split, demand, current.player.missionsDone)
    const affinity = payout > 0 && mission?.client ? Math.max(0, mission.payout.affinity) : 0
    let consumed: Record<string, number> = {}
    setState(s => {
      const settled = applyHomeSplit(s, split, Date.now())
      consumed = settled.consumed
      return settled.state
    })
    onDebriefDoneRef.current(payout, affinity, consumed)
  }, [catalog.missions, setState, stateRef])

  return {
    setPlayer, setMissionId, setTargetId, setRocket, setLastCargo,
    onPickMission, onPickTarget, onPurchaseRocket, onMoveStagedRocket, onFabricateRocketPart, onAssembleFabricatedRocket, onTransferToLaunchpad, onDismantleStagedRocket, onLaunch, onRedeemFragments, onCombineFragments, resumeMissionRun,
    onMiningDone, onDeliveryArrived, onDeliveryUnloadComplete, onReturnArrived, onRoverSurveyComplete, onDebriefDone, onHomeDelivery, onBuyLaserCapacitor,
    onLandingTouchdown, onRedockComplete,
    gainResearchXP, startSurveyScan, resolveSurveyScan, unlockBlueprint, launchTransitSatellite, submitTessClassification, chooseSatelliteTarget,
    submitAsteroidClassification, submitSaturnClassification,
  }
}
