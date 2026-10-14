import { describe, expect, it } from 'vitest'
import { mergeMissionLog, projectMissionLog } from './mission-log'

describe('mission log projection', () => {
  it('projects a durable transit launch even when the device has no local record', () => {
    const remote = projectMissionLog([{ mission_id: 'story-transit-telescope-launch', completed_at: '2026-10-10T03:52:45.164Z' }], [])
    expect(remote).toEqual([expect.objectContaining({ id: 'story-transit-telescope-launch', title: 'Launch Transit Telescope', kind: 'program' })])
  })

  it('retains local debrief records while adding missed durable operations', () => {
    const merged = mergeMissionLog([{ id: 'client-1', title: 'Client work', completedAt: 2 }], [{ id: 'story-transit-telescope-launch', title: 'Launch Transit Telescope', completedAt: 1, kind: 'program' }])
    expect(merged).toHaveLength(2)
  })
})
