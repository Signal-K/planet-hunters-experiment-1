import { DEBRIS_RESOURCE_IDS } from '@/lib/data/sky-events'
import { FIREBALL_FRAGMENT_ID } from '@/lib/orionids/fireball'

export function isProtectedEventReward(resourceId: string): boolean {
  return PROTECTED_EVENT_REWARD_IDS.has(resourceId)
}

/** Event rewards stay attached to the run until the debrief settles them. */
const PROTECTED_EVENT_REWARD_IDS: ReadonlySet<string> = new Set([
  ...DEBRIS_RESOURCE_IDS,
  FIREBALL_FRAGMENT_ID,
])
