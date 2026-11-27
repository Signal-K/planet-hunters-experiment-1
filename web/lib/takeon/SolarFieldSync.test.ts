import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionState } from '@takeon/engine'
import { memoryStore, createOutbox } from '@/lib/offline/outbox'
import { writeSolarFieldIdentity } from './solarFieldIdentity'

const mocks = vi.hoisted(() => ({ send: vi.fn(), legacyHas: vi.fn(), outbox: { current: null as unknown } }))
vi.mock('@/lib/pb-landnam', () => ({ pbLandnam: { authStore: { record: { id: 'player' }, token: 'token' }, send: mocks.send } }))
vi.mock('@/lib/offline/pbOutbox', () => ({ getSolarFieldOutbox: () => mocks.outbox.current, getOutbox: () => ({ has: mocks.legacyHas }), isQueuedUpsert: () => false }))

import { SolarFieldSync, solarFieldId } from './SolarFieldSync'

const id = solarFieldId('mars', 'east')
const snapshot = writeSolarFieldIdentity(JSON.stringify({ config: { body: { coreDEM: { size: 2, heights: [0, 0, 0, 0], surfaceMaterials: [1, 1, 1, 1] } } } }),
  { kind: 'solar', version: 1, bodyId: 'mars', zone: 'east', seed: 1 })
const state = { id, coreSnapshot: snapshot, rover: { cargo: { 'landnam:iron': 1 } }, edits: { '1,2,3': 0 } } as unknown as MissionState

beforeEach(() => {
  mocks.send.mockReset()
  mocks.legacyHas.mockResolvedValue(false)
  mocks.outbox.current = createOutbox({ store: memoryStore(), isOnline: () => false, execute: async () => null })
})

describe('versioned solar fields', () => {
  it('does not open a second revision chain while an older save is queued', async () => {
    mocks.legacyHas.mockResolvedValue(true)
    await expect(new SolarFieldSync().loadMission(id)).rejects.toThrow('earlier field save')
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('queues consecutive edits with the account, location and revisions intact', async () => {
    mocks.send.mockResolvedValue({ revision: 0, state: null })
    const sync = new SolarFieldSync()
    expect(await sync.loadMission(id)).toBeNull()
    await sync.saveMission(state, 'Rover')
    await sync.saveMission({ ...state, edits: { ...state.edits, '1,2,4': 0 } }, 'Rover')
    const queue = mocks.outbox.current as ReturnType<typeof createOutbox>
    const operations = queue.pending().map(item => item.op)
    expect(operations.map(op => op.type === 'solar-field' && [op.user, op.site, op.revision])).toEqual([
      ['player', id, 0], ['player', id, 1],
    ])
  })

  it('reopens the latest complete queued field offline and continues its revision chain', async () => {
    const queue = mocks.outbox.current as ReturnType<typeof createOutbox>
    await queue.enqueue({ type: 'solar-field', id: 'operation-1', user: 'player', site: id, revision: 4, state: state as unknown as Record<string, unknown> })
    const sync = new SolarFieldSync()
    expect(await sync.loadMission(id)).toEqual(state)
    expect(mocks.send).not.toHaveBeenCalled()
    await sync.saveMission(state, 'Rover')
    expect(queue.pending()[1].op).toMatchObject({ type: 'solar-field', revision: 5 })
  })

  it('rejects a field whose saved location does not match', async () => {
    mocks.send.mockResolvedValue({ revision: 1, state: { ...state, id: solarFieldId('mars', 'west') } })
    await expect(new SolarFieldSync().loadMission(id)).rejects.toThrow('another location')
  })
  it('transfers the saved hold into the active run using the field revision', async () => {
    mocks.send.mockResolvedValueOnce({ revision: 1, state }).mockResolvedValueOnce({ site: id, runId: 'mission-run-1', cargo: { 'landnam:iron': 1 } })
    const sync = new SolarFieldSync()
    await sync.loadMission(id)
    expect(await sync.transferToMission('mission-run-1')).toEqual({ iron: 1 })
    expect(mocks.send).toHaveBeenLastCalledWith('/api/solar-fields/mission-transfer', { method: 'POST', body: { site: id, revision: 1, runId: 'mission-run-1' } })
  })

  it('keeps the cargo in the field while an offline save is queued', async () => {
    mocks.outbox.current = createOutbox({ store: memoryStore(), isOnline: () => false, execute: async () => ({ kind: 'offline' }) })
    mocks.send.mockResolvedValueOnce({ revision: 0, state: null })
    const sync = new SolarFieldSync()
    await sync.loadMission(id)
    await sync.saveMission(state, 'Rover')
    await expect(sync.transferToMission('mission-run-1')).rejects.toThrow('Reconnect')
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect((mocks.outbox.current as ReturnType<typeof createOutbox>).pending()).toHaveLength(1)
  })

})
