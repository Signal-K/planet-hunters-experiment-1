import type { Mission, Target } from './types'

/** The operation performed at the destination, independently of its board category. */
export function missionLocationMode(mission: Pick<Mission, 'payload'>): 'orbit' | 'surface' {
  return mission.payload?.type === 'satellite' || mission.payload?.type === 'deep-space-survey'
    ? 'orbit' : 'surface'
}

/** Gas giants have an orbit, but no supported landing or surface work site. */
export function supportsMissionAtTarget(mission: Pick<Mission, 'payload'>, target: Pick<Target, 'archetype'>): boolean {
  return target.archetype !== 'gas-giant' || missionLocationMode(mission) === 'orbit'
}
