import { describe, expect, it } from 'vitest'
import { unlockedConstellations } from './constellations'
import type { Player } from '@/lib/game-types'

const player = (overrides: Partial<Player> = {}): Player => ({
  francs: 0,
  missionCount: 1,
  pendingLaunch: false,
  missionsDone: 0,
  completedMissions: [],
  tessClassifications: {},
  asteroidClassifications: {},
  saturnClassifications: {},
  ...overrides,
  activeMission: overrides.activeMission ?? null,
}) as Player

describe('Base constellations', () => {
  it('lights First Light after the first completed mission', () => {
    const unlocked = unlockedConstellations(player({
      completedMissions: [{ id: 'm1', title: 'First mission', completedAt: 42, runId: 'r1' }],
    }))
    expect(unlocked.map(item => item.id)).toEqual(['first-light'])
    expect(unlocked[0]?.earnedBy).toBe('First mission')
  })

  it('lights a contribution constellation from a classification', () => {
    const unlocked = unlockedConstellations(player({
      tessClassifications: { candidate: { subjectId: 'candidate', verdict: 'planet', ranges: [], submittedAt: 84 } },
    }))
    expect(unlocked.map(item => item.id)).toEqual(['signal-weaver'])
  })

  it('keeps the sky quiet for a fresh player', () => {
    expect(unlockedConstellations(player())).toEqual([])
  })
})
