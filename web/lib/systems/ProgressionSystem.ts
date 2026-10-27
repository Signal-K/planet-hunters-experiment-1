// Pure state-transition functions for player progression: research XP, blueprints, mission abandonment.

import type { GameState } from '@/lib/game-types'
import type { Mission } from '@/lib/data'
import { isSettledMissionRun } from './MissionRunLifecycle'

export function applyGainResearchXP(s: GameState, amount: number): GameState {
  if (!Number.isFinite(amount) || amount <= 0) return s
  const xp = Math.max(0, Math.floor(s.player.researchXP ?? 0)) + Math.floor(amount)
  return {
    ...s,
    player: {
      ...s.player,
      researchXP: xp,
    },
  }
}

export function applyUnlockBlueprint(
  s: GameState,
  blueprintId: string,
  costFrancs = 0,
  costXP = 0,
  costMaterials: Record<string, number> = {},
): GameState {
  if (!blueprintId) return s
  const unlockedBlueprints = s.player.unlockedBlueprints ?? []
  if (unlockedBlueprints.includes(blueprintId)) return s
  const francsCost = Math.max(0, Math.floor(costFrancs))
  const xpCost = Math.max(0, Math.floor(costXP))
  if (s.player.francs < francsCost) return s
  if ((s.player.researchXP ?? 0) < xpCost) return s
  const stash = { ...(s.player.stash ?? {}) }
  for (const [mineralId, amount] of Object.entries(costMaterials)) {
    if ((stash[mineralId] ?? 0) < Math.max(0, Math.floor(amount))) return s
  }
  for (const [mineralId, amount] of Object.entries(costMaterials)) {
    stash[mineralId] = Math.max(0, (stash[mineralId] ?? 0) - Math.max(0, Math.floor(amount)))
  }
  return {
    ...s,
    player: {
      ...s.player,
      francs: s.player.francs - francsCost,
      researchXP: (s.player.researchXP ?? 0) - xpCost,
      stash,
      unlockedBlueprints: [...unlockedBlueprints, blueprintId],
    },
  }
}


export function applyAbandonMission(s: GameState, missions: Mission[]): GameState {
  const mission = s.missionId
    ? (missions.find(m => m.id === s.missionId)
       ?? s.player.dailyClientPool?.missions.find(m => m.id === s.missionId)
       ?? null)
    : null
  // A collected run can be resurrected by a stale in-progress receipt. Scrubbing
  // that ghost must not charge 10% of a payout the player already received.
  const alreadyCollected = isSettledMissionRun(s.player, {
    runId: s.player.missionRunId,
    missionId: s.missionId ?? s.player.activeMission?.id,
    targetId: s.targetId,
    launchedAt: s.player.transitStartedAt,
  })
  const penalty = mission && !alreadyCollected ? Math.round(mission.payout.francs * 0.1) : 0
  const dailyClientPool = (s.missionId?.startsWith('dcp-') && s.player.dailyClientPool)
    ? { ...s.player.dailyClientPool, acceptedId: null }
    : s.player.dailyClientPool
  const scrubRunId = s.player.missionRunId
  const scrubKey = scrubRunId ?? (s.player.activeMission
    ? `${s.player.activeMission.id}:${s.player.transitStartedAt ?? 'current'}`
    : null)
  return {
    ...s,
    player: {
      ...s.player,
      francs: Math.max(0, s.player.francs - penalty),
      activeMission: null,
      missionRunId: undefined,
      missionStartedAt: undefined,
      missionPhase: undefined,
      pausedMissionRuns: (s.player.pausedMissionRuns ?? []).filter(run => {
        if (scrubRunId && run.missionRunId === scrubRunId) return false
        if (scrubKey && run.key === scrubKey) return false
        return !isSettledMissionRun(s.player, {
          runId: run.missionRunId,
          missionId: run.missionId,
          targetId: run.targetId,
          launchedAt: run.transitStartedAt,
        })
      }),
      miningCargoInProgress: undefined,
      miningLaserCharges: undefined,
      landingStartedAt: undefined,
      landingReturnStartedAt: undefined,
      deliveryUnloadStartedAt: undefined,
      arrivalAt: null,
      transitStartedAt: null,
      dailyClientPool,
      headingToDelivery: false,
      debriefPending: false,
      returningToEarth: false,
      shipDestroyed: false,
    },
    missionId: null,
    targetId: null,
    deliveryTargetId: null,
    lastCargo: null,
    deliveredCargo: null,
    screen: 'hub',
  }
}
