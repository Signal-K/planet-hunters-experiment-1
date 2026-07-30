import {
  LocalSync,
  type Anomaly,
  type BodyDef,
  type MissionState,
  type MissionSummary,
  type PartDef,
  type PhotoMeta,
  type ResourceKey,
  type RoverSpec,
  type Structure,
  type StructureType,
  type SyncAdapter,
  type TakeonProfile,
} from '@takeon/engine'
import { pbLandnam } from '@/lib/pb-landnam'

type JsonRecord = Record<string, unknown>

interface LandnamCollection {
  getFullList(options?: { filter?: string; sort?: string }): Promise<JsonRecord[]>
  getFirstListItem(filter: string): Promise<JsonRecord>
  create(data: JsonRecord): Promise<JsonRecord>
  update(id: string, data: JsonRecord): Promise<JsonRecord>
  delete(id: string): Promise<boolean>
}

export interface LandnamPersistenceClient {
  collection(name: string): LandnamCollection
  authStore: {
    record: { id?: string } | null
  }
}

export interface LandnamSyncOptions {
  client?: LandnamPersistenceClient
  fallback?: SyncAdapter
  getProfile?: (userId: string) => Promise<TakeonProfile>
  bankMission?: (
    state: MissionState,
    banked: Partial<Record<ResourceKey, number>>
  ) => Promise<number>
  spendCredits?: (amount: number) => Promise<boolean>
}

const STRUCTURE_TYPES = new Set<StructureType>([
  'solar-array',
  'beacon',
  'drill-rig',
  'cache',
  'refinery',
  'habitat-frame',
  'habitat',
  'launch-pad',
  'generator',
  'pylon',
])

const BLUEPRINT_BY_TAKEON_TYPE: Record<StructureType, string> = {
  'solar-array': 'solar-array',
  beacon: 'beacon',
  'drill-rig': 'drill-rig',
  cache: 'cache',
  refinery: 'refinery',
  'habitat-frame': 'habitat-frame',
  habitat: 'habitat',
  'launch-pad': 'launchpad',
  generator: 'generator',
  pylon: 'pylon',
}

const TAKEON_TYPE_BY_BLUEPRINT = new Map(
  Object.entries(BLUEPRINT_BY_TAKEON_TYPE)
    .map(([takeonType, blueprint]) => [blueprint, takeonType as StructureType])
)

function filterValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

function textField(record: JsonRecord, key: string, fallback = ''): string {
  const value = record[key]
  return typeof value === 'string' ? value : fallback
}

