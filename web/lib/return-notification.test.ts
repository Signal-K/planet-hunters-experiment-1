import { describe, expect, it } from 'vitest'
import { returnNotification } from './return-notification'

describe('returnNotification', () => {
  it('schedules the return push for the return leg arrival, not launch time', () => {
    const arrivalAt = Date.UTC(2026, 8, 25, 12, 30)
    expect(returnNotification({ arrivalAt, returningToEarth: true, missionTitle: 'Baseline Extraction', originName: 'Mars' })).toEqual({
      scheduledFor: arrivalAt,
      title: 'Baseline Extraction — RETURNED',
      body: 'Your rocket has returned from Mars. Cargo is ready for debrief.',
    })
  })

  it('does not send a return push for an outbound or delivery leg', () => {
    expect(returnNotification({ arrivalAt: Date.now() + 60_000, returningToEarth: false, missionTitle: 'Baseline Extraction' })).toBeNull()
  })

  it('does not send a return push for an untimed leg', () => {
    expect(returnNotification({ arrivalAt: null, returningToEarth: true })).toBeNull()
  })

  it('falls back to generic copy without mission context', () => {
    expect(returnNotification({ arrivalAt: 1_000, returningToEarth: true })).toEqual({
      scheduledFor: 1_000,
      title: 'ROCKET RETURNED',
      body: 'Your rocket has returned to Earth.',
    })
  })
})
