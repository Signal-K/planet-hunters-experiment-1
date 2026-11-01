// Pure state transitions for ship-laser mining. The rover survey surface does not extract cargo.

import type { GameState } from '@/lib/game-types'

export function applyMiningDone(s: GameState, cargo: Record<string, number>, arrivalAt: number | null, transitStartedAt?: number | null): GameState {
  // SSL-718: a rover haul is loaded aboard from the rover field and starts the same return leg.
  if ((s.screen !== 'mining' && s.screen !== 'rover-survey') || !s.missionId || !s.targetId) return s
  return startReturnLeg(s, cargo, arrivalAt, transitStartedAt)
}

// Shared by laser mining completion (and lander redock completion,
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
      miningLaserCharges: undefined,
      pendingRemoteDisposition: undefined,
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
  if (!s.player.cargoSettledOffworld) {
    for (const [id, amount] of Object.entries(s.lastCargo)) {
      stash[id] = (stash[id] ?? 0) + amount
    }
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
      // SSL-553: a mined haul lands on the Earth pad and is settled on the delivery sheet.
      homeDeliveryPending: !s.player.cargoSettledOffworld && Object.values(s.lastCargo).some(units => units > 0),
      returningToEarth: false,
      // KES-321: this was unconditionally `true`, so DebriefScreen's
      // "HULL LOST · CARGO RECOVERED" branch fired on every single
      // successful return — there is no other code path in the game that
      // ever sets this flag, so it never represented a real failure. The
      // single-use vehicle's routine teardown is shown separately via the
      // `scrapping` state (ScrapSequenceCanvas), independent of this flag.
      shipDestroyed: false,
    },
    screen: 'debrief',
    doneSteps: { ...s.doneSteps, 6: true },
  }
}
