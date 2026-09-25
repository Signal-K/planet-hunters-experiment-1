import { describe, expect, it } from 'vitest'
import { defaultSpec } from '@takeon/engine'
import type { Mission, Target } from '@/lib/data/types'
import { fieldOperationForMission } from './field-operation'

const mission: Mission = {
  id: 'mission-field-slice',
  title: 'Lunar Sample Relay',
  brief: 'Move the requested sample to the field site.',
  tag: 'FIELD',
  difficulty: 'L1',
  locked: false,
  sequence: 4,
  targetId: 'target-field',
  deliveryTargetId: 'vesta',
  requires: {
    minerals: { iron: 3, carbon: 2 },
    cargo_min: 4,
    drill_tier: 1,
    max_orbit: 4,
  },
  payout: { francs: 0, affinity: 0 },
}

const target: Target = {
  id: 'target-field',
  name: 'Field Target',
  type: 'asteroid',
  orbit: 1,
  difficulty: 'L1',
  brief: 'A test target.',
  minerals: ['iron', 'carbon'],
}

describe('host-owned FieldOperation mapping', () => {
  it('maps mission context into a deterministic TakeOn handoff', () => {
    const input = {
      mission,
      target,
      siteId: 'moon-south-pole',
      rover: defaultSpec(),
      accessPurchasedAt: 10_000,
      startedAt: 20_000,
    }

    const first = fieldOperationForMission(input)
    const second = fieldOperationForMission({ ...input, startedAt: 30_000 })

    expect(first).not.toBeNull()
    expect(first).toMatchObject({
      missionId: mission.id,
      targetId: target.id,
      siteId: 'moon-south-pole',
      bodyId: 'moon',
      cargo: { requirements: { iron: 3, carbon: 2 }, capacity: 5 },
      objective: { kind: 'logistics', description: mission.brief },
      returnPolicy: { owner: 'landnam', reconcileAt: 'field-return' },
      startedAt: 20_000,
    })
    expect(second?.id).toBe(first?.id)
    expect(second?.seed).toBe(first?.seed)
  })

  it('rejects an unmapped target, locked site, or missing access timestamp', () => {
    const input = {
      mission,
      target,
      siteId: 'moon-south-pole',
      rover: defaultSpec(),
      accessPurchasedAt: 10_000,
      startedAt: 20_000,
    }

    expect(fieldOperationForMission({ ...input, target: { ...target, id: 'other-target' } })).toBeNull()
    expect(fieldOperationForMission({ ...input, siteId: 'mars-arcadia' })).toBeNull()
    expect(fieldOperationForMission({ ...input, accessPurchasedAt: Number.NaN })).toBeNull()
  })
})
