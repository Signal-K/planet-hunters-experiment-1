import { describe, expect, it } from 'vitest'
import type { OutboxItem, OutboxOp } from '@/lib/offline/outbox'
import { writeSolarFieldIdentity } from './solarFieldIdentity'
import { hasSolarFieldConflict, queuedSolarField, validAccountSolarField } from './solarFieldRecovery'

const save = (id: string, user = 'one', site = 'solar:mars:east'): OutboxOp => ({ type: 'solar-field', id, user, site, revision: 0, state: {} })
const item = (op: OutboxOp, lastError?: string): OutboxItem => ({ id: 'queue-' + ('id' in op ? op.id : ''), op, createdAt: 1, attempts: 1, nextAttemptAt: 0, failed: false, lastError })
const snapshot = writeSolarFieldIdentity(JSON.stringify({ config: { body: { coreDEM: { size: 2, heights: [0, 0, 0, 0], surfaceMaterials: [1, 1, 1, 1] } } } }), { kind: 'solar', version: 1, bodyId: 'mars', zone: 'east', seed: 1 })

describe('solar field conflict recovery', () => {
  it('backs up every revision belonging to the same account and site', () => {
    const queue = [item(save('one'), '409 conflict'), item(save('two')), item(save('other', 'two')), item(save('west', 'one', 'solar:mars:west'))]
    const selected = queuedSolarField(queue, 'one', 'solar:mars:east')
    expect(selected).toHaveLength(2)
    expect(hasSolarFieldConflict(selected)).toBe(true)
    expect(hasSolarFieldConflict([item(save('retry'), '500 unavailable')])).toBe(false)
  })
  it('refuses an absent, damaged, or wrong-location account copy', () => {
    const site = 'solar:mars:east'
    expect(validAccountSolarField({ revision: 1, state: { id: site, coreSnapshot: snapshot } }, site)).toBe(true)
    expect(validAccountSolarField({ revision: 0, state: null }, site)).toBe(false)
    expect(validAccountSolarField({ revision: 1, state: { id: site, coreSnapshot: '{}' } }, site)).toBe(false)
    expect(validAccountSolarField({ revision: 1, state: { id: 'solar:mars:west', coreSnapshot: snapshot } }, site)).toBe(false)
  })
})
