import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from './game-state'
import { missionRunsFor } from './mission-runs'
import type { MissionRunSnapshot, Player } from './game-types'

const NOW = 1_000_000

function snapshot(key: string, overrides: Partial<MissionRunSnapshot> = {}): MissionRunSnapshot {
  return {
    key,
    activeMission: { id: key, label: `${key} → Eros` },
    missionId: key,
    targetId: 'eros',
    rocket: DEFAULT_STATE.rocket,
    lastCargo: null,
    ...overrides,
  }
}

describe('missionRunsFor (SSL-35 Home mission switch)', () => {
  it('lists the active run first, then paused runs', () => {
    const player: Player = {
      ...DEFAULT_STATE.player,
      activeMission: { id: 'a', label: 'A → Eros' },
      missionRunId: 'run-a',
      missionPhase: 'transit',
      arrivalAt: NOW + 60_000,
      pausedMissionRuns: [snapshot('b', { missionPhase: 'mining' })],
    }
    const runs = missionRunsFor(player, NOW)
    expect(runs.map(run => [run.key, run.current])).toEqual([['run-a', true], ['b', false]])
  })

  it('flags runs that need a tap and leaves flying runs alone', () => {
    const player: Player = {
      ...DEFAULT_STATE.player,
      activeMission: null,
      pausedMissionRuns: [
        snapshot('flying', { missionPhase: 'transit', arrivalAt: NOW + 1 }),
        snapshot('arrived', { missionPhase: 'transit', arrivalAt: NOW - 1 }),
        snapshot('mining', { missionPhase: 'mining' }),
        snapshot('debrief', { missionPhase: 'debrief' }),
      ],
    }
    expect(missionRunsFor(player, NOW).map(run => run.attention)).toEqual([null, 'arrived', 'mining', 'arrived'])
  })

  it('is empty with nothing in progress', () => {
    expect(missionRunsFor({ ...DEFAULT_STATE.player, activeMission: null, pausedMissionRuns: [] }, NOW)).toEqual([])
  })
})
