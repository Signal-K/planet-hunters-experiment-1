import { describe, expect, it } from 'vitest'
import { VALID_SCREENS } from './GameScreenRouter'

describe('game screen routes', () => {
  it('keeps the Earth Base subsurface destination addressable', () => {
    expect(VALID_SCREENS.has('hub-subsurface')).toBe(true)
  })
})
