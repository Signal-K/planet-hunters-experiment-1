import type { ShipRoomKind } from '@/lib/data/shipRooms'

/** Cream and blue pixel rocket from the base kit. Pad, flight, and the hangar preview share this sprite. */
export const KIT_ROCKET_CORE = '/game/assets/base/kit/pad-rocket.png'

/** Core stack only (no side boosters), used once the boosters have separated. */
export const KIT_ROCKET_FLIGHT = '/game/assets/base/kit/flight-rocket.png'

export const KIT_ROCKET_STAGES = ['engine', 'booster', 'cockpit', 'payload'] as const
export type KitRocketStage = (typeof KIT_ROCKET_STAGES)[number]

/** Bands of the upright sprite, top to bottom, as fractions of its height. */
export const KIT_ROCKET_BANDS: Record<KitRocketStage, { top: number; height: number }> = {
  cockpit: { top: 0, height: 0.36 },
  payload: { top: 0.36, height: 0.26 },
  booster: { top: 0.62, height: 0.2 },
  engine: { top: 0.82, height: 0.18 },
}

export const KIT_ROCKET_ASPECT = '44 / 72'

/** The kit has one rocket that matches the pad. Fitted stages reveal that sprite; they do not swap in a different drawing. */
export function kitRocketSrc(_parts?: Partial<Record<ShipRoomKind, string>> | null): string {
  return KIT_ROCKET_CORE
}
