import { useCallback, useRef } from 'react'
import {
  MISSIONS, TARGETS, ROCKET_MODELS, FREE_OPS_START_MISSIONS_DONE,
  getLaserChargeCap, rocketModelForConfig, travelDurationMs, suggestBuild,
  feasibleTargetsFor,
  isOwnProgramMission,
  isFreeHaulMission,
  artifactNarrativeEligible,
  missionTypePrimer,
  BANKRUPTCY_THRESHOLD,
} from '@/lib/data'
import { applyMiningDone, applyReturnArrived, applyRoverMiningDone } from '@/lib/systems/MiningSystem'
import { applyDeliveryArrived, applyDeliveryUnloadComplete } from '@/lib/systems/DeliverySystem'
import { applyLandingTouchdown, applyRedockComplete } from '@/lib/systems/LandingSystem'
import { applyAwardMissionCrewXP, crewRequirementStatus, diplomacyPayoutMultiplier, missionCrewForLaunch } from '@/lib/systems/AcademySystem'
import { applyAssembleFabricatedRocket, applyFabricateRocketPart, applyFreeHaulDisposition, applyPurchaseRocket, applyRemoteHaulDisposition, applyRocketStageRecovery, earthStorageBuilt, hasOperationalRemoteSilo } from '@/lib/systems/EconomySystem'
import { applyConstructionCompletion } from '@/lib/systems/ConstructionSystem'
import { loanOutstanding, repayBankruptcyLoan } from '@/lib/systems/TreasurySystem'
import { TREASURY_PLAYER_ID } from '@/lib/systems/ProgressionSystem'
import { enqueueSurvey, isRepeatSurveyEligible, getMilestoneSurveyVariant } from '@/lib/surveys'
import { captureGameEvent } from '@/lib/posthog'
import type { Catalog } from '@/lib/catalog'
import type { GameState, LicenseGrade, MissionRunSnapshot } from '@/lib/game-types'
import type { Target, TessVerdict, TransitRange, AsteroidVerdict } from '@/lib/data'
import type { Toast } from '@/components/ui/ToastLayer'
import { applyGainResearchXP, applyUpgradeLicenseGrade, applyUnlockBlueprint } from '@/lib/systems/ProgressionSystem'
import { pbShared } from '@/lib/pb'
import { pbLandnam } from '@/lib/pb-landnam'
import { justFinishedOnboarding } from '@/lib/game-state'

// 42s/orbit-unit — a ~65% cut from the original 2min/unit pace (KES-262):
// full round trips were running long enough that players felt locked out of
// the game for the whole leg.
const ORBIT_MS_PER_UNIT = 42 * 1000
// First-time-only reward for classifying a TESS candidate — repeat looks at an
// already-classified subject earn nothing (see submitTessClassification).
const RESEARCH_XP_PER_FIRST_TESS_CLASSIFICATION = 15
const RESEARCH_XP_PER_FIRST_ASTEROID_CLASSIFICATION = 15
interface GameLoopOpts {
  stateRef: React.RefObject<GameState>
  setState: React.Dispatch<React.SetStateAction<GameState>>
  catalog: Catalog
  addToast: (message: string, kind?: Toast['kind']) => void
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
    deliveryUnloadStartedAt: state.player.deliveryUnloadStartedAt,
    landingStartedAt: state.player.landingStartedAt,
    landingReturnStartedAt: state.player.landingReturnStartedAt,
    arrivalAt: state.player.arrivalAt,
    transitStartedAt: state.player.transitStartedAt,
    missionRocketSource: state.player.missionRocketSource,
    missionCrewIds: state.player.missionCrewIds,
    debriefPending: state.player.debriefPending,
    cargoSettledOffworld: state.player.cargoSettledOffworld,
    pendingRemoteDisposition: state.player.pendingRemoteDisposition,
    freeHaulDisposition: state.player.freeHaulDisposition,
    returningToEarth: state.player.returningToEarth,
    headingToDelivery: state.player.headingToDelivery,
    shipDestroyed: state.player.shipDestroyed,
  }
}

