import { useCallback, useRef } from 'react'
import {
  MISSIONS, TARGETS, STARTER_ROCKETS, FREE_OPS_START_MISSIONS_DONE,
  getLaserChargeCap, travelDurationMs, suggestBuild,
  CLIENT_COOLDOWN_MS, CLIENT_STREAK_LIMIT, loanInstalmentFor, BANKRUPTCY_THRESHOLD,
} from '@/lib/data'
import { applyDeliveryArrived, applyMiningDone, applyReturnArrived, applyRoverMiningDone } from '@/lib/systems/MiningSystem'
import { applyPurchaseRocket } from '@/lib/systems/EconomySystem'
import { enqueueSurvey } from '@/lib/surveys'
import type { Catalog } from '@/lib/catalog'
import type { GameState, LicenseGrade } from '@/lib/game-types'
import type { Target, TessVerdict, TransitRange } from '@/lib/data'
import type { Toast } from '@/components/ui/ToastLayer'
import { applyGainResearchXP, applyUpgradeLicenseGrade, applyUnlockBlueprint } from '@/lib/systems/ProgressionSystem'
import { pbShared } from '@/lib/pb'
import { pbLandnam } from '@/lib/pb-landnam'

const ORBIT_MS_PER_UNIT = 2 * 60 * 1000
const STORY_MISSION_CLIENT_ID = 'mission-control'



interface GameLoopOpts {
  stateRef: React.RefObject<GameState>
  setState: React.Dispatch<React.SetStateAction<GameState>>
  catalog: Catalog
  addToast: (message: string, kind?: Toast['kind']) => void
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

  const onPickMission = useCallback((id: string) => {
    setState(s => {
      if (s.screen !== 'missions' || s.player.activeMission) return s
      const mission = catalog.missions.find(m => m.id === id)
        ?? s.player.dailyClientPool?.missions.find(m => m.id === id)
        ?? null
      if (!mission) return s
      const isStoryMission = mission.client === STORY_MISSION_CLIENT_ID || (mission.tag === 'STORY' && !mission.deliveryTargetId)
      const dailyClientPool = (s.player.dailyClientPool && id.startsWith('dcp-'))
        ? { ...s.player.dailyClientPool, acceptedId: id }
        : s.player.dailyClientPool
      const base = { ...s, player: { ...s.player, dailyClientPool } }
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
          rocket: next,
          screen: 'rocket-buy',
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
      const next = suggestBuild({ mission, target, missionsDone: s.player.missionsDone, launchpadUpgraded: s.player.launchpadUpgraded, parts: catalog.parts, unlockedSkillNodes: s.player.unlockedSkillNodes ?? [] })
      return {
        ...s,
        targetId: id,
        rocket: next,
        screen: 'rocket-buy',
        doneSteps: { ...s.doneSteps, 3: true },
      }
    })
  }, [catalog.missions, catalog.parts, catalog.targets, setState])

  const onPurchaseRocket = useCallback((rocketId: string) => {
    setState(s => {
      if (s.screen !== 'rocket-buy' || !s.missionId || !s.targetId) return s
      const rocket = STARTER_ROCKETS.find(r => r.id === rocketId)
      if (!rocket) return s
      return applyPurchaseRocket(s, rocket)
    })
  }, [setState])

  const onLaunch = useCallback(() => {
    const current = stateRef.current
    if (current.screen !== 'fab' || !current.missionId || !current.targetId || current.player.activeMission) return
    const currentMission = catalog.missions.find(m => m.id === current.missionId)
      ?? current.player.dailyClientPool?.missions.find(m => m.id === current.missionId)
      ?? null
    if (!currentMission) return
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
          arrivalAt,
          transitStartedAt: timedTransit ? transitStartedAt : null,
          missionPhase: 'transit',
          activeMission: mission && target
            ? { id: mission.id, label: mission.title + ' → ' + target.name }
            : null,
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
    if (isFirstEver) enqueueSurvey('lnm_first_launch', 4000)
  }, [catalog.missions, catalog.targets, setState, stateRef])

