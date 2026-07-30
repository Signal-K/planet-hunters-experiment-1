import {
  MISSION_SCHEMA_VERSION,
  computeStats,
  defaultSpec,
  type MissionState,
  type ResourceKey,
  type SyncAdapter,
} from '@takeon/engine'
import { describe, expect, it, vi } from 'vitest'
import {
  LandnamSync,
  type LandnamPersistenceClient,
} from './LandnamSync'

function missionFixture(): MissionState {
  const spec = defaultSpec()
  return {
    schemaVersion: MISSION_SCHEMA_VERSION,
    id: 'mars-alpha',
    bodyId: 'mars',
    seed: 42,
    time: 125,
    rover: {
      spec,
      stats: computeStats(spec),
      pos: { x: 4, y: 7 },
      renderPos: { x: 4, y: 7 },
      facing: 1,
      battery: 80,
      fuel: 50,
      durability: 100,
      cargo: { iron: 3 },
      cargoUsed: 3,
      moveT: 0,
      moveFrom: null,
      mining: null,
    },
    structures: [{
      id: 'structure-1',
      type: 'solar-array',
      pos: { x: 5, y: 7 },
      buffer: {},
      facing: 2,
    }],
    anomalies: [],
    photos: [],
    edits: { '4,7,1': 0 },
    weather: null,
    status: 'active',
  }
}

class MemoryCollection {
  records: Record<string, unknown>[] = []
  nextId = 1

  async getFullList(options?: { filter?: string }): Promise<Record<string, unknown>[]> {
    return this.filter(options?.filter)
  }

  async getFirstListItem(filter: string): Promise<Record<string, unknown>> {
    const record = this.filter(filter)[0]
    if (!record) throw new Error('not found')
    return record
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const record = { ...data, id: `record-${this.nextId++}`, updated: new Date().toISOString() }
    this.records.push(record)
    return record
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const index = this.records.findIndex(record => record.id === id)
    if (index < 0) throw new Error('not found')
    const record = { ...this.records[index], ...data, updated: new Date().toISOString() }
    this.records[index] = record
    return record
  }

  async delete(id: string): Promise<boolean> {
    this.records = this.records.filter(record => record.id !== id)
    return true
  }

  private filter(filter?: string): Record<string, unknown>[] {
    if (!filter) return this.records
    const pairs = [...filter.matchAll(/(user|target_id) = "([^"]*)"/g)]
    return this.records.filter(record =>
      pairs.every(([, key, value]) => record[key] === value)
    )
  }
}

function memoryClient() {
  const worlds = new MemoryCollection()
  const structures = new MemoryCollection()
  const client: LandnamPersistenceClient = {
    authStore: { record: { id: 'player-1' } },
    collection(name) {
      if (name === 'voxel_worlds') return worlds
      if (name === 'structures') return structures
      throw new Error(`unexpected collection ${name}`)
    },
  }
  return { client, worlds, structures }
}

describe('LandnamSync', () => {
  it('round-trips Takeon mission state through Landnam collections', async () => {
    const { client, worlds, structures } = memoryClient()
    const sync = new LandnamSync({ client })
    const state = missionFixture()

    await sync.saveMission(state, 'Pathfinder')
    const loaded = await sync.loadMission(state.id)

    expect(worlds.records).toHaveLength(1)
    expect(structures.records).toHaveLength(1)
    expect(loaded).toMatchObject({
      id: 'mars-alpha',
      bodyId: 'mars',
      seed: 42,
      time: 125,
      status: 'active',
      edits: { '4,7,1': 0 },
      structures: [{
        id: 'structure-1',
        type: 'solar-array',
        pos: { x: 5, y: 7 },
        facing: 2,
      }],
    })
  })

  it('updates structures and removes records no longer in the mission', async () => {
    const { client, structures } = memoryClient()
    const sync = new LandnamSync({ client })
    const state = missionFixture()
    await sync.saveMission(state, 'Pathfinder')

    await sync.saveMission({ ...state, structures: [] }, 'Pathfinder')

    expect(structures.records).toHaveLength(0)
  })

  it('stores Takeon launch-pad instances under the canonical Landnam blueprint', async () => {
    const { client, structures } = memoryClient()
    const sync = new LandnamSync({ client })
    const state = missionFixture()
    state.structures = [{
      id: 'launch-pad-1',
      type: 'launch-pad',
      pos: { x: 2, y: 3 },
      buffer: {},
    }]

    await sync.saveMission(state, 'Pathfinder')
    const loaded = await sync.loadMission(state.id)

    expect(structures.records[0].blueprint_slug).toBe('launchpad')
    expect(loaded?.structures[0].type).toBe('launch-pad')
  })

  it('delegates payout to the Landnam economy callback', async () => {
    const { client } = memoryClient()
    const bankMission = vi.fn(async (
      _state: MissionState,
      banked: Partial<Record<ResourceKey, number>>
    ) => banked.iron ?? 0)
    const sync = new LandnamSync({ client, bankMission })

    await expect(sync.completeMission(missionFixture(), { iron: 7 })).resolves.toBe(7)
    expect(bankMission).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'complete' }),
      { iron: 7 }
    )
  })

  it('uses the supplied fallback while Landnam auth is unavailable', async () => {
    const fallback = {
      loadMission: vi.fn(async () => missionFixture()),
    } as unknown as SyncAdapter
    const { client } = memoryClient()
    client.authStore.record = null
    const sync = new LandnamSync({ client, fallback })

    await expect(sync.loadMission('mars-alpha')).resolves.toMatchObject({
      id: 'mars-alpha',
    })
    expect(fallback.loadMission).toHaveBeenCalledWith('mars-alpha')
  })
})
