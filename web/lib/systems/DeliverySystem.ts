import type { GameState } from '@/lib/game-types'

export const DELIVERY_UNLOAD_DURATION_MS = 8_000

export function deliveryUnloadProgress(
  startedAt: number | undefined,
  now: number = Date.now(),
  durationMs: number = DELIVERY_UNLOAD_DURATION_MS,
): number {
  if (!startedAt || !Number.isFinite(startedAt) || durationMs <= 0) return 0
  return Math.max(0, Math.min(1, (now - startedAt) / durationMs))
}

/** Enter the physical unload scene when the delivery transit leg arrives. */
export function applyDeliveryArrived(
  state: GameState,
  startedAt: number = Date.now(),
): GameState {
  if (
    state.screen !== 'transit'
    || !state.player.headingToDelivery
    || !state.deliveryTargetId
    || !state.lastCargo
  ) {
    return state
  }

  return {
    ...state,
    screen: 'delivery',
    player: {
      ...state.player,
      arrivalAt: null,
      transitStartedAt: null,
      missionPhase: 'delivery',
      deliveryUnloadStartedAt: startedAt,
      debriefPending: false,
      returningToEarth: false,
    },
  }
}

/**
 * Empty the ship into the delivery-target depot, retain a contract receipt,
 * and begin the Earth-return transit leg.
 */
export function applyDeliveryUnloadComplete(
  state: GameState,
  arrivalAt: number | null,
  transitStartedAt: number = Date.now(),
): GameState {
  if (
    state.screen !== 'delivery'
    || !state.player.headingToDelivery
    || !state.deliveryTargetId
    || !state.lastCargo
  ) {
    return state
  }

  return {
    ...state,
    lastCargo: {},
    deliveredCargo: { ...state.lastCargo },
    screen: 'transit',
    player: {
      ...state.player,
      arrivalAt,
      transitStartedAt: arrivalAt ? transitStartedAt : null,
      missionPhase: 'transit',
      deliveryUnloadStartedAt: undefined,
      headingToDelivery: false,
      debriefPending: true,
      returningToEarth: true,
    },
  }
}