function restoreMissionSnapshot(state: GameState, snapshot: MissionRunSnapshot): GameState {
  return {
    ...state,
    screen: snapshot.missionPhase ?? 'transit',
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
      deliveryUnloadStartedAt: snapshot.deliveryUnloadStartedAt,
      landingStartedAt: snapshot.landingStartedAt,
      landingReturnStartedAt: snapshot.landingReturnStartedAt,
      arrivalAt: snapshot.arrivalAt,
      transitStartedAt: snapshot.transitStartedAt,
      missionRocketSource: snapshot.missionRocketSource,
      missionCrewIds: snapshot.missionCrewIds,
      debriefPending: snapshot.debriefPending,
      cargoSettledOffworld: snapshot.cargoSettledOffworld,
      pendingRemoteDisposition: snapshot.pendingRemoteDisposition,
      freeHaulDisposition: snapshot.freeHaulDisposition,
      returningToEarth: snapshot.returningToEarth,
      headingToDelivery: snapshot.headingToDelivery,
      shipDestroyed: snapshot.shipDestroyed,
    },
  }
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
    setState(s => {
      if (s.screen !== 'missions' && s.screen !== 'launchpad') return s
      let mission = catalog.missions.find(m => m.id === id)
        ?? s.player.dailyClientPool?.missions.find(m => m.id === id)
        ?? null
      if (!mission) return s
      let nextDailyPool = s.player.dailyClientPool
      if (id.startsWith('dcp-') && mission.client && nextDailyPool) {
        const multiplier = diplomacyPayoutMultiplier(s.player, mission.client)
        if (multiplier > 1) {
          mission = {
            ...mission,
            payout: { ...mission.payout, francs: Math.round(mission.payout.francs * multiplier) },
          }
          nextDailyPool = {
            ...nextDailyPool,
            missions: nextDailyPool.missions.map(item => item.id === id ? mission! : item),
          }
        }
      }
      if (mission.jointProject && s.player.francs < mission.jointProject.playerCost) return s
      const ownOperation = isOwnProgramMission(mission)
      if (s.screen === 'launchpad' && !ownOperation) return s
      if (s.screen === 'missions' && s.player.freeOperations && ownOperation) return s
      const dailyClientPool = (nextDailyPool && id.startsWith('dcp-'))
        ? { ...nextDailyPool, acceptedId: id }
        : nextDailyPool
      // Selecting another mission parks the current operational context first.
      // The old single `activeMission` guard made this a silent no-op; runs are
      // now independently resumable, with no arbitrary capacity limit.
      const parkedRun = snapshotActiveMission(s)
      const pausedMissionRuns = parkedRun
        ? [...(s.player.pausedMissionRuns ?? []).filter(run => run.key !== parkedRun.key), parkedRun]
        : s.player.pausedMissionRuns
      const base = {
        ...s,
        lastCargo: parkedRun ? null : s.lastCargo,
        deliveredCargo: parkedRun ? null : s.deliveredCargo,
        player: {
          ...s.player,
          dailyClientPool,
          francs: s.player.francs - (mission.jointProject?.playerCost ?? 0),
          pausedMissionRuns,
          activeMission: parkedRun ? null : s.player.activeMission,
          missionRunId: parkedRun ? undefined : s.player.missionRunId,
          missionPhase: parkedRun ? undefined : s.player.missionPhase,
          miningCargoInProgress: parkedRun ? undefined : s.player.miningCargoInProgress,
          deliveryUnloadStartedAt: parkedRun ? undefined : s.player.deliveryUnloadStartedAt,
          landingStartedAt: parkedRun ? undefined : s.player.landingStartedAt,
          landingReturnStartedAt: parkedRun ? undefined : s.player.landingReturnStartedAt,
          arrivalAt: parkedRun ? undefined : s.player.arrivalAt,
          transitStartedAt: parkedRun ? undefined : s.player.transitStartedAt,
          missionRocketSource: parkedRun ? undefined : s.player.missionRocketSource,
          missionCrewIds: parkedRun ? [] : s.player.missionCrewIds,
          debriefPending: parkedRun ? false : s.player.debriefPending,
          cargoSettledOffworld: parkedRun ? false : s.player.cargoSettledOffworld,
          pendingRemoteDisposition: parkedRun ? undefined : s.player.pendingRemoteDisposition,
          freeHaulDisposition: parkedRun ? undefined : freeHaulDisposition ?? s.player.freeHaulDisposition,
          returningToEarth: parkedRun ? false : s.player.returningToEarth,
          headingToDelivery: parkedRun ? false : s.player.headingToDelivery,
          shipDestroyed: parkedRun ? false : s.player.shipDestroyed,
        },
      }
      if (mission?.targetId) {
        const target = catalog.targets.find(t => t.id === mission.targetId) ?? null
        const deliveryTarget = mission.deliveryTargetId ? catalog.targets.find(t => t.id === mission.deliveryTargetId) ?? null : null
        const next = suggestBuild({ mission, target, deliveryTarget, missionsDone: s.player.missionsDone, launchpadUpgraded: s.player.launchpadUpgraded, parts: catalog.parts, unlockedSkillNodes: s.player.unlockedSkillNodes ?? [] })
        if (mission.payload?.type === 'rover') next.drill = 'cargo-module-t1'
        return {
          ...base,
          missionId: id,
          targetId: mission.targetId,
          deliveryTargetId: mission.deliveryTargetId ?? null,
          rocket: s.player.pendingLaunch ? s.rocket : next,
          screen: s.player.pendingLaunch ? 'fab' : 'rocket-buy',
          doneSteps: { ...s.doneSteps, 2: true, 3: true },
        }
      }
      return {
        ...base,
        missionId: id,
        targetId: null,
        deliveryTargetId: mission.deliveryTargetId ?? null,
        screen: 'targets',
        doneSteps: { ...s.doneSteps, 2: true },
      }
    })
  }, [catalog.missions, catalog.parts, catalog.targets, setState])

  const onPickTarget = useCallback((id: string) => {
    setState(s => {
      if (s.screen !== 'targets' || !s.missionId) return s
      const mission = s.missionId ? catalog.missions.find(m => m.id === s.missionId) ?? null : null
      const target = catalog.targets.find(t => t.id === id) ?? null
      if (!mission || !target) return s
      if (!feasibleTargetsFor(mission, catalog.targets, catalog.parts, s.player.missionsDone, s.player.launchpadUpgraded, s.player.unlockedSkillNodes ?? []).some(item => item.id === id)) return s
      const next = suggestBuild({ mission, target, missionsDone: s.player.missionsDone, launchpadUpgraded: s.player.launchpadUpgraded, parts: catalog.parts, unlockedSkillNodes: s.player.unlockedSkillNodes ?? [] })
      return {
        ...s,
        targetId: id,
        rocket: s.player.pendingLaunch ? s.rocket : next,
        screen: s.player.pendingLaunch ? 'fab' : 'rocket-buy',
        doneSteps: { ...s.doneSteps, 3: true },
      }
    })
  }, [catalog.missions, catalog.parts, catalog.targets, setState])

  const onPurchaseRocket = useCallback((rocketId: string) => {
    setState(s => {
      if (s.screen !== 'rocket-buy' || !s.missionId || !s.targetId) return s
      const rocket = ROCKET_MODELS.find(r => r.id === rocketId)
      if (!rocket) return s
      if (s.player.pendingLaunch && s.player.pendingRocketId === rocket.id) return { ...s, screen: 'fab' }
      return applyPurchaseRocket(s, rocket)
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
      if (s.player.pendingLaunch && s.player.pendingRocketId === rocket.id) return { ...s, screen: 'fab' }
      return applyAssembleFabricatedRocket(s, rocket)
    })
  }, [setState])

  const onLaunch = useCallback(() => {
    const current = stateRef.current
    if (current.screen !== 'fab' || !current.missionId || !current.targetId || current.player.activeMission) return
    const currentMission = catalog.missions.find(m => m.id === current.missionId)
      ?? current.player.dailyClientPool?.missions.find(m => m.id === current.missionId)
      ?? null
    if (!currentMission) return
    const currentCrewStatus = crewRequirementStatus(currentMission.requires.crew, current.player.crew ?? [])
    const currentMissionCrew = missionCrewForLaunch(current, currentMission)
    if (currentMission.requires.crew && (!currentCrewStatus.met || currentMissionCrew.length === 0)) return
    const isFirstEver = current.player.missionsDone === 0
    setState(s => {
      if (s.screen !== 'fab' || !s.missionId || !s.targetId || s.player.activeMission) return s
      const mission = s.missionId
        ? (catalog.missions.find(m => m.id === s.missionId)
           ?? s.player.dailyClientPool?.missions.find(m => m.id === s.missionId)
           ?? null)
        : null
      const target = s.targetId ? catalog.targets.find(t => t.id === s.targetId) : null
      if (!mission || !target) return s
      const crewStatus = crewRequirementStatus(mission.requires.crew, s.player.crew ?? [])
      const missionCrewIds = missionCrewForLaunch(s, mission)
      if (mission.requires.crew && (!crewStatus.met || missionCrewIds.length === 0)) return s
      const timedTransit = s.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE
      const transitStartedAt = Date.now()
      const arrivalAt = (timedTransit && target)
        ? transitStartedAt + travelDurationMs(target, s.player.unlockedSkillNodes ?? [], ORBIT_MS_PER_UNIT)
        : null
      return {
        ...s,
        player: {
          ...s.player,
          pendingLaunch: false,
          pendingRocketId: undefined,
          missionRocketSource: s.player.pendingRocketSource ?? 'company',
          pendingRocketSource: undefined,
          arrivalAt,
          // Keep the launch timestamp for tutorial legs too. Tutorial transit
          // is fast, but it must resume from its real position after a remount
          // instead of restarting at the first frame.
          transitStartedAt,
          missionPhase: 'transit',
          activeMission: mission && target
            ? { id: mission.id, label: missionTypePrimer(mission).label + ' → ' + target.name }
            : null,
          missionCrewIds,
        },
        screen: 'transit',
        doneSteps: { ...s.doneSteps, 5: true },
      }
    })
    const userId = pbLandnam.authStore.record?.id
    if (userId) {
      pbLandnam.collection('mission_runs').create({
        user: userId,
        mission_id: currentMission.id,
        target_id: current.targetId,
        status: 'in_progress',
        phase: 'transit',
        cargo: {},
        launched_at: new Date().toISOString(),
      }).then(record => {
        missionRunIdRef.current = record.id
        setState(s => s.player.activeMission?.id === currentMission.id
          ? { ...s, player: { ...s.player, missionRunId: record.id } }
          : s)
      }).catch(error => console.warn('[GameLoop] mission run create failed', error))
    }
    captureGameEvent('rocket_launched', { mission_id: currentMission.id, target_id: current.targetId, is_first_ever: isFirstEver })
    if (isFirstEver) enqueueSurvey('lnm_first_launch', 4000)
    if (currentMissionCrew.length > 0) enqueueSurvey('lnm_crew_first_launch', 4000)
  }, [catalog.missions, catalog.targets, setState, stateRef])

  const onMiningDone = useCallback((cargo: Record<string, number>, remoteDisposition: 'store' | 'sell' = 'sell') => {
    let hasDelivery = false
    const transitStartedAt = Date.now()
    setState(s => {
      hasDelivery = !!s.deliveryTargetId
      const nextLegTarget = hasDelivery
        ? catalog.targets.find(t => t.id === s.deliveryTargetId)
        : (s.targetId ? catalog.targets.find(t => t.id === s.targetId) : null)
      const timedTransit = s.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE
      const arrivalAt = (timedTransit && nextLegTarget)
        ? transitStartedAt + travelDurationMs(nextLegTarget, s.player.unlockedSkillNodes ?? [], ORBIT_MS_PER_UNIT)
        : null
      const mission = s.missionId
        ? catalog.missions.find(m => m.id === s.missionId) ?? s.player.dailyClientPool?.missions.find(m => m.id === s.missionId)
        : undefined
      const settled = s.targetId && mission && isFreeHaulMission(mission, cargo)
        && hasOperationalRemoteSilo(s.player, s.targetId)
        ? applyRemoteHaulDisposition(s, s.targetId, cargo, remoteDisposition, transitStartedAt)
        : s
      return applyMiningDone(settled, cargo, arrivalAt, timedTransit ? transitStartedAt : null)
    })
    const runId = stateRef.current.player.missionRunId ?? missionRunIdRef.current
    if (runId) {
      pbLandnam.collection('mission_runs').update(runId, {
        status: 'in_progress', phase: hasDelivery ? 'transit' : 'debrief', cargo,
      }).catch(error => console.warn('[GameLoop] mission run update failed', error))
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
      pbLandnam.collection('mission_runs').update(runId, {
        status: 'in_progress', phase: 'delivery',
      }).catch(error => console.warn('[GameLoop] mission run delivery update failed', error))
    }
    // The dedicated delivery view has the berth and transfer state in its
    // persistent HUD. Keeping another global notification across this route
    // change makes the compact layout look like a stack of modal surfaces.
  }, [setState, stateRef])

  const onDeliveryUnloadComplete = useCallback(() => {
    const transitStartedAt = Date.now()
    setState(s => {
      const deliveryTarget = s.deliveryTargetId ? catalog.targets.find(t => t.id === s.deliveryTargetId) : null
      const timedTransit = s.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE
      const arrivalAt = (timedTransit && deliveryTarget)
        ? transitStartedAt + travelDurationMs(deliveryTarget, s.player.unlockedSkillNodes ?? [], ORBIT_MS_PER_UNIT)
        : null
      return applyDeliveryUnloadComplete(s, arrivalAt, transitStartedAt)
    })
    const runId = stateRef.current.player.missionRunId ?? missionRunIdRef.current
    if (runId) {
      pbLandnam.collection('mission_runs').update(runId, {
        status: 'in_progress', phase: 'transit', cargo: {},
      }).catch(error => console.warn('[GameLoop] mission run Earth-return update failed', error))
    }
    // Transit owns the inbound status. Do not leave a transient toast over
    // the next operation once the transfer screen disappears.
  }, [catalog.targets, setState, stateRef])

  const onReturnArrived = useCallback(() => {
    setState(s => applyReturnArrived(s))
    // Debrief owns the recovery outcome and cargo receipt; a transient global
    // notification would cover the next task if the player advances quickly.
  }, [setState])

  const onRoverMiningDone = useCallback((cargo: Record<string, number>) => {
    let hasDelivery = false
    const transitStartedAt = Date.now()
    setState(s => {
      hasDelivery = !!s.deliveryTargetId
      const nextLegTarget = hasDelivery
        ? catalog.targets.find(t => t.id === s.deliveryTargetId)
        : (s.targetId ? catalog.targets.find(t => t.id === s.targetId) : null)
      const timedTransit = s.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE
      const arrivalAt = (timedTransit && nextLegTarget)
        ? transitStartedAt + travelDurationMs(nextLegTarget, s.player.unlockedSkillNodes ?? [], ORBIT_MS_PER_UNIT)
        : null
      return applyRoverMiningDone(s, cargo, arrivalAt, timedTransit ? transitStartedAt : null)
    })
    addToast(hasDelivery ? 'Cargo secured — course set for delivery' : 'Rover cargo secured — return to Earth for recovery', 'ok')
  }, [addToast, catalog.targets, setState])

  const onLandingTouchdown = useCallback(() => {
    setState(s => applyLandingTouchdown(s))
    addToast('Touchdown confirmed — surface operations underway', 'ok')
  }, [addToast, setState])

  const onRedockComplete = useCallback((cargo: Record<string, number>, remoteDisposition: 'store' | 'sell' = 'sell') => {
    let hasDelivery = false
    const transitStartedAt = Date.now()
    setState(s => {
      hasDelivery = !!s.deliveryTargetId
      const nextLegTarget = hasDelivery
        ? catalog.targets.find(t => t.id === s.deliveryTargetId)
        : (s.targetId ? catalog.targets.find(t => t.id === s.targetId) : null)
      const timedTransit = s.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE
      const arrivalAt = (timedTransit && nextLegTarget)
        ? transitStartedAt + travelDurationMs(nextLegTarget, s.player.unlockedSkillNodes ?? [], ORBIT_MS_PER_UNIT)
        : null
      const mission = s.missionId
        ? catalog.missions.find(m => m.id === s.missionId) ?? s.player.dailyClientPool?.missions.find(m => m.id === s.missionId)
        : undefined
      const settled = s.targetId && mission && isFreeHaulMission(mission, cargo)
        && hasOperationalRemoteSilo(s.player, s.targetId)
        ? applyRemoteHaulDisposition(s, s.targetId, cargo, remoteDisposition, transitStartedAt)
        : s
      return applyRedockComplete(settled, cargo, arrivalAt, timedTransit ? transitStartedAt : null)
    })
    addToast(hasDelivery ? 'Redock complete — course set for delivery' : 'Redock complete — return to Earth for recovery', 'ok')
  }, [addToast, catalog.targets, setState])

  const gainResearchXP = useCallback((amount: number) => {
    setState(s => applyGainResearchXP(s, amount))
  }, [setState])

  const upgradeLicenseGrade = useCallback((grade: Exclude<LicenseGrade, 'Grade I'>) => {
    setState(s => applyUpgradeLicenseGrade(s, grade))
  }, [setState])

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
    const roundedRanges = ranges
      .map(range => ({ x1: Math.round(range.x1 * 1000) / 1000, x2: Math.round(range.x2 * 1000) / 1000 }))
      .sort((a, b) => a.x1 - b.x1)

    setState(s => {
      const existing = s.player.tessClassifications?.[subjectId]
      const showArtifactNarrative = artifactNarrativeEligible({
        transitSatelliteLevel: s.player.transitSatelliteLevel,
        verdict,
        hasExistingClassification: !!existing,
        seenAt: s.player.artifactNarrativeSeenAt,
      })
      const next: GameState = {
        ...s,
        player: {
          ...s.player,
          researchAnnotations: existing ? s.player.researchAnnotations : s.player.researchAnnotations + 1,
          tessClassifications: {
            ...(s.player.tessClassifications ?? {}),
            [subjectId]: { subjectId, verdict, ranges: roundedRanges, submittedAt },
          },
          artifactNarrativeSeenAt: showArtifactNarrative
            ? submittedAt
            : s.player.artifactNarrativeSeenAt,
          discoveredExoplanetTargets: verdict === 'planet' && discoveredTarget
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
      return existing ? next : applyGainResearchXP(next, RESEARCH_XP_PER_FIRST_TESS_CLASSIFICATION)
    })

    const userId = pbShared.authStore.record?.id
    if (userId) {
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
  }, [setState])

  // Deep Space Telescope's asteroid-discovery classification (STS-622) — a
  // passive digest, so unlike submitTessClassification there's no
  // ranges/discoveredTarget/satelliteTargetId to thread through, just the
  // verdict record itself.
  const submitAsteroidClassification = useCallback((candidateId: string, verdict: AsteroidVerdict) => {
    const submittedAt = Date.now()

    setState(s => {
      const existing = s.player.asteroidClassifications?.[candidateId]
      const next: GameState = {
        ...s,
        player: {
          ...s.player,
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
  }, [setState])

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

  const onDebriefDone = useCallback((rawTotal: number, _affinity = 0, consumed: Record<string, number> = {}, disposition?: 'store' | 'sell') => {
    const current = stateRef.current
    if (current.screen !== 'debrief' || !current.missionId || !current.targetId || !current.lastCargo) return
    // A self-directed ("free") haul lands in the stash on return; here the
    // player's Debrief choice decides whether it stays on Earth or is sold at
    // market. Runs as its own state step before the payout/ledger update below
    // so the sell revenue is on the balance the main update reads. Client
    // contracts and no-mineral runs are untouched — nothing changes for them.
    setState(s => {
      if (s.screen !== 'debrief' || !s.missionId || !s.lastCargo) return s
      const m = catalog.missions.find(item => item.id === s.missionId)
        ?? s.player.dailyClientPool?.missions.find(item => item.id === s.missionId)
        ?? null
      if (!m || s.player.cargoSettledOffworld || !isFreeHaulMission(m, s.lastCargo)) return s
      const effective = disposition ?? s.player.freeHaulDisposition ?? (earthStorageBuilt(s.player) ? 'store' : 'sell')
      const settled = applyFreeHaulDisposition(s, s.lastCargo, effective, Date.now())
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
    const total = completedIsFreeHaul ? 0 : rawTotal
    const effectiveConsumed = completedIsFreeHaul ? {} : consumed
    const crewAwardId = current.player.missionRunId ?? `${current.missionId}:${current.player.missionsDone}`
    const difficultCrewReturn = !!completedMission
      && Number.parseInt(completedMission.difficulty.replace(/\D/g, ''), 10) >= 3
    setState(s => applyAwardMissionCrewXP(s, crewAwardId, Date.now(), difficultCrewReturn))
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
        clientMissions[client] = (clientMissions[client] ?? 0) + 1
      }
      const stash = { ...(s.player.stash ?? {}) }
      // A delivery-target contract already moved the minerals out of the ship
      // at the unload berth, so they never entered Earth Base storage.
      if (!mission?.deliveryTargetId) {
        for (const [id, amount] of Object.entries(effectiveConsumed)) {
          stash[id] = Math.max(0, (stash[id] ?? 0) - amount)
        }
      }
      let francs = s.player.francs + total
      // Treasury-backed emergency loan (KES-286/KES-287): the whole
      // outstanding balance is repaid from the next payout in one shot,
      // capped at what the payout actually covers — mirrors what
      // loanInstalmentFor shows on the Debrief screen.
      const treasuryPlayer = TREASURY_PLAYER_ID
      let treasury = s.player.treasury
      if (!isProgramOperation && treasury) {
        const outstandingBefore = loanOutstanding(treasury, treasuryPlayer)
        if (outstandingBefore > 0) {
          const instalment = Math.min(outstandingBefore, Math.max(0, francs))
          if (instalment > 0) {
            const repayResult = repayBankruptcyLoan(treasury, {
              entryId: `bankruptcy-loan-repayment:${treasuryPlayer}:${Date.now()}`,
              loanId: `bankruptcy-loan:${treasuryPlayer}`,
              playerId: treasuryPlayer,
              amountFrancs: instalment,
              repaidAt: Date.now(),
            })
            if (repayResult.changed) {
              treasury = repayResult.treasury
              francs -= repayResult.playerDebitFrancs
            }
          }
        }
      }
      const loanDebt = treasury ? loanOutstanding(treasury, treasuryPlayer) : 0
      const loanOffered = s.player.loanOffered
      const showLoanOffer = !isProgramOperation
        && !loanOffered
        && francs < BANKRUPTCY_THRESHOLD
        && loanDebt === 0
      const seen_planets = [...(s.player.seen_planets ?? [])]
      if (s.targetId && !seen_planets.includes(s.targetId)) seen_planets.push(s.targetId)
      const crewVisitedTargets = [...(s.player.crewVisitedTargets ?? [])]
      if ((s.player.missionCrewIds?.length ?? 0) > 0 && s.targetId && !crewVisitedTargets.includes(s.targetId)) {
        crewVisitedTargets.push(s.targetId)
      }
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
      const stillInTutorial = missionsDone < FREE_OPS_START_MISSIONS_DONE && catalog.missions.some(m => m.sequence === missionsDone + 1)
      // M3 (the last onboarding mission) also flips freeOperations true on this
      // same tick, which would otherwise auto-open the market straight out of
      // debrief with no player action requesting it. Land on hub for that one
      // boundary mission; auto-market-open only kicks in for Free Ops missions
      // completed after onboarding has actually ended.
      const justFinishedOnboardingNow = justFinishedOnboarding(s.player.missionsDone, missionsDone)
      // Skip the Prospector upsell popup during guided onboarding — the tutorial
      // coach already delivers the same "Prospector available" message inline
      // (lib/data/tutorial.ts step 20), and the popup pre-empts the coach.
      //
      // 'tutorial-complete' fires exactly once, on the single tick Free Ops
      // actually starts — not derived from missionsDone on every render (that
      // was TutorialCompleteSheet's old, never-wired localStorage-only
      // approach). It rides in `popup`, which is part of the GameState blob
      // already persisted to game_states, so the ack survives reload and
      // syncs across devices with the rest of the save (KES-167).
      const popup = justFinishedOnboardingNow
        ? 'tutorial-complete'
        : showLoanOffer
          ? 'loan'
          : (missionsDone === 1 && !stillInTutorial) ? 'sr2' : s.popup
      const recovered = applyRocketStageRecovery(
        { ...s, player: { ...s.player, stash } },
        rocketModelForConfig(s.rocket),
      )
      const next: GameState = {
        ...s,
        player: {
          ...constructionPlayer,
          francs,
          activeMission: null,
          missionRunId: undefined,
          missionPhase: undefined,
          debriefPending: false,
          cargoSettledOffworld: false,
          returningToEarth: false,
          missionCrewIds: [],
          deliveryUnloadStartedAt: undefined,
          shipDestroyed: false,
          loanDebt,
          loanOffered: loanOffered || showLoanOffer,
          treasury,
          missionsDone,
          // Player progression is intentionally deferred by the client-led
          // operating model. Keep old saved points intact, but completing a
          // mission no longer mints a second progression currency.
          skillPoints: s.player.skillPoints ?? 0,
          missionCount: catalog.missions.filter(m => m.sequence === missionsDone + 1).length,
          freeOperations: missionsDone >= FREE_OPS_START_MISSIONS_DONE,
          clientMissions,
          completedMissions,
          stash: recovered.player.stash,
          missionRocketSource: undefined,
          lastClient: (isStoryMission || isProgramOperation) ? s.player.lastClient : client,
          seen_planets,
          crewVisitedTargets,
          roverDeployments,
          dailyClientPool: completedDailyPool,
          transitSatelliteLaunchedAt: mission?.payload?.type === 'satellite'
            ? (s.player.transitSatelliteLaunchedAt ?? Date.now())
            : s.player.transitSatelliteLaunchedAt,
          transitSatelliteLevel: mission?.payload?.type === 'satellite'
            ? Math.max(1, s.player.transitSatelliteLevel ?? 1) + 1
            : s.player.transitSatelliteLevel,
          deepSpaceTelescopeMissionCompletedAt: mission?.payload?.type === 'deep-space-survey'
            ? (s.player.deepSpaceTelescopeMissionCompletedAt ?? Date.now())
            : s.player.deepSpaceTelescopeMissionCompletedAt,
          scanStationMissionCompletedAt: mission?.payload?.type === 'scan-station-commission'
            ? (s.player.scanStationMissionCompletedAt ?? Date.now())
            : s.player.scanStationMissionCompletedAt,
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
            ? 'galaxy'
            : isProgramOperation
              ? 'launchpad'
              : (stillInTutorial || justFinishedOnboardingNow)
                ? 'hub'
                : 'market',
      }
      return applyGainResearchXP(next, mission?.programReward?.researchXP ?? 0)
    })
    // The destination HUD/debrief presents the collected reward. Keeping a
    // second global confirmation leaks it over the following mission setup.
    const userId = pbShared.authStore.record?.id
    if (userId) {
      pbLandnam.collection('mission_log').create({
        user: userId,
        mission_id: current.missionId,
        target_id: current.targetId,
        payout_francs: total,
        minerals_delivered: effectiveConsumed,
        missions_done_after: newMissionsDone,
        completed_at: new Date().toISOString(),
      }).catch(() => {})
    }
    const runId = current.player.missionRunId ?? missionRunIdRef.current
    if (runId) {
      pbLandnam.collection('mission_runs').update(runId, {
        status: 'completed', phase: 'debrief', cargo: current.deliveredCargo ?? current.lastCargo,
        payout_francs: total, completed_at: new Date().toISOString(),
      }).catch(error => console.warn('[GameLoop] mission run completion update failed', error))
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
    if (isFirstMissionEver) {
      enqueueSurvey('lnm_m1_complete', 3000)
      enqueueSurvey('lnm_progression_feel', 8000)
    }
    // M2 vs M3 completion feedback is split between players rather than
    // both landing on everyone — which survey a player sees is decided by
    // the `landnam-milestone-survey-variant` PostHog flag. `milestone_reached`
    // fires for both milestones regardless of variant, so reaching M2/M3
    // stays visible for players who didn't get that milestone's survey.
    if (newMissionsDone === 2 || newMissionsDone === 3) {
      captureGameEvent('milestone_reached', { milestone: `m${newMissionsDone}` })
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
    if (newMissionsDone === 3 && milestoneVariant === 'm3') {
      enqueueSurvey('lnm_m3_transport_clarity', 5000)
      enqueueSurvey('lnm_m3_client_choice', 5000)
      enqueueSurvey('lnm_m3_rating', 5000)
      enqueueSurvey('lnm_m3_freetext', 5000)
    }
    if (!catalog.missions.some(m => m.sequence === newMissionsDone + 1)) enqueueSurvey('lnm_end_of_content', 5000)
  }, [addToast, catalog.missions, setState, stateRef])

  return {
    setPlayer, setMissionId, setTargetId, setRocket, setLastCargo,
    onPickMission, onPickTarget, onPurchaseRocket, onFabricateRocketPart, onAssembleFabricatedRocket, onLaunch, resumeMissionRun,
    onMiningDone, onDeliveryArrived, onDeliveryUnloadComplete, onReturnArrived, onRoverMiningDone, onDebriefDone,
    onLandingTouchdown, onRedockComplete,
    gainResearchXP, upgradeLicenseGrade, unlockBlueprint, launchTransitSatellite, submitTessClassification, chooseSatelliteTarget,
    submitAsteroidClassification,
  }
}
