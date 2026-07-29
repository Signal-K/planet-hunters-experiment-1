import type { Mission } from './types'
import { DEFAULT_MISSION_TEMPLATES } from './mission-generator'

/**
 * Player-facing reads on a mission's difficulty and payout tier (STS-543).
 *
 * Both are derived from data the mission already carries — no new fields, and
 * deliberately qualitative. The complaint these answer is legibility ("how hard
 * is this, and is it worth more than the one above it?"), not a demand for the
 * payout formula, so nothing here exposes price × amount × multiplier.
 */

export type MissionPayoutTier = 'Standard' | 'Elevated' | 'High-value'

const DIFFICULTY_DESCRIPTOR: Record<string, string> = {
  L1: 'Routine',
  L2: 'Demanding',
  L3: 'Hazardous',
}

/** "L2" → "Demanding". Unknown grades fall back to the raw value. */
export function missionDifficultyLabel(difficulty: string): string {
  return DIFFICULTY_DESCRIPTOR[difficulty] ?? difficulty
}

/**
 * Buckets the mission's generating template multiplier (1.0–3.6 across
 * DEFAULT_MISSION_TEMPLATES) into three qualitative tiers.
 *
 * Authored missions (the M3 transport jobs, story/science runs, self-directed
 * mining) have no generating template, so they fall back to their difficulty
 * grade — the same axis the bands are built on, just read from the other end.
 */
export function missionPayoutTier(mission: Mission): MissionPayoutTier {
  const templates = DEFAULT_MISSION_TEMPLATES.filter(t => t.tag === mission.tag)
  if (templates.length > 0) {
    // A tag can map to several templates (BULK spans 1.15 and 1.35). Take the
    // strongest so the tier never undersells what the board is offering.
    const multiplier = Math.max(...templates.map(t => t.payoutMultiplier))
    if (multiplier < 1.5) return 'Standard'
    if (multiplier < 2.5) return 'Elevated'
    return 'High-value'
  }
  if (mission.difficulty === 'L3') return 'High-value'
  if (mission.difficulty === 'L2') return 'Elevated'
  return 'Standard'
}
