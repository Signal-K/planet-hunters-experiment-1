import { describe, expect, it } from 'vitest'
import { takeOnViewportSize } from './TakeOnMount'

describe('TakeOnMount viewport coordinates', () => {
  it('uses CSS dimensions rather than the Pixi backing buffer', () => {
    expect(takeOnViewportSize({ clientWidth: 390, clientHeight: 844 })).toEqual({ width: 390, height: 844 })
  })

  it('has a usable fallback before layout has measured the canvas', () => {
    expect(takeOnViewportSize({ clientWidth: 0, clientHeight: 0 })).toEqual({ width: 800, height: 600 })
  })
})
