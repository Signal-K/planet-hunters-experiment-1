import { describe, expect, it } from 'vitest'
import { fragmentsCaughtOnLaunch, LAUNCH_CATCH_BASE } from './launch-catch'
import { ORIONIDS_PEAK_MULTIPLIER } from '@/lib/data/sky-events'

const local = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h, 0, 0, 0).getTime()

describe('launch fragment catch', () => {
  it('catches on the way up at any hour inside the window', () => {
    expect(fragmentsCaughtOnLaunch(local(10, 20, 12))).toBe(LAUNCH_CATCH_BASE)
    expect(fragmentsCaughtOnLaunch(local(10, 28, 15))).toBe(LAUNCH_CATCH_BASE)
    expect(fragmentsCaughtOnLaunch(local(10, 19, 0))).toBe(LAUNCH_CATCH_BASE)
  })

  it('doubles the catch on peak night and is quiet outside the window', () => {
    expect(fragmentsCaughtOnLaunch(local(10, 21, 23))).toBe(LAUNCH_CATCH_BASE * ORIONIDS_PEAK_MULTIPLIER)
    expect(fragmentsCaughtOnLaunch(local(10, 22, 2))).toBe(LAUNCH_CATCH_BASE * ORIONIDS_PEAK_MULTIPLIER)
    expect(fragmentsCaughtOnLaunch(local(10, 18, 23))).toBe(0)
    expect(fragmentsCaughtOnLaunch(local(11, 12, 12))).toBe(0)
  })
})
