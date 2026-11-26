// Landing milestone and the lander detach/descend + ascend/redock sequence.
// Keep the saved landingResearched flag for players who unlocked it earlier.

import type { GameState } from '@/lib/game-types'
import { startReturnLeg } from './MiningSystem'

export const LANDING_DESCEND_DURATION_MS = 8_000
export const LANDING_ASCEND_DURATION_MS = 8_000
export const LANDING_RESEARCH_PREREQUISITE_MISSIONS_DONE = 2

export function landingProgress(
  startedAt: number | undefined,
  now: number = Date.now(),
  durationMs: number = LANDING_DESCEND_DURATION_MS,
): number {
  if (startedAt == null || !Number.isFinite(startedAt) || durationMs <= 0) return 0
  return Math.max(0, Math.min(1, (now - startedAt) / durationMs))
}

/**
 * Landing opens from solar-system progress: two missions flown. The old research purchase still counts, so a save
 * that already bought it keeps it, and nothing a save had is ever taken away.
 */
export function landingUnlocked(player: Pick<GameState['player'], 'landingResearched' | 'missionsDone'>): boolean {
  return !!player.landingResearched || (player.missionsDone ?? 0) >= LANDING_RESEARCH_PREREQUISITE_MISSIONS_DONE
}

export function applyResearchLanding(state: GameState): GameState {
  if (state.player.landingResearched) return state
  if (state.player.missionsDone < LANDING_RESEARCH_PREREQUISITE_MISSIONS_DONE) return state
  return {
    ...state,
    player: {
      ...state.player,
      landingResearched: true,
    },
  }
}

/**
 * Descend-complete: touchdown confirmed. Hands off to the (unchanged) surface
 * mining screen — the lander is how the player got there, not a different
 * surface mechanic. This is the moment `hasLanded` flips, which is what gates
 * Surface Ops: the player has landed, independent of whether they've finished
 * the return/redock leg yet.
 */
export function applyLandingTouchdown(state: GameState): GameState {
  if (state.screen !== 'landing' || state.player.landingStartedAt == null) return state
  const plan = state.player.activeMission?.mission?.customPlan
  if (state.player.headingToDelivery && state.deliveryTargetId && state.lastCargo && plan?.work === 'deliver' && plan.zone !== undefined && plan.targetId === state.deliveryTargetId) {
    return { ...state, screen: 'delivery', player: { ...state.player, missionPhase: 'delivery', landingStartedAt: undefined, deliveryUnloadStartedAt: Date.now(), hasLanded: true } }
  }
  return {
    ...state,
    screen: 'mining',
    player: {
      ...state.player,
      missionPhase: 'mining',
      landingStartedAt: undefined,
      hasLanded: true,
    },
  }
}

/**
 * Redock-complete: ascend sequence finished. Resumes the same return-leg
 * transition mining completion already uses.
 */
export function applyRedockComplete(
  state: GameState,
  cargo: Record<string, number>,
  arrivalAt: number | null,
  transitStartedAt?: number | null,
): GameState {
  if (
    state.screen !== 'landing'
    || state.player.landingReturnStartedAt == null
    || !state.missionId
    || !state.targetId
  ) {
    return state
  }
  return startReturnLeg(state, cargo, arrivalAt, transitStartedAt)
}
