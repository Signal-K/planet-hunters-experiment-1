import { notificationForTakeonEvent } from './events'
import { describe, expect, it } from 'vitest'

describe('Takeon host event notifications', () => {
  it('routes mission-critical events to scheduled notification copy', () => {
    expect(notificationForTakeonEvent({
      type: 'batteryEmpty',
      payload: {},
    })).toMatchObject({ title: 'ROVER BATTERY DEPLETED' })

    expect(notificationForTakeonEvent({
      type: 'roverLost',
      payload: { reason: 'terrain' },
    })).toEqual({
      title: 'ROVER SIGNAL LOST',
      body: 'Surface operations stopped: terrain.',
    })

    expect(notificationForTakeonEvent({
      type: 'anomalyDocumented',
      payload: {
        anomaly: {
          id: 'anomaly-1',
          type: 'ice-vent',
          name: 'Ice Vent 04',
          pos: { x: 1, y: 2 },
          scanned: true,
          documented: true,
        },
      },
    })).toMatchObject({
      title: 'ANOMALY DOCUMENTED',
      body: expect.stringContaining('Ice Vent 04'),
    })
  })

  it('does not create push spam for high-frequency field events', () => {
    expect(notificationForTakeonEvent({
      type: 'mined',
      payload: { resource: 'iron', amount: 1 },
    })).toBeNull()
    expect(notificationForTakeonEvent({
      type: 'scan',
      payload: { found: [] },
    })).toBeNull()
    expect(notificationForTakeonEvent({
      type: 'built',
      payload: {
        structure: {
          id: 'solar-1',
          type: 'solar-array',
          pos: { x: 1, y: 1 },
          buffer: {},
        },
      },
    })).toBeNull()
  })
})
