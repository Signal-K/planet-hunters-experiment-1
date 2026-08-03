// Landing research (unlocks the Lander Module ship room) and the lander
// detach/descend + ascend/redock sequence. See ZenNotes "Surface Ops gated on
// landing research and lander module" (STS-640).

import type { GameState } from '@/lib/game-types'
import { LANDING_RESEARCH_XP_COST } from '@/lib/data'
import { startReturnLeg } from './MiningSystem'

export const LANDING_DESCEND_DURATION_MS = 8_000
export const LANDING_ASCEND_DURATION_MS = 8_000
export const LANDING_RESEARCH_PREREQUISITE_MISSIONS_DONE = 2

export function landingProgress(
  startedAt: number | undefined,
  now: number = Date.now(),
  durationMs: number = LANDING_DESCEND_DURATION_MS,
): number {
  if (!startedAt || !Number.isFinite(startedAt) || durationMs <= 0) return 0
  return Math.max(0, Math.min(1, (now - startedAt) / durationMs))
}

export function applyResearchLanding(state: GameState): GameState {
  if (state.player.landingResearched) return state
  if (state.player.missionsDone < LANDING_RESEARCH_PREREQUISITE_MISSIONS_DONE) return state
  if ((state.player.researchXP ?? 0) < LANDING_RESEARCH_XP_COST) return state
  return {
    ...state,
    player: {
      ...state.player,
      researchXP: (state.player.researchXP ?? 0) - LANDING_RESEARCH_XP_COST,
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
  if (state.screen !== 'landing' || !state.player.landingStartedAt) return state
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
 * transition mining/rover-mining completion already uses.
 */
export function applyRedockComplete(
  state: GameState,
  cargo: Record<string, number>,
  arrivalAt: number | null,
  transitStartedAt?: number | null,
): GameState {
  if (
    state.screen !== 'landing'
    || !state.player.landingReturnStartedAt
    || !state.missionId
    || !state.targetId
  ) {
    return state
  }
  return startReturnLeg(state, cargo, arrivalAt, transitStartedAt)
}
