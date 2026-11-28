import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionState } from '@takeon/engine'
import { memoryStore, createOutbox } from '@/lib/offline/outbox'
import { writeSolarFieldIdentity } from './solarFieldIdentity'
import { DEFAULT_STATE, normalizeAndRepair, mergeRemoteState } from '@/lib/game-state'
import { applyRedockComplete } from '@/lib/systems/LandingSystem'
import { applyReturnArrived } from '@/lib/systems/MiningSystem'
import { returningScreen } from '@/lib/initial-route'
import { stampLedger } from '@/lib/sync/ledger'
import { applyHomeSplit } from '@/lib/systems/HomeDeliverySystem'

const mocks = vi.hoisted(() => ({ send: vi.fn(), legacyHas: vi.fn(), outbox: { current: null as unknown } }))
vi.mock('@/lib/pb-landnam', () => ({ pbLandnam: { authStore: { record: { id: 'player' }, token: 'token' }, send: mocks.send } }))
vi.mock('@/lib/offline/pbOutbox', () => ({ getSolarFieldOutbox: () => mocks.outbox.current, getOutbox: () => ({ has: mocks.legacyHas, flush: async () => {} }), isQueuedUpsert: () => false }))

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
    expect(mocks.send).toHaveBeenLastCalledWith('/api/solar-fields/mission-transfer', { method: 'POST', body: { site: id, revision: 1, runId: 'mission-run-1' }, requestKey: null })
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

  it('recovers a committed return after a lost response without moving the hold again', async () => {
    mocks.send.mockResolvedValueOnce({ revision: 2, state }).mockResolvedValueOnce({ site: id, runId: 'mission-run-1', cargo: { 'landnam:iron': 1 } })
    const sync = new SolarFieldSync()
    await sync.loadMission(id)
    expect(await sync.recoverMissionTransfer('mission-run-1')).toEqual({ iron: 1 })
    expect(mocks.send).toHaveBeenLastCalledWith('/api/solar-fields/transfer', { query: { runId: 'mission-run-1' }, requestKey: null })
    expect((mocks.outbox.current as ReturnType<typeof createOutbox>).pending()).toHaveLength(0)
  })

  it('distinguishes a new run with no receipt from a bad or unavailable receipt', async () => {
    mocks.send.mockResolvedValueOnce({ revision: 1, state }).mockRejectedValueOnce({ status: 404 }).mockResolvedValueOnce({ site: 'solar:mars:west', runId: 'mission-run-1', cargo: { 'landnam:iron': 1 } }).mockRejectedValueOnce({ status: 0 })
    const sync = new SolarFieldSync()
    await sync.loadMission(id)
    expect(await sync.recoverMissionTransfer('mission-run-1')).toBeNull()
    await expect(sync.recoverMissionTransfer('mission-run-1')).rejects.toThrow('Invalid cargo receipt')
    await expect(sync.recoverMissionTransfer('mission-run-1')).rejects.toEqual({ status: 0 })
  })

  it('recovers an empty return as a valid receipt', async () => {
    mocks.send.mockResolvedValueOnce({ revision: 1, state }).mockResolvedValueOnce({ site: id, runId: 'mission-run-1', cargo: {} })
    const sync = new SolarFieldSync()
    await sync.loadMission(id)
    expect(await sync.recoverMissionTransfer('mission-run-1')).toEqual({})
  })

  it('carries recovered account cargo through ascent, save/reload and Earth settlement', async () => {
    mocks.send.mockResolvedValueOnce({ revision: 2, state }).mockResolvedValueOnce({ site: id, runId: 'mission-run-1', cargo: { 'landnam:nickel': 2 } })
    const sync = new SolarFieldSync()
    await sync.loadMission(id)
    const cargo = await sync.recoverMissionTransfer('mission-run-1')
    expect(cargo).toEqual({ nickel: 2 })
    const ascent = { ...DEFAULT_STATE, screen: 'landing' as const, missionId: 'mine-mars', targetId: 'mars',
      player: { ...DEFAULT_STATE.player, missionRunId: 'mission-run-1', landingReturnStartedAt: 1, miningCargoInProgress: cargo! } }
    const flight = applyRedockComplete(ascent, cargo!, null, null)
    expect(flight.lastCargo).toEqual({ nickel: 2 })
    const reloaded = normalizeAndRepair(JSON.parse(JSON.stringify(flight)))
    const home = applyReturnArrived(reloaded)
    expect(home.player.stash?.nickel).toBe(2)
    expect(home.player.homeDeliveryPending).toBe(true)
    const settled = applyHomeSplit(home, { nickel: { client: 0, silo: 0 } }, { nickel: 2 }).state
    expect(settled.player.stash?.nickel ?? 0).toBe(0)
    expect(settled.player.francs).toBe(home.player.francs)
    expect(settled.player.homeSettlement?.left).toEqual({ nickel: 2 })
    expect(settled.player.homeDeliveryPending).toBe(false)
  })

})


it('a queued pre-return save adopts committed ascent without duplicating settled cargo', () => {
  const activeMission = { id: 'mine-mars', label: 'Mine Mars' }
  const mining = { ...DEFAULT_STATE, screen: 'mining' as const, missionId: 'mine-mars', targetId: 'mars',
    player: { ...DEFAULT_STATE.player, activeMission, missionRunId: 'mission-run-1', missionPhase: 'mining' as const } }
  const returned = { runId: 'mission-run-1', site: id, cargo: { nickel: 2 }, startedAt: 123 }
  const remote = { ...mining, screen: 'landing' as const, player: { ...mining.player, solarCargoReturn: returned, missionPhase: 'landing' as const, landingReturnStartedAt: 123, miningCargoInProgress: returned.cargo } }
  const merged = mergeRemoteState(mining, remote)
  expect(merged.screen).toBe('landing')
  expect(returningScreen(JSON.stringify(merged))).toBe('landing')
  expect(merged.player.miningCargoInProgress).toEqual({ nickel: 2 })
  expect(merged.player.landingReturnStartedAt).toBe(123)
  expect(mergeRemoteState({ ...mining, screen: 'hub' }, remote).screen).toBe('hub')
  const flight = applyRedockComplete(merged, returned.cargo, null, null)
  const home = stampLedger(applyReturnArrived(mergeRemoteState(flight, remote)), 'test-device')
  expect(home.player.stash?.nickel).toBe(2)
  expect(applyReturnArrived(mergeRemoteState(home, remote)).player.stash?.nickel).toBe(2)
})
