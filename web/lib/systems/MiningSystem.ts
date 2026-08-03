// Pure state-transition functions for mining (laser) and rover mining systems.

import type { GameState } from '@/lib/game-types'

export function applyMiningDone(s: GameState, cargo: Record<string, number>, arrivalAt: number | null, transitStartedAt?: number | null): GameState {
  if (s.screen !== 'mining' || !s.missionId || !s.targetId) return s
  return startReturnLeg(s, cargo, arrivalAt, transitStartedAt)
}

export function applyRoverMiningDone(s: GameState, cargo: Record<string, number>, arrivalAt: number | null, transitStartedAt?: number | null): GameState {
  if (s.screen !== 'rover-mining' || !s.missionId || !s.targetId) return s
  return startReturnLeg(s, cargo, arrivalAt, transitStartedAt)
}

// Shared by laser and rover mining completion (and lander redock completion,
// see LandingSystem.ts): heads for the mission's deliveryTargetId (two-leg
// "mine then deliver" jobs) if one is set, otherwise starts the Earth-return
// leg directly.
export function startReturnLeg(s: GameState, cargo: Record<string, number>, arrivalAt: number | null, transitStartedAt?: number | null): GameState {
  const hasDelivery = !!s.deliveryTargetId
  return {
    ...s,
    lastCargo: cargo,
    deliveredCargo: null,
    player: {
      ...s.player,
      arrivalAt,
      transitStartedAt: transitStartedAt ?? (arrivalAt ? Date.now() : null),
      missionPhase: 'transit',
      miningCargoInProgress: undefined,
      roverMiningStartedAt: undefined,
      landingReturnStartedAt: undefined,
      headingToDelivery: hasDelivery,
      debriefPending: !hasDelivery,
      returningToEarth: !hasDelivery,
      shipDestroyed: false,
    },
    screen: 'transit',
  }
}

export function applyReturnArrived(s: GameState): GameState {
  if (!s.player.debriefPending || !s.lastCargo) return s
  const stash = { ...(s.player.stash ?? {}) }
  for (const [id, amount] of Object.entries(s.lastCargo)) {
    stash[id] = (stash[id] ?? 0) + amount
  }
  return {
    ...s,
    deliveryTargetId: null,
    player: {
      ...s.player,
      stash,
      arrivalAt: null,
      transitStartedAt: null,
      missionPhase: 'debrief',
      debriefPending: false,
      returningToEarth: false,
      shipDestroyed: true,
    },
    screen: 'debrief',
    doneSteps: { ...s.doneSteps, 6: true },
  }
}
