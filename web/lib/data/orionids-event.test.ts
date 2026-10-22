import { describe, expect, it } from 'vitest'
import { GEMINIDS_DEBRIS_PRESET, LEONIDS_DEBRIS_PRESET, ORIONIDS_DEBRIS_PRESET, ORIONIDS_PEAK_MULTIPLIER, ORIONIDS_PEAK_REMINDER, debrisRatePerMinute, isOrionidsPeakNight, orionidsPeakReminderMs, orionidsPhase, orionidsShareText } from './sky-events'
import { ORIONIDS_FRAGMENT_GOAL, ORIONIDS_NIGHT_RUN_ID, generateSelfDirectedMiningPool } from './missions'
import { isDebrisEventActive } from './sky-events'
import { localSkyEventWindow } from './sky-event-window'

const local = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h, 0, 0, 0).getTime()

describe('SSL-578 Orionids event', () => {
  it('phases: teaser today, active in window, peak on 21-22 Oct night, ended after', () => {
    expect(orionidsPhase(local(10, 14, 12))).toBe('teaser')
    expect(orionidsPhase(local(10, 19, 12))).toBe('active')
    expect(orionidsPhase(local(10, 21, 23))).toBe('peak')
    expect(orionidsPhase(local(11, 20, 12))).toBe('ended')
  })

  it('drops fragments all day in the window, and still doubles the rate on peak night', () => {
    expect(isDebrisEventActive(ORIONIDS_DEBRIS_PRESET, local(10, 21, 17))).toBe(true)
    expect(isDebrisEventActive(ORIONIDS_DEBRIS_PRESET, local(10, 21, 18))).toBe(true)
    expect(debrisRatePerMinute(ORIONIDS_DEBRIS_PRESET, local(10, 21, 18))).toBeGreaterThan(0)
    expect(isDebrisEventActive(ORIONIDS_DEBRIS_PRESET, local(10, 28, 12))).toBe(true)
    expect(isDebrisEventActive(ORIONIDS_DEBRIS_PRESET, local(10, 18, 12))).toBe(false)
  })

  it('doubles the debris rate on peak night only', () => {
    expect(isOrionidsPeakNight(local(10, 22, 3))).toBe(true)
    expect(isOrionidsPeakNight(local(10, 22, 23))).toBe(false)
    const location = { city: 'Tallinn', latitude: 59, timeZone: 'Europe/Tallinn' }
    const window = localSkyEventWindow({ radiantRightAscensionDeg: 95, radiantDeclinationDeg: 16, peakUtc: ORIONIDS_DEBRIS_PRESET.peakUtc }, location).best!
    const peak = debrisRatePerMinute(ORIONIDS_DEBRIS_PRESET, window.startMs, location)
    expect(peak).toBeGreaterThan(ORIONIDS_DEBRIS_PRESET.peakRatePerMinute)
    expect(peak).toBeLessThanOrEqual(ORIONIDS_DEBRIS_PRESET.peakRatePerMinute * ORIONIDS_PEAK_MULTIPLIER)
    expect(debrisRatePerMinute(ORIONIDS_DEBRIS_PRESET, window.startMs - 60_000, location)).toBeLessThanOrEqual(ORIONIDS_DEBRIS_PRESET.peakRatePerMinute)
  })

  it('puts the Orionids night run on the board only during the window', () => {
    expect(generateSelfDirectedMiningPool(local(10, 14, 12)).some(m => m.id === ORIONIDS_NIGHT_RUN_ID)).toBe(false)
    const run = generateSelfDirectedMiningPool(local(10, 20, 12)).find(m => m.id === ORIONIDS_NIGHT_RUN_ID)
    expect(run?.client).toBeUndefined()
    expect(run?.requires.minerals).toEqual({ orionid_debris: ORIONIDS_FRAGMENT_GOAL })
    expect(run?.targetId).toBe('eros')
    expect(run?.requires.cargo_min).toBe(6)
    expect(run?.title).toBe('Orionids shower run')
    expect(run?.brief).toContain('Launch through the shower')
    expect(run?.payout.francs).toBeGreaterThan(0)
  })

  it('share text names the tier', () => {
    expect(orionidsShareText('gold')).toContain('gold Orionids 2026 badge')
  })

  it('keeps Leonids and Geminids queued until their dates', () => {
    expect(isDebrisEventActive(LEONIDS_DEBRIS_PRESET, local(10, 20, 12))).toBe(false)
    expect(isDebrisEventActive(LEONIDS_DEBRIS_PRESET, Date.parse('2026-11-17T12:00:00Z'))).toBe(true)
    expect(isDebrisEventActive(LEONIDS_DEBRIS_PRESET, Date.parse('2026-11-18T00:00:00Z'))).toBe(false)
    expect(isDebrisEventActive(GEMINIDS_DEBRIS_PRESET, local(11, 17, 12))).toBe(false)
    expect(isDebrisEventActive(GEMINIDS_DEBRIS_PRESET, Date.parse('2026-12-13T12:00:00Z'))).toBe(true)
    expect(isDebrisEventActive(GEMINIDS_DEBRIS_PRESET, Date.parse('2026-12-14T18:00:00Z'))).toBe(true)
    expect(isDebrisEventActive(GEMINIDS_DEBRIS_PRESET, Date.parse('2026-12-15T00:00:00Z'))).toBe(false)
  })

  it('places the one peak reminder at local 22 Oct 02:00', () => {
    expect(orionidsPeakReminderMs()).toBe(local(10, 22, 2))
    expect(ORIONIDS_PEAK_REMINDER.body).toBe("Moon's down — look up. Orionids peak; debris is falling in Landnam.")
  })
})
