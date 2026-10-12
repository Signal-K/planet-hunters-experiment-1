import { KIT_ROCKET_STAGES } from '@/lib/kit-rocket'

/** Eight frames: five along the ground, two raising, one settled on the pad. */
export const ROLLOUT_FRAMES = 8
export const ROLLOUT_FRAME_MS = 140

export interface RolloutFrame {
  src: string
  w: number
  /** 0 at the hangar door, 1 on the pad. */
  t: number
  /** 0 with wheels on the ground, 1 with nozzles on the slab. */
  lift: number
  /** 0 at hangar scale, 1 at pad scale. */
  grow: number
  pose: 'roll' | 'set'
}

export const ROLLOUT_FRAME_LIST: readonly RolloutFrame[] = [
  { src: '/game/assets/base/kit/rollout-0.png', w: 72, t: 0, lift: 0, grow: 0, pose: 'roll' },
  { src: '/game/assets/base/kit/rollout-1.png', w: 72, t: 0.22, lift: 0, grow: 0, pose: 'roll' },
  { src: '/game/assets/base/kit/rollout-2.png', w: 72, t: 0.44, lift: 0, grow: 0, pose: 'roll' },
  { src: '/game/assets/base/kit/rollout-3.png', w: 72, t: 0.66, lift: 0, grow: 0, pose: 'roll' },
  { src: '/game/assets/base/kit/rollout-4.png', w: 72, t: 0.84, lift: 0, grow: 0, pose: 'roll' },
  { src: '/game/assets/base/kit/rollout-5.png', w: 72, t: 1, lift: 0, grow: 0, pose: 'roll' },
  { src: '/game/assets/base/kit/rollout-6.png', w: 44, t: 1, lift: 1, grow: 1, pose: 'set' },
  { src: '/game/assets/base/kit/rollout-7.png', w: 44, t: 1, lift: 1, grow: 1, pose: 'set' },
]

/** The four workshop stages are fitted, so the pad can show this vehicle. */
export function kitRocketBuilt(parts?: Partial<Record<string, string>> | null): boolean {
  return KIT_ROCKET_STAGES.every(stage => Boolean(parts?.[stage]))
}

/** Set when the hangar confirms a complete vehicle. The base consumes it on the next visit. */
let rolloutPending = false

export function markRocketRolloutPending(): void {
  rolloutPending = true
}

export function consumeRocketRolloutPending(): boolean {
  const pending = rolloutPending
  rolloutPending = false
  return pending
}

export function rolloutFrame(index: number): RolloutFrame {
  const frame = Math.max(0, Math.min(ROLLOUT_FRAMES - 1, Math.floor(index)))
  return ROLLOUT_FRAME_LIST[frame]
}