  const onMiningDone = useCallback((cargo: Record<string, number>) => {
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
      return applyMiningDone(s, cargo, arrivalAt, timedTransit ? transitStartedAt : null)
    })
    const runId = stateRef.current.player.missionRunId ?? missionRunIdRef.current
    if (runId) {
      pbLandnam.collection('mission_runs').update(runId, {
        status: 'in_progress', phase: hasDelivery ? 'transit' : 'debrief', cargo,
      }).catch(error => console.warn('[GameLoop] mission run update failed', error))
    }
    addToast(hasDelivery ? 'Cargo secured — course set for delivery' : 'Order filled — return to Earth for recovery', 'ok')
  }, [addToast, catalog.targets, setState, stateRef])

  const onDeliveryArrived = useCallback(() => {
    const transitStartedAt = Date.now()
    setState(s => {
      const deliveryTarget = s.deliveryTargetId ? catalog.targets.find(t => t.id === s.deliveryTargetId) : null
      const timedTransit = s.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE
      const arrivalAt = (timedTransit && deliveryTarget)
        ? transitStartedAt + travelDurationMs(deliveryTarget, s.player.unlockedSkillNodes ?? [], ORBIT_MS_PER_UNIT)
        : null
      return applyDeliveryArrived(s, arrivalAt, timedTransit ? transitStartedAt : null)
    })
    addToast('Delivered — course set for Earth', 'ok')
  }, [addToast, catalog.targets, setState])

  const onReturnArrived = useCallback(() => {
    setState(s => applyReturnArrived(s))
    addToast('Earth recovery complete — ship destroyed and cargo secured', 'ok')
  }, [addToast, setState])

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
      if (!s.player.freeOperations || !s.player.satelliteMonitoringBuilt || s.player.transitSatelliteLaunchedAt) return s
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
      return {
        ...s,
        player: {
          ...s.player,
          researchAnnotations: existing ? s.player.researchAnnotations : s.player.researchAnnotations + 1,
          researchXP: (s.player.researchXP ?? 0) + (existing ? 0 : 15),
          tessClassifications: {
            ...(s.player.tessClassifications ?? {}),
            [subjectId]: { subjectId, verdict, ranges: roundedRanges, submittedAt },
          },
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
      }
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
    enqueueSurvey('lnm_satellite_clarity', 1200)
  }, [setState])

  const onDebriefDone = useCallback((rawTotal: number, _affinity = 0, consumed: Record<string, number> = {}) => {
    const current = stateRef.current
    if (current.screen !== 'debrief' || !current.missionId || !current.targetId || !current.lastCargo) return
    const newMissionsDone = current.player.missionsDone + 1
    const completedMission = catalog.missions.find(m => m.id === current.missionId)
      ?? current.player.dailyClientPool?.missions.find(m => m.id === current.missionId)
    const completedIsStoryMission = completedMission?.client === STORY_MISSION_CLIENT_ID
      || (completedMission?.tag === 'STORY' && !completedMission.deliveryTargetId)
    // Already through the onboarding payout floor — DebriefScreen calibrates
    // the figure it shows and hands that exact number to `onDone`, so
    // re-applying `calibrateOnboardingPayout` here only risked the screen and
    // the ledger drifting apart. Credit what the player was shown.
    const total = rawTotal
    setState(s => {
      if (s.screen !== 'debrief' || !s.missionId || !s.targetId || !s.lastCargo) return s
      const missionsDone = s.player.missionsDone + 1
      const mission = s.missionId
        ? (catalog.missions.find(m => m.id === s.missionId)
           ?? s.player.dailyClientPool?.missions.find(m => m.id === s.missionId)
           ?? null)
        : null
      const client = mission?.client
      const isStoryMission = mission?.client === STORY_MISSION_CLIENT_ID || (mission?.tag === 'STORY' && !mission?.deliveryTargetId)
      const clientMissions = { ...s.player.clientMissions }
      const clientStreaks = { ...(s.player.clientStreaks ?? {}) }
      const clientCooldowns = { ...s.player.clientCooldowns }
      if (client && !isStoryMission) {
        clientMissions[client] = (clientMissions[client] ?? 0) + 1
        const streak = (clientStreaks[client] ?? 0) + 1
        if (streak >= CLIENT_STREAK_LIMIT) {
          clientStreaks[client] = 0
          clientCooldowns[client] = Date.now() + CLIENT_COOLDOWN_MS
        } else {
          clientStreaks[client] = streak
        }
      }
      const stash = { ...(s.player.stash ?? {}) }
      for (const [id, amount] of Object.entries(consumed)) {
        stash[id] = Math.max(0, (stash[id] ?? 0) - amount)
      }
      let loanDebt = s.player.loanDebt
      let francs = s.player.francs + total
      if (loanDebt > 0) {
        const payment = loanInstalmentFor(loanDebt)
        francs = Math.max(0, francs - payment)
        loanDebt = Math.max(0, loanDebt - payment)
      }
      const loanOffered = s.player.loanOffered
      const showLoanOffer = !loanOffered && francs < BANKRUPTCY_THRESHOLD && loanDebt === 0
      const seen_planets = [...(s.player.seen_planets ?? [])]
      if (s.targetId && !seen_planets.includes(s.targetId)) seen_planets.push(s.targetId)
      const effectiveTargetId = mission?.targetId ?? s.targetId ?? ''
      let roverDeployments = [...(s.player.roverDeployments ?? [])]
      let clientTerritories = { ...(s.player.clientTerritories ?? {}) }
      let pendingTerritoryClaimFor: { targetId: string; clientId: string } | undefined
      if (mission?.payload?.type === 'rover' && client && effectiveTargetId) {
        roverDeployments = [...roverDeployments, {
          roverId: `${mission.id}-rover-${Date.now()}`,
          targetId: effectiveTargetId,
          clientId: client,
          timestamp: Date.now(),
        }]
        const prev = clientTerritories[client] ?? []
        if (!prev.includes(effectiveTargetId)) {
          clientTerritories = { ...clientTerritories, [client]: [...prev, effectiveTargetId] }
        }
        pendingTerritoryClaimFor = { targetId: effectiveTargetId, clientId: client }
      }
      const completedDailyPool = (s.missionId?.startsWith('dcp-') && s.player.dailyClientPool)
        ? {
          ...s.player.dailyClientPool,
          acceptedId: null,
          completedIds: [...s.player.dailyClientPool.completedIds, s.missionId],
        }
        : s.player.dailyClientPool
      const stillInTutorial = missionsDone < FREE_OPS_START_MISSIONS_DONE && catalog.missions.some(m => m.sequence === missionsDone + 1)
      // Skip the Prospector upsell popup during guided onboarding — the tutorial
      // coach already delivers the same "Prospector available" message inline
      // (lib/data/tutorial.ts step 20), and the popup pre-empts the coach.
      const popup = showLoanOffer ? 'loan' : (missionsDone === 1 && !stillInTutorial) ? 'sr2' : s.popup
      // M3 (the last onboarding mission) also flips freeOperations true on this
      // same tick, which would otherwise auto-open the market straight out of
      // debrief with no player action requesting it. Land on hub for that one
      // boundary mission; auto-market-open only kicks in for Free Ops missions
      // completed after onboarding has actually ended.
      const justFinishedOnboarding = missionsDone === FREE_OPS_START_MISSIONS_DONE
      return {
        ...s,
        player: {
          ...s.player,
          francs,
          activeMission: null,
          missionRunId: undefined,
          missionPhase: undefined,
          debriefPending: false,
          returningToEarth: false,
          shipDestroyed: false,
          missionsDone,
          skillPoints: (s.player.skillPoints ?? 0) + 1,
          missionCount: catalog.missions.filter(m => m.sequence === missionsDone + 1).length,
          freeOperations: missionsDone >= FREE_OPS_START_MISSIONS_DONE,
          clientMissions,
          clientStreaks,
          clientCooldowns,
          stash,
          lastClient: isStoryMission ? s.player.lastClient : client,
          loanDebt,
          loanOffered: loanOffered || showLoanOffer,
          seen_planets,
          roverDeployments,
          clientTerritories,
          dailyClientPool: completedDailyPool,
          transitSatelliteLaunchedAt: mission?.payload?.type === 'satellite'
            ? (s.player.transitSatelliteLaunchedAt ?? Date.now())
            : s.player.transitSatelliteLaunchedAt,
          transitSatelliteLevel: mission?.payload?.type === 'satellite'
            ? Math.max(1, s.player.transitSatelliteLevel ?? 1) + 1
            : s.player.transitSatelliteLevel,
        },
        lastCargo: null,
        missionId: null,
        targetId: null,
        tutorial: stillInTutorial,
        popup,
        doneSteps: { ...s.doneSteps, 9: true },
        screen: pendingTerritoryClaimFor ? s.screen : ((stillInTutorial || justFinishedOnboarding) ? 'hub' : 'market'),
        pendingTerritoryClaimFor,
      }
    })
    addToast(`Mission payout received: +${(total / 1_000_000).toFixed(0)}M F`, 'ok')
    const userId = pbShared.authStore.record?.id
    if (userId) {
      pbLandnam.collection('mission_log').create({
        user: userId,
        mission_id: current.missionId,
        target_id: current.targetId,
        payout_francs: total,
        minerals_delivered: consumed,
        missions_done_after: newMissionsDone,
      }).catch(() => {})
    }
    const runId = current.player.missionRunId ?? missionRunIdRef.current
    if (runId) {
      pbLandnam.collection('mission_runs').update(runId, {
        status: 'completed', phase: 'debrief', cargo: current.lastCargo,
        payout_francs: total, completed_at: new Date().toISOString(),
      }).catch(error => console.warn('[GameLoop] mission run completion update failed', error))
    }
    missionRunIdRef.current = null
    // Mission feedback belongs to the post-mission checkpoint. Queue it only
    // after debrief collection so it cannot surface over the next mission
    // board while the player is choosing a new contract.
    enqueueSurvey('lnm_mission_friction', 0)
    enqueueSurvey('lnm_mining_feel', 60_000)
    if (completedMission?.payload?.type === 'rover') enqueueSurvey('lnm_rover_clarity', 60_000)
    if (current.player.missionsDone >= 1 && !completedIsStoryMission) {
      enqueueSurvey('lnm_client_pick', 60_000)
    }
    if (newMissionsDone === 1) {
      enqueueSurvey('lnm_m1_complete', 3000)
      enqueueSurvey('lnm_progression_feel', 8000)
    }
    if (newMissionsDone === 2) enqueueSurvey('lnm_m2_complete', 3000)
    if (newMissionsDone === 3) enqueueSurvey('lnm_m3_complete', 5000)
    if (!catalog.missions.some(m => m.sequence === newMissionsDone + 1)) enqueueSurvey('lnm_end_of_content', 5000)
  }, [addToast, catalog.missions, setState, stateRef])

  return {
    setPlayer, setMissionId, setTargetId, setRocket, setLastCargo,
    onPickMission, onPickTarget, onPurchaseRocket, onLaunch,
    onMiningDone, onDeliveryArrived, onReturnArrived, onRoverMiningDone, onDebriefDone,
    gainResearchXP, upgradeLicenseGrade, unlockBlueprint, launchTransitSatellite, submitTessClassification, chooseSatelliteTarget,
  }
}
