import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, mergeRemoteState, normalizeAndRepair } from './game-state'
import { applyAbandonMission } from './systems/ProgressionSystem'
import { MISSIONS, TARGETS } from '@/lib/data'
import type { GameState } from './game-types'

const mission = MISSIONS[0]
const target = TARGETS[0]

function stateWithRun(runId: string | undefined): GameState {
  return normalizeAndRepair({
    ...DEFAULT_STATE,
    screen: 'hub',
    missionId: mission.id,
    targetId: target.id,
    player: {
      ...DEFAULT_STATE.player,
      placed: ['launchpad'],
      missionsDone: 3,
      freeOperations: true,
      activeMission: { id: mission.id, label: `Run → ${target.name}` },
      missionRunId: runId,
      missionPhase: 'mining',
      transitStartedAt: 1000,
    },
  })
}

describe('scrubbed runs stay scrubbed', () => {
  it.each([['with a run id', 'run-1'], ['without a run id', undefined]])('a scrub survives a merge with a stale server copy %s', (_label, runId) => {
    const withRun = stateWithRun(runId)
    const remote = JSON.parse(JSON.stringify(withRun)) as GameState
    const scrubbed = applyAbandonMission(withRun, MISSIONS, { waivePenalty: true })
    expect(scrubbed.player.activeMission).toBeNull()

    const merged = mergeRemoteState(scrubbed, remote)

    expect(merged.player.activeMission).toBeNull()
    expect(merged.missionId).toBeNull()
    expect(merged.player.scrubbedRuns?.length).toBeGreaterThan(0)
  })

  it('drops a scrubbed run that a loaded save still carries', () => {
    const withRun = stateWithRun('run-2')
    const loaded = normalizeAndRepair({ ...withRun, player: { ...withRun.player, scrubbedRuns: ['run-2'] } })
    expect(loaded.player.activeMission).toBeNull()
  })

  it('does not catch a later flight of the same contract', () => {
    const first = applyAbandonMission(stateWithRun('run-3'), MISSIONS, { waivePenalty: true })
    const relaunched = normalizeAndRepair({
      ...first,
      missionId: mission.id,
      targetId: target.id,
      player: { ...first.player, activeMission: { id: mission.id, label: `Run → ${target.name}` }, missionRunId: 'run-4', transitStartedAt: 2000, missionPhase: 'mining' },
    })
    expect(relaunched.player.activeMission?.id).toBe(mission.id)
  })
})
