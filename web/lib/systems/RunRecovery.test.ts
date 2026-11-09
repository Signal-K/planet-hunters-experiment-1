import { describe, expect, it } from 'vitest'
import { MISSIONS, TARGETS } from '@/lib/data'
import { resolveRun } from './RunRecovery'

const catalog = { missions: MISSIONS, targets: TARGETS }
const mission = MISSIONS[0]
const target = TARGETS[0]

describe('resolveRun', () => {
  it('returns null when no run is in flight', () => {
    expect(resolveRun({ activeMission: null }, {}, catalog)).toBeNull()
  })

  it('resolves a run from the catalog by its ids', () => {
    const found = resolveRun({ activeMission: { id: mission.id, label: 'x' } }, { missionId: mission.id, targetId: target.id }, catalog)
    expect(found?.mission?.id).toBe(mission.id)
    expect(found?.target?.id).toBe(target.id)
  })

  it('regains the ids of a run whose ids were lost, from its id and its label', () => {
    const found = resolveRun({ activeMission: { id: mission.id, label: `Run → ${target.name}` } }, {}, catalog)
    expect(found?.missionId).toBe(mission.id)
    expect(found?.target?.id).toBe(target.id)
  })

  it('resolves a run the catalog no longer lists from the copies it carries', () => {
    const found = resolveRun(
      { activeMission: { id: 'gone-1', label: 'Gone → Nowhere', mission: { ...mission, id: 'gone-1' }, target: { ...target, id: 'gone-t' } } },
      { missionId: 'gone-1', targetId: 'gone-t' },
      catalog,
    )
    expect(found?.mission?.id).toBe('gone-1')
    expect(found?.target?.id).toBe('gone-t')
  })

  it('reports a run with no copy and no catalog entry as unresolvable', () => {
    const found = resolveRun({ activeMission: { id: 'gone-2', label: 'Gone → Nowhere' } }, { missionId: 'gone-2', targetId: 'gone-t' }, catalog)
    expect(found?.mission).toBeNull()
    expect(found?.target).toBeNull()
  })
})
