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

  it('persists a storage silo as a finished structure and reloads it that way', async () => {
    const { client, structures } = memoryClient()
    const sync = new LandnamSync({ client })
    const state = missionFixture()
    state.structures = [{
      id: 'silo-1',
      type: 'silo',
      pos: { x: 8, y: 4 },
      buffer: { iron: 2 },
      facing: 1,
    }]

    await sync.saveMission(state, 'Pathfinder')
    const loaded = await sync.loadMission(state.id)

    expect(structures.records[0]).toMatchObject({
      blueprint_slug: 'silo',
      structure_id: 'silo-1',
      pos_x: 8,
      pos_y: 4,
      progress: null,
    })
    expect(loaded?.structures[0]).toMatchObject({
      id: 'silo-1',
      type: 'silo',
      pos: { x: 8, y: 4 },
      buffer: { iron: 2 },
      facing: 1,
    })
    expect(loaded?.structures[0]).not.toHaveProperty('progress')

    // Rows saved before this fix stored the missing progress as 0, which the
    // flat view paints as an unfinished blueprint.
    structures.records[0].progress = 0
    const repaired = await sync.loadMission(state.id)
    expect(repaired?.structures[0]).not.toHaveProperty('progress')
  })

  it('still round-trips habitat-frame construction progress', async () => {
    const { client, structures } = memoryClient()
    const sync = new LandnamSync({ client })
    const state = missionFixture()
    state.structures = [{
      id: 'frame-1',
      type: 'habitat-frame',
      pos: { x: 1, y: 1 },
      buffer: {},
      progress: 0.4,
    }]

    await sync.saveMission(state, 'Pathfinder')
    const loaded = await sync.loadMission(state.id)

    expect(structures.records[0].progress).toBe(0.4)
    expect(loaded?.structures[0]).toMatchObject({ type: 'habitat-frame', progress: 0.4 })
  })

  it('reloads every placed field structure type in a fresh session (SSL-341)', async () => {
    const { client, structures } = memoryClient()
    const state = missionFixture()
    const types = [
      'solar-array', 'beacon', 'drill-rig', 'cache', 'refinery', 'habitat-frame',
      'habitat', 'launch-pad', 'generator', 'pylon', 'road', 'factory', 'silo',
    ] as const
    state.structures = types.map((type, index) => ({
      id: `placed-${type}`,
      type,
      pos: { x: index, y: index + 1 },
      buffer: {},
      facing: 3,
      ...(type === 'habitat-frame' ? { progress: 0.5 } : {}),
    }))

    await new LandnamSync({ client }).saveMission(state, 'Pathfinder')
    // A reload builds a new adapter; nothing may survive in memory.
    const reloaded = await new LandnamSync({ client }).loadMission(state.id)

    expect(structures.records).toHaveLength(types.length)
    expect(reloaded?.structures.map(structure => structure.type).sort()).toEqual([...types].sort())
    for (const [index, type] of types.entries()) {
      expect(reloaded?.structures.find(structure => structure.id === `placed-${type}`)).toMatchObject({
        type,
        pos: { x: index, y: index + 1 },
        facing: 3,
      })
    }
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
