import { describe, expect, it } from 'vitest'
import { LASER_PALETTES } from './laserPalette'
import { crateFile, cratePlan, groundColor, isForbiddenHue, skyColor, surfaceRatio } from './destinationVista'

describe('destination vista', () => {
  it('pulls orange, yellow, green and purple skies toward blue', () => {
    for (const palette of Object.values(LASER_PALETTES)) {
      expect(isForbiddenHue(skyColor(palette.skyTop))).toBe(false)
      expect(isForbiddenHue(skyColor(palette.skyHorizon))).toBe(false)
      expect(isForbiddenHue(groundColor(palette.landscape?.tint))).toBe(false)
    }
  })

  it('maps hauled minerals onto the exchange crate slices', () => {
    expect(crateFile('platinum')).toBe('exchange-crate-4-platinum.png')
    expect(crateFile('iron')).toBe('exchange-crate-1-iron.png')
    expect(crateFile('nickel')).toBe('exchange-crate-2-nickel.png')
    expect(crateFile('ice')).toBe('exchange-crate-6-ice.png')
    expect(cratePlan([{ id: 'platinum', units: 5 }, { id: 'iron', units: 0 }])).toEqual([
      { file: 'exchange-crate-4-platinum.png', count: 5 },
    ])
  })

  it('keeps portrait ground high enough that crates sit above the cards', () => {
    expect(surfaceRatio(390, 844, 'scene')).toBeLessThan(0.5)
    expect(surfaceRatio(844, 390, 'scene')).toBeGreaterThan(0.5)
    expect(surfaceRatio(1440, 900, 'card')).toBeGreaterThan(0.5)
  })
})