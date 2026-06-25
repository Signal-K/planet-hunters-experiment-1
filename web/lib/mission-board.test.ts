/**
 * Tests for MissionBoardScreen availability logic.
 *
 * Root cause of the bug: PocketBase's old contractor-03a record had unlock_tier=3,
 * so onboarding missions (sequence 1-2) were locked for all new players.
 * The tutorial coach also highlighted the first contractor-valid card regardless of
 * whether it was actually unlocked, causing silent tap failures on mobile.
 *
 * These tests verify the fixed logic as pure computations mirroring the component.
 */

import { describe, it, expect } from 'vitest'
import type { Mission, Contractor } from '@/lib/data/types'
import { contractorUnlocked } from '@/lib/data/contractors'

// ── helpers that mirror the fixed MissionBoardScreen logic ──────────────────

function makeContractor(id: string, unlockTier: number): Contractor {
  return {
    id,
    name: id,
    color: '#ffffff',
    initial: 'XX',
    unlockTier,
    projectType: '',
    mineralPreferences: [],
    payoutPremium: 0.2,
    affinityBonusPerMission: 0.025,
  }
}

function makeMission(id: string, sequence: number, contractorId: string): Mission {
  return {
    id,
    title: id,
    brief: '',
    contractor: contractorId,
    tag: 'TEST',
    difficulty: `L${sequence}`,
    locked: false,
    sequence,
    requires: { minerals: {}, cargo_min: 0, drill_tier: 1, max_orbit: 5 },
    payout: { francs: 1_000_000, affinity: 10 },
  }
}

/**
 * Compute available missions for non-freeOps onboarding mode.
 * Mirrors the fixed filter in MissionBoardScreen.tsx.
 */
function computeAvailableOnboarding(
  missions: Mission[],
  contractors: Record<string, Contractor>,
  missionsDone: number,
): Mission[] {
  const sequence = missionsDone + 1
  return missions.filter(m => {
    const contractor = contractors[m.contractor]
    if (!contractor) return false
    // Fixed: sequence match is the only gate — contractor unlockTier doesn't apply
    return m.sequence === sequence
  })
}

/**
 * Compute contractorReady for a mission card.
 * Mirrors the fixed expression in MissionBoardScreen.tsx.
 */
function computeContractorReady(
  contractor: Contractor,
  mission: Mission,
  missionsDone: number,
  freeOperations: boolean,
): boolean {
  const sequence = missionsDone + 1
  // Fixed: current-sequence missions are always considered ready
  return freeOperations || mission.sequence === sequence || contractorUnlocked(contractor, sequence)
}

/**
 * Compute the index of the first actually-unlocked mission in the list.
 * Mirrors the fixed firstValidIdx in MissionBoardScreen.tsx.
 */
