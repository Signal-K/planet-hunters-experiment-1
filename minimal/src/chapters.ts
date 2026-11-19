// The story: a numbered route over Landnam's real missions, so a player needs no
// context. Each chapter is one goal with one button. Mission, target and mineral
// facts come from Landnam's own data, never from copies here.
import { MISSIONS } from '@landnam/lib/data/missions'
import { TARGETS, compatibleTargetsFor } from '@landnam/lib/data/targets'
import { MINERAL_META } from '@landnam/lib/data/minerals'
import type { Mission, Target } from '@landnam/lib/data/types'

export interface Chapter {
  number: number
  name: string
  goal: string
  teaches: string
  mission?: Mission
  target?: Target
}

// Chapter 1 flies Landnam's first onboarding contract: the first sequence-1 client job.
// Landnam lets the player pick its destination on the map; Minimal makes no-context
// choices for the player, so it takes the nearest body Landnam's own rule allows.
const firstContract = MISSIONS.find(m => m.sequence === 1 && !!m.client && !m.locked)
const firstTarget = firstContract && (
  TARGETS.find(t => t.id === firstContract.targetId) ??
  [...compatibleTargetsFor(firstContract, TARGETS)].sort((a, b) => a.orbit - b.orbit)[0]
)

export const CHAPTERS: Chapter[] = [
  { number: 1, name: 'First light', goal: 'Fly out, mine with the laser, come home.', teaches: 'Fly and fire', mission: firstContract, target: firstTarget },
  { number: 2, name: 'First sale', goal: 'Sell what you brought home.', teaches: 'Francs' },
  { number: 3, name: 'First client', goal: 'Take one job from a client and deliver it.', teaches: 'Contracts' },
  { number: 4, name: 'Eyes on the sky', goal: 'Point a telescope and read what it sees.', teaches: 'Research' },
  { number: 5, name: 'Shower', goal: 'Catch fragments from the live meteor shower.', teaches: 'Sky events' },
  { number: 6, name: 'Settle', goal: 'Store a haul and settle the place you found.', teaches: 'Settling' },
]

export function mineralName(id: string): string {
  return MINERAL_META[id]?.name ?? id
}

/** Short money for no-context copy: ₣22M, not ₣22.0M or 22000000. */
export function francs(value: number): string {
  if (value >= 1_000_000) return `₣${Math.round(value / 100_000) / 10}M`.replace('.0M', 'M')
  if (value >= 1_000) return `₣${Math.round(value / 1_000)}K`
  return `₣${value}`
}
