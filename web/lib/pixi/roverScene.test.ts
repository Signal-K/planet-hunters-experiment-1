import { describe, expect, it } from 'vitest'
import { ROVER_SPRITE_SCALE, ROVER_SPRITE_SRC, roverSpritePlacement } from './roverScene'

describe('rover sprite presentation', () => {
  it('uses the committed Blender rover asset at its authored three-times supersample scale', () => {
    expect(ROVER_SPRITE_SRC).toBe('/game/assets/actors/rover.png')
    expect(ROVER_SPRITE_SCALE).toBe(1 / 3)
  })

  it('grounds a stationary rover on the surface without a directional flip', () => {
    expect(roverSpritePlacement(120, 80, 0, 0)).toEqual({
      x: 120,
      y: 94,
      scaleX: 1 / 3,
      scaleY: 1 / 3,
    })
  })

  it('adds motion bob and mirrors the asset only while reversing', () => {
    const forward = roverSpritePlacement(120, 80, 0.5, 1)
    const reverse = roverSpritePlacement(120, 80, -0.5, 1)

    expect(forward.y).not.toBe(94)
    expect(forward.scaleX).toBe(1 / 3)
    expect(reverse.scaleX).toBe(-1 / 3)
    expect(reverse.y).toBe(forward.y)
  })
})
