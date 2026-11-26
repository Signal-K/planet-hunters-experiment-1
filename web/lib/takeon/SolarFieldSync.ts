import type { MissionState } from '@takeon/engine'
import { getOutbox } from '@/lib/offline/pbOutbox'
import { newRecordId } from '@/lib/offline/outbox'
import { pbLandnam } from '@/lib/pb-landnam'
import { missionZone } from '@/lib/data/mission-zone'
import { LandnamSync } from './LandnamSync'
import { readSolarFieldIdentity } from './solarFieldIdentity'

/** New ids never collide with an older, target-keyed voxel_worlds save. */
export function solarFieldId(bodyId: string, zone: unknown): string {
  if (!/^[a-z0-9-]+$/.test(bodyId)) throw new Error('Invalid solar field body')
  return `solar:${bodyId}:${missionZone(zone)}`
}

/** Atomic, revisioned solar fields. Older rover fields continue to use LandnamSync. */
export class SolarFieldSync extends LandnamSync {
  private revision: number | null = null
  private owner: string | null = null
  private site: string | null = null
  private tail: Promise<void> = Promise.resolve()

  override async loadMission(id: string): Promise<MissionState | null> {
    await this.tail
    const owner = pbLandnam.authStore.record?.id
    if (!owner) throw new Error('Sign in to open this field')
    const outbox = getOutbox()
    await outbox.has(op => op.type === 'solar-field' && op.user === owner && op.site === id)
    const pending = outbox.pending().filter(item => item.op.type === 'solar-field' && item.op.user === owner && item.op.site === id)
    if (pending.some(item => item.failed || item.lastError?.includes('409'))) throw new Error('This field changed on another device. Your local changes are retained; resolve the sync problem before continuing.')
    const latest = pending[pending.length - 1]?.op
    let result: { revision: number; state: MissionState | null }
    if (latest?.type === 'solar-field') {
      // The last queued document is the newest complete local field, including
      // its rover hold. Continuing offline extends its revision chain.
      result = { revision: latest.revision + 1, state: latest.state as unknown as MissionState }
    } else {
      if (!pbLandnam.authStore.token) throw new Error('Reconnect to open this field')
      result = await pbLandnam.send<{ revision: number; state: MissionState | null }>('/api/solar-fields', { query: { site: id } })
    }
    if (pbLandnam.authStore.record?.id !== owner) throw new Error('Account changed while opening the field')
    if (!Number.isSafeInteger(result.revision) || result.revision < 0 || (!!result.state !== (result.revision > 0))) throw new Error('Invalid field response')
    if (result.state) {
      const identity = readSolarFieldIdentity(result.state.coreSnapshot)
      if (result.state.id !== id || !identity || solarFieldId(identity.bodyId, identity.zone) !== id) throw new Error('Saved field belongs to another location')
    }
    this.owner = owner
    this.site = id
    this.revision = result.revision
    return result.state
  }

  override async saveMission(state: MissionState, _roverName: string): Promise<void> {
    const save = this.tail.then(async () => {
      const owner = this.owner
      const revision = this.revision
      if (!owner || revision === null || this.site !== state.id || pbLandnam.authStore.record?.id !== owner) throw new Error('Field account or location changed')
      const identity = readSolarFieldIdentity(state.coreSnapshot)
      if (!identity || solarFieldId(identity.bodyId, identity.zone) !== state.id) throw new Error('Invalid solar field snapshot')
      await getOutbox().enqueue({ type: 'solar-field', id: newRecordId(), user: owner, site: state.id, revision, state: state as unknown as Record<string, unknown> })
      this.revision = revision + 1
    })
    this.tail = save.catch(() => {})
    return save
  }
}