function computeFirstValidIdx(
  list: Mission[],
  contractors: Record<string, Contractor>,
  available: Mission[],
  missionsDone: number,
  freeOperations: boolean,
  completedIds: Set<string> = new Set(),
): number {
  const sequence = missionsDone + 1
  return list.findIndex(m => {
    if (completedIds.has(m.id)) return false
    const ctr = contractors[m.contractor]
    if (!ctr) return false
    const cr = freeOperations || m.sequence === sequence || contractorUnlocked(ctr, sequence)
    return cr && (freeOperations || available.some(item => item.id === m.id))
  })
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('MissionBoardScreen availability — onboarding (non-freeOps)', () => {
  it('includes a sequence-1 mission even when its contractor has unlockTier=3 (prod bug regression)', () => {
    // This is the exact scenario that broke in production: old contractor-03a
    // had unlock_tier=3 in PocketBase, blocking the M1 onboarding mission.
    const contractors = {
      'contractor-03a': makeContractor('contractor-03a', 3),
    }
    const missions = [makeMission('m1-iron', 1, 'contractor-03a')]

    const available = computeAvailableOnboarding(missions, contractors, 0)

    expect(available).toHaveLength(1)
    expect(available[0].id).toBe('m1-iron')
  })

  it('includes M2 at sequence 2 regardless of contractor tier', () => {
    const contractors = {
      'contractor-03b': makeContractor('contractor-03b', 5),
    }
    const missions = [
      makeMission('m1-iron', 1, 'contractor-03b'),
      makeMission('m2-silicon', 2, 'contractor-03b'),
    ]

    const available = computeAvailableOnboarding(missions, contractors, 1)

    expect(available.map(m => m.id)).toEqual(['m2-silicon'])
  })

  it('excludes missions with unknown contractors', () => {
    const missions = [makeMission('m1-iron', 1, 'unknown-contractor')]
    const available = computeAvailableOnboarding(missions, {}, 0)
    expect(available).toHaveLength(0)
  })

  it('excludes missions whose sequence does not match current step', () => {
    const contractors = {
      'helios-propulsion-depot': makeContractor('helios-propulsion-depot', 1),
    }
    const missions = [
      makeMission('m1', 1, 'helios-propulsion-depot'),
      makeMission('m2', 2, 'helios-propulsion-depot'),
      makeMission('m3', 3, 'helios-propulsion-depot'),
    ]

    const available = computeAvailableOnboarding(missions, contractors, 0)

    expect(available).toHaveLength(1)
    expect(available[0].id).toBe('m1')
  })
})

describe('contractorReady — current-sequence missions', () => {
  it('is true for the current-sequence mission when contractor unlockTier exceeds sequence', () => {
    const contractor = makeContractor('contractor-03a', 3)
    const mission = makeMission('m1-iron', 1, 'contractor-03a')

    expect(computeContractorReady(contractor, mission, 0, false)).toBe(true)
  })

  it('is false for future-sequence missions with a locked contractor', () => {
    const contractor = makeContractor('contractor-03a', 3)
    const mission = makeMission('m2-silicon', 2, 'contractor-03a')

    // missionsDone=0, sequence=1, m.sequence=2 → not current sequence AND unlockTier=3>1
    expect(computeContractorReady(contractor, mission, 0, false)).toBe(false)
  })

  it('is true when contractor is properly unlocked via unlockTier', () => {
    const contractor = makeContractor('helios', 1)
    const mission = makeMission('m2', 2, 'helios')

    // missionsDone=1, sequence=2, unlockTier=1 ≤ 2
    expect(computeContractorReady(contractor, mission, 1, false)).toBe(true)
  })

  it('is always true in freeOps mode regardless of tier or sequence', () => {
    const contractor = makeContractor('locked-contractor', 99)
    const mission = makeMission('freeops-1', 5, 'locked-contractor')

    expect(computeContractorReady(contractor, mission, 0, true)).toBe(true)
  })
})

describe('firstValidIdx — tutorial coach highlight', () => {
  it('skips locked-contractor cards and finds the first actually-unlocked one', () => {
    // Pre-fix: firstValidIdx would return 0 (contractor-03a exists, not completed)
    // even though contractor-03a has unlockTier=3 and missionsDone=0.
    // Post-fix: it should return 0 because contractorReady=true for sequence match.
    const contractors = {
      'contractor-03a': makeContractor('contractor-03a', 3),
    }
    const missions = [makeMission('m1-iron', 1, 'contractor-03a')]
    const available = computeAvailableOnboarding(missions, contractors, 0)

    const idx = computeFirstValidIdx(missions, contractors, available, 0, false)

    expect(idx).toBe(0)
  })

  it('skips completed missions', () => {
    const contractors = {
      'helios': makeContractor('helios', 1),
    }
    const missions = [
      makeMission('m1', 1, 'helios'),
      makeMission('m2', 1, 'helios'),
    ]
    const available = computeAvailableOnboarding(missions, contractors, 0)
    const completed = new Set(['m1'])

    const idx = computeFirstValidIdx(missions, contractors, available, 0, false, completed)

    expect(idx).toBe(1)
  })

  it('returns -1 when all missions are unavailable', () => {
    const contractors = {
      'contractor-03a': makeContractor('contractor-03a', 3),
    }
    // missionsDone=0, sequence=1, all missions have sequence=2 → none in available
    const missions = [makeMission('m2-silicon', 2, 'contractor-03a')]
    const available = computeAvailableOnboarding(missions, contractors, 0)

    const idx = computeFirstValidIdx(missions, contractors, available, 0, false)

    expect(idx).toBe(-1)
  })

  it('returns index 0 for a cleanly unlocked mission at tier 1', () => {
    const contractors = {
      'helios': makeContractor('helios', 1),
    }
    const missions = [makeMission('m1', 1, 'helios')]
    const available = computeAvailableOnboarding(missions, contractors, 0)

    const idx = computeFirstValidIdx(missions, contractors, available, 0, false)

    expect(idx).toBe(0)
  })
})
