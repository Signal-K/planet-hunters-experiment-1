/**
 * Tests for MissionBoardScreen availability logic.
 *
 * Root cause of the bug: PocketBase's old client-03a record had unlock_tier=3,
 * so onboarding missions (sequence 1-2) were locked for all new players.
 * The tutorial coach also highlighted the first client-valid card regardless of
 * whether it was actually unlocked, causing silent tap failures on mobile.
 *
 * These tests verify the fixed logic as pure computations mirroring the component.
 */

import { describe, it, expect } from 'vitest'
import type { Mission, Client } from '@/lib/data/types'
import { isTutorialMissionInProgress } from '@/lib/mission-flow'

// ── helpers that mirror the fixed MissionBoardScreen logic ──────────────────

function makeClient(id: string, unlockTier: number): Client {
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
    uiRole: 'starter',
    suppliesCrew: false,
  }
}

function makeMission(id: string, sequence: number, clientId: string): Mission {
  return {
    id,
    title: id,
    brief: '',
    client: clientId,
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
  clients: Record<string, Client>,
  missionsDone: number,
): Mission[] {
  const sequence = missionsDone + 1
  return missions.filter(m => {
    const client = m.client ? clients[m.client] : undefined
    if (!client) return false
    // Fixed: sequence match is the only gate — client unlockTier doesn't apply
    return m.sequence === sequence
  })
}

/**
 * Compute whether a mission card is ready to start. This mirrors the board:
 * client tiers are not a second player progression system.
 */
function computeClientReady(
  mission: Mission,
  missionsDone: number,
  freeOperations: boolean,
): boolean {
  const sequence = missionsDone + 1
  return freeOperations || mission.sequence === sequence
}

/**
 * Compute the index of the first actually-unlocked mission in the list.
 * Mirrors the fixed firstValidIdx in MissionBoardScreen.tsx.
 */
function computeFirstValidIdx(
  list: Mission[],
  clients: Record<string, Client>,
  available: Mission[],
  missionsDone: number,
  freeOperations: boolean,
): number {
  const sequence = missionsDone + 1
  return list.findIndex(m => {
    const ctr = m.client ? clients[m.client] : undefined
    if (!ctr) return false
    const cr = freeOperations || m.sequence === sequence
    return cr && (freeOperations || available.some(item => item.id === m.id))
  })
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('MissionBoardScreen availability — onboarding (non-freeOps)', () => {
  it('includes a sequence-1 mission even when its client has unlockTier=3 (prod bug regression)', () => {
    // This is the exact scenario that broke in production: old client-03a
    // had unlock_tier=3 in PocketBase, blocking the M1 onboarding mission.
    const clients = {
      'client-03a': makeClient('client-03a', 3),
    }
    const missions = [makeMission('m1-iron', 1, 'client-03a')]

    const available = computeAvailableOnboarding(missions, clients, 0)

    expect(available).toHaveLength(1)
    expect(available[0].id).toBe('m1-iron')
  })

  it('includes M2 at sequence 2 regardless of client tier', () => {
    const clients = {
      'client-03b': makeClient('client-03b', 5),
    }
    const missions = [
      makeMission('m1-iron', 1, 'client-03b'),
      makeMission('m2-silicon', 2, 'client-03b'),
    ]

    const available = computeAvailableOnboarding(missions, clients, 1)

    expect(available.map(m => m.id)).toEqual(['m2-silicon'])
  })

  it('excludes missions with unknown clients', () => {
    const missions = [makeMission('m1-iron', 1, 'unknown-client')]
    const available = computeAvailableOnboarding(missions, {}, 0)
    expect(available).toHaveLength(0)
  })

  it('excludes missions whose sequence does not match current step', () => {
    const clients = {
      'helios-propulsion-depot': makeClient('helios-propulsion-depot', 1),
    }
    const missions = [
      makeMission('m1', 1, 'helios-propulsion-depot'),
      makeMission('m2', 2, 'helios-propulsion-depot'),
      makeMission('m3', 3, 'helios-propulsion-depot'),
    ]

    const available = computeAvailableOnboarding(missions, clients, 0)

    expect(available).toHaveLength(1)
    expect(available[0].id).toBe('m1')
  })
})

describe('mission start gating', () => {
  it('blocks a second contract while a tutorial mission is in progress', () => {
    expect(isTutorialMissionInProgress(false, true)).toBe(true)
  })

  it('does not apply the tutorial lock once Free Ops is active', () => {
    expect(isTutorialMissionInProgress(true, true)).toBe(false)
    expect(isTutorialMissionInProgress(true, false)).toBe(false)
  })
})

describe('mission readiness — authored sequence', () => {
  it('is true for the current-sequence mission when client unlockTier exceeds sequence', () => {
    const mission = makeMission('m1-iron', 1, 'client-03a')

    expect(computeClientReady(mission, 0, false)).toBe(true)
  })

  it('is false for future-sequence missions', () => {
    const mission = makeMission('m2-silicon', 2, 'client-03a')

    expect(computeClientReady(mission, 0, false)).toBe(false)
  })

  it('is true when the authored mission is current', () => {
    const mission = makeMission('m2', 2, 'helios')

    expect(computeClientReady(mission, 1, false)).toBe(true)
  })

  it('is always true in Free Ops, without a personal client-tier gate', () => {
    const mission = makeMission('freeops-1', 5, 'locked-client')

    expect(computeClientReady(mission, 0, true)).toBe(true)
  })
})

describe('firstValidIdx — tutorial coach highlight', () => {
  it('skips locked-client cards and finds the first actually-unlocked one', () => {
    // Pre-fix: firstValidIdx would return 0 (client-03a exists, not completed)
    // even though client-03a has unlockTier=3 and missionsDone=0.
    // Post-fix: it should return 0 because clientReady=true for sequence match.
    const clients = {
      'client-03a': makeClient('client-03a', 3),
    }
    const missions = [makeMission('m1-iron', 1, 'client-03a')]
    const available = computeAvailableOnboarding(missions, clients, 0)

    const idx = computeFirstValidIdx(missions, clients, available, 0, false)

    expect(idx).toBe(0)
  })

  it('returns -1 when all missions are unavailable', () => {
    const clients = {
      'client-03a': makeClient('client-03a', 3),
    }
    // missionsDone=0, sequence=1, all missions have sequence=2 → none in available
    const missions = [makeMission('m2-silicon', 2, 'client-03a')]
    const available = computeAvailableOnboarding(missions, clients, 0)

    const idx = computeFirstValidIdx(missions, clients, available, 0, false)

    expect(idx).toBe(-1)
  })

  it('returns index 0 for a cleanly unlocked mission at tier 1', () => {
    const clients = {
      'helios': makeClient('helios', 1),
    }
    const missions = [makeMission('m1', 1, 'helios')]
    const available = computeAvailableOnboarding(missions, clients, 0)

    const idx = computeFirstValidIdx(missions, clients, available, 0, false)

    expect(idx).toBe(0)
  })
})
