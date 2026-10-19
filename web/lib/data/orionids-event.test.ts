import { describe, expect, it } from 'vitest'
import { ORIONIDS_DEBRIS_PRESET, ORIONIDS_PEAK_MULTIPLIER, ORIONIDS_PEAK_REMINDER, debrisRatePerMinute, isOrionidsPeakNight, orionidsPeakReminderMs, orionidsPhase, orionidsShareText } from './sky-events'
import { ORIONIDS_NIGHT_RUN_ID, generateSelfDirectedMiningPool } from './missions'

const local = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h, 0, 0, 0).getTime()

describe('SSL-578 Orionids event', () => {
  it('phases: teaser today, active in window, peak on 21-22 Oct night, ended after', () => {
    expect(orionidsPhase(local(10, 14, 12))).toBe('teaser')
    expect(orionidsPhase(local(10, 19, 12))).toBe('active')
    expect(orionidsPhase(local(10, 21, 23))).toBe('peak')
    expect(orionidsPhase(local(11, 20, 12))).toBe('ended')
  })

  it('doubles the debris rate on peak night only', () => {
    expect(isOrionidsPeakNight(local(10, 22, 3))).toBe(true)
    expect(isOrionidsPeakNight(local(10, 22, 23))).toBe(false)
    const peak = debrisRatePerMinute(ORIONIDS_DEBRIS_PRESET, local(10, 21, 23))
    expect(peak).toBeGreaterThan(ORIONIDS_DEBRIS_PRESET.peakRatePerMinute)
    expect(peak).toBeLessThanOrEqual(ORIONIDS_DEBRIS_PRESET.peakRatePerMinute * ORIONIDS_PEAK_MULTIPLIER)
    expect(debrisRatePerMinute(ORIONIDS_DEBRIS_PRESET, local(10, 22, 23))).toBeLessThanOrEqual(ORIONIDS_DEBRIS_PRESET.peakRatePerMinute)
  })

  it('puts the Orionids night run on the board only during the window', () => {
    expect(generateSelfDirectedMiningPool(local(10, 14, 12)).some(m => m.id === ORIONIDS_NIGHT_RUN_ID)).toBe(false)
    const run = generateSelfDirectedMiningPool(local(10, 20, 12)).find(m => m.id === ORIONIDS_NIGHT_RUN_ID)
    expect(run?.client).toBeUndefined()
    expect(run?.payout.francs).toBeGreaterThan(0)
  })

  it('share text names the tier', () => {
    expect(orionidsShareText('gold')).toContain('gold Orionids 2026 badge')
  })

  it('places the one peak reminder at local 22 Oct 02:00', () => {
    expect(orionidsPeakReminderMs()).toBe(local(10, 22, 2))
    expect(ORIONIDS_PEAK_REMINDER.body).toBe("Moon's down — look up. Orionids peak; debris is falling in Landnam.")
  })
})
