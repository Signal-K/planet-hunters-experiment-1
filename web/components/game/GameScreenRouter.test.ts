import { describe, expect, it } from 'vitest'
import { VALID_SCREENS } from './GameScreenRouter'

describe('game screen routes', () => {
  it('reaches the Earth Base subsurface only through the Hub slide, not a route', () => {
    expect((VALID_SCREENS as ReadonlySet<string>).has('hub-subsurface')).toBe(false)
    expect(VALID_SCREENS.has('mission-history')).toBe(true)
    expect(VALID_SCREENS.has('narrative-ledger')).toBe(true)
    expect(VALID_SCREENS.has('instrument-hub')).toBe(true)
  })
})