function numberField(record: JsonRecord, key: string, fallback = 0): number {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function objectField<T>(record: JsonRecord, key: string, fallback: T): T {
  const value = record[key]
  return value !== null && typeof value === 'object' ? value as T : fallback
}

function missionStatus(value: unknown): MissionState['status'] {
  return value === 'complete' || value === 'lost' ? value : 'active'
}

function updatedTimestamp(record: JsonRecord): number {
  const updated = textField(record, 'updated')
  const parsed = Date.parse(updated)
  return Number.isNaN(parsed) ? 0 : parsed
}

function structureFromRecord(record: JsonRecord): Structure | null {
  const blueprint = textField(record, 'blueprint_slug')
  const type = TAKEON_TYPE_BY_BLUEPRINT.get(blueprint)
    ?? blueprint as StructureType
  if (!STRUCTURE_TYPES.has(type)) return null

  const facing = numberField(record, 'facing')
  const structure: Structure = {
    id: textField(record, 'structure_id'),
    type,
    pos: {
      x: numberField(record, 'pos_x'),
      y: numberField(record, 'pos_y'),
    },
    buffer: objectField(record, 'buffer', {}),
    facing: facing === 1 || facing === 2 || facing === 3 ? facing : 0,
  }
  const cooldownUntil = record.cooldown_until
  const progress = record.progress
  if (typeof cooldownUntil === 'number') structure.cooldownUntil = cooldownUntil
  if (typeof progress === 'number') structure.progress = progress
  return structure
}

/**
 * Takeon's persistence adapter for Landnam.
 *
 * Mission state is stored in Landnam's existing voxel_worlds and structures
 * collections. Economy changes remain host-owned: completing a mission only
 * banks yield when Landnam supplies bankMission, preventing a second Takeon
 * credit balance from appearing beside the game's canonical economy.
 */
export class LandnamSync implements SyncAdapter {
  readonly mode = 'remote' as const

  private readonly client: LandnamPersistenceClient
  private readonly fallback: SyncAdapter
  private readonly options: LandnamSyncOptions

  constructor(options: LandnamSyncOptions = {}) {
    this.client = options.client
      ?? pbLandnam as unknown as LandnamPersistenceClient
    this.fallback = options.fallback ?? new LocalSync()
    this.options = options
  }

  private get userId(): string | null {
    return this.client.authStore.record?.id ?? null
  }

  private worldFilter(userId: string, missionId?: string): string {
    const owner = `user = "${filterValue(userId)}"`
    return missionId
      ? `${owner} && target_id = "${filterValue(missionId)}"`
      : owner
  }

  async getCatalog(): Promise<{ parts: PartDef[]; bodies: BodyDef[] }> {
    return this.fallback.getCatalog()
  }

  async getProfile(): Promise<TakeonProfile> {
    const userId = this.userId
    if (userId && this.options.getProfile) return this.options.getProfile(userId)
    return {
      userId: userId ?? 'offline',
      credits: 0,
      inventory: {},
      discoveries: 0,
    }
  }

  listRovers(): Promise<RoverSpec[]> {
    return this.fallback.listRovers()
  }

  saveRover(spec: RoverSpec): Promise<RoverSpec> {
    return this.fallback.saveRover(spec)
  }

  deleteRover(id: string): Promise<void> {
    return this.fallback.deleteRover(id)
  }

  async listMissions(): Promise<MissionSummary[]> {
    const userId = this.userId
    if (!userId) return this.fallback.listMissions()

    try {
      const worlds = await this.client.collection('voxel_worlds').getFullList({
        filter: this.worldFilter(userId),
        sort: '-updated',
      })
      return worlds.map(world => ({
        id: textField(world, 'target_id'),
        bodyId: textField(world, 'body_id'),
        roverName: textField(world, 'rover_name', 'Rover'),
        status: missionStatus(world.status),
        updated: updatedTimestamp(world),
      }))
    } catch {
      return this.fallback.listMissions()
    }
  }

  async loadMission(id: string): Promise<MissionState | null> {
    const userId = this.userId
    if (!userId) return this.fallback.loadMission(id)

    try {
      const world = await this.client.collection('voxel_worlds')
        .getFirstListItem(this.worldFilter(userId, id))
      const structureRecords = await this.client.collection('structures').getFullList({
        filter: this.worldFilter(userId, id),
      })
      const rover = objectField<MissionState['rover'] | null>(world, 'rover', null)
      if (!rover) return null

      return {
        schemaVersion: numberField(world, 'schema_version') || undefined,
        id,
        bodyId: textField(world, 'body_id'),
        seed: numberField(world, 'seed'),
        time: numberField(world, 'time'),
        rover,
        structures: structureRecords
          .map(structureFromRecord)
          .filter((structure): structure is Structure => structure !== null),
        anomalies: objectField(world, 'anomalies', []),
        photos: objectField(world, 'photos', []),
        edits: objectField(world, 'edits', {}),
        weather: objectField(world, 'weather', null),
        status: missionStatus(world.status),
      }
    } catch {
      return this.fallback.loadMission(id)
    }
  }

  async saveMission(state: MissionState, roverName: string): Promise<void> {
    const userId = this.userId
    if (!userId) {
      await this.fallback.saveMission(state, roverName)
      return
    }

    try {
      const worlds = this.client.collection('voxel_worlds')
      const filter = this.worldFilter(userId, state.id)
      const data: JsonRecord = {
        user: userId,
        target_id: state.id,
        body_id: state.bodyId,
        rover_name: roverName,
        seed: state.seed,
        schema_version: state.schemaVersion ?? 0,
        status: state.status,
        time: state.time,
        edits: state.edits,
        rover: state.rover,
        anomalies: state.anomalies,
        photos: state.photos,
        weather: state.weather ?? null,
      }
      const existing = await worlds.getFirstListItem(filter).catch(() => null)
      if (existing) await worlds.update(textField(existing, 'id'), data)
      else await worlds.create(data)

      await this.saveStructures(userId, state.id, state.structures)
    } catch {
      await this.fallback.saveMission(state, roverName)
    }
  }

  private async saveStructures(
    userId: string,
    missionId: string,
    structures: Structure[]
  ): Promise<void> {
    const collection = this.client.collection('structures')
    const existing = await collection.getFullList({
      filter: this.worldFilter(userId, missionId),
    })
    const byStructureId = new Map(
      existing.map(record => [textField(record, 'structure_id'), record])
    )

    for (const structure of structures) {
      const data: JsonRecord = {
        user: userId,
        target_id: missionId,
        structure_id: structure.id,
        blueprint_slug: BLUEPRINT_BY_TAKEON_TYPE[structure.type],
        pos_x: structure.pos.x,
        pos_y: structure.pos.y,
        facing: structure.facing ?? 0,
        buffer: structure.buffer,
        cooldown_until: structure.cooldownUntil ?? 0,
        progress: structure.progress ?? 0,
      }
      const record = byStructureId.get(structure.id)
      if (record) {
        await collection.update(textField(record, 'id'), data)
        byStructureId.delete(structure.id)
      } else {
        await collection.create(data)
      }
    }

    await Promise.all(
      [...byStructureId.values()].map(record => collection.delete(textField(record, 'id')))
    )
  }

  async completeMission(
    state: MissionState,
    banked: Partial<Record<ResourceKey, number>>
  ): Promise<number> {
    const completed = { ...state, status: 'complete' as const }
    await this.saveMission(completed, completed.rover.spec.name)
    return this.options.bankMission
      ? this.options.bankMission(completed, banked)
      : 0
  }

  uploadPhoto(meta: PhotoMeta, dataUrl: string | null, missionId: string): Promise<void> {
    return this.fallback.uploadPhoto(meta, dataUrl, missionId)
  }

  async recordDiscovery(
    _anomaly: Anomaly,
    _bodyId: string,
    _missionId: string
  ): Promise<void> {
    // Discoveries are persisted in the mission's anomalies JSON on save.
  }

  spendCredits(amount: number): Promise<boolean> {
    return this.options.spendCredits
      ? this.options.spendCredits(amount)
      : Promise.resolve(false)
  }
}
