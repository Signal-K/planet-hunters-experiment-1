// Pure state-transition functions for mining (laser) and rover mining systems.

import type { GameState } from '@/lib/game-types'

export function applyMiningDone(s: GameState, cargo: Record<string, number>, arrivalAt: number | null): GameState {
  if (s.screen !== 'mining' || !s.missionId || !s.targetId) return s
  return startReturnLeg(s, cargo, arrivalAt)
}

export function applyRoverMiningDone(s: GameState, cargo: Record<string, number>, arrivalAt: number | null): GameState {
  if (s.screen !== 'rover-mining' || !s.missionId || !s.targetId) return s
  return startReturnLeg(s, cargo, arrivalAt)
}

// Shared by laser and rover mining completion: heads for the mission's
// deliveryTargetId (two-leg "mine then deliver" jobs) if one is set,
// otherwise starts the Earth-return leg directly.
function startReturnLeg(s: GameState, cargo: Record<string, number>, arrivalAt: number | null): GameState {
  const hasDelivery = !!s.deliveryTargetId
  return {
    ...s,
    lastCargo: cargo,
    player: {
      ...s.player,
      arrivalAt,
      missionPhase: 'transit',
      headingToDelivery: hasDelivery,
      debriefPending: !hasDelivery,
      returningToEarth: !hasDelivery,
      shipDestroyed: false,
    },
    screen: 'transit',
  }
}

export function applyDeliveryArrived(s: GameState, arrivalAt: number | null): GameState {
  if (!s.player.headingToDelivery || !s.deliveryTargetId) return s
  return {
    ...s,
    player: {
      ...s.player,
      arrivalAt,
      headingToDelivery: false,
      debriefPending: true,
      returningToEarth: true,
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
      missionPhase: 'debrief',
      debriefPending: false,
      returningToEarth: false,
      shipDestroyed: true,
    },
    screen: 'debrief',
    doneSteps: { ...s.doneSteps, 6: true },
  }
}
