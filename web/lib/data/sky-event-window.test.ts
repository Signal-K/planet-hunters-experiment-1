import { describe, expect, it } from 'vitest'
import { ORIONIDS_EPHEMERIS, isInLocalEventBonusWindow, localSkyEventWindow, sanitizePlayerLocation } from './sky-event-window'

describe('local sky-event windows', () => {
  it('produces different local bonus windows for different player locations', () => {
    const tallinn = localSkyEventWindow(ORIONIDS_EPHEMERIS, { city: 'Tallinn', latitude: 59, timeZone: 'Europe/Tallinn' })
    const newYork = localSkyEventWindow(ORIONIDS_EPHEMERIS, { city: 'New York', latitude: 41, timeZone: 'America/New_York' })
    expect(tallinn.best).not.toBeNull()
    expect(newYork.best).not.toBeNull()
    expect(tallinn.best?.startMs).not.toBe(newYork.best?.startMs)
    expect(isInLocalEventBonusWindow(tallinn.best!.startMs, tallinn.location)).toBe(true)
    expect(isInLocalEventBonusWindow(tallinn.best!.startMs, newYork.location)).toBe(false)
  })

  it('rounds and validates the privacy-preserving location', () => {
    expect(sanitizePlayerLocation({ city: 'Tallinn', latitude: 59.437, longitude: 24.7536, timeZone: 'Europe/Tallinn' }))
      .toEqual({ city: 'Tallinn', latitude: 59, timeZone: 'Europe/Tallinn' })
    expect(sanitizePlayerLocation({ latitude: 30, timeZone: 'Not/AZone' })).toBeNull()
  })
})
