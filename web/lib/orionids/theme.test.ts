import { describe, expect, it } from 'vitest'
import {
  fallFrameIndex,
  landFrameIndex,
  miningCanvasIsDark,
  MINING_CANVAS_SKY,
  orionidsVariantForSurface,
  ORIONIDS_VARIANTS,
} from './theme'

describe('mining canvas variant', () => {
  it('treats the current paper sky as blueprint', () => {
    expect(miningCanvasIsDark(MINING_CANVAS_SKY)).toBe(false)
    expect(orionidsVariantForSurface('mining')).toBe('blueprint')
  })

  it('uses the dark set when the canvas sky is dark', () => {
    expect(miningCanvasIsDark(0x1a1a1d)).toBe(true)
    expect(miningCanvasIsDark(0x050d1f)).toBe(true)
  })

  it('uses the dark set on Base, where the hub sky is dusk navy', () => {
    expect(orionidsVariantForSurface('base')).toBe('dark')
  })

  it('points each set at its own chip, sky, and mined swap', () => {
    expect(ORIONIDS_VARIANTS.blueprint.chipOn).toContain('chip-orionids-active.png')
    expect(ORIONIDS_VARIANTS.blueprint.skyBlend).toBe('multiply')
    expect(ORIONIDS_VARIANTS.blueprint.mined[0].file).toContain('mined-light')
    expect(ORIONIDS_VARIANTS.dark.skyBlend).toBe('screen')
    expect(ORIONIDS_VARIANTS.dark.streakBlend).toBe('screen')
    expect(ORIONIDS_VARIANTS.dark.debris).toHaveLength(4)
    expect(ORIONIDS_VARIANTS.blueprint.fallFrame.fallCount).toBe(6)
  })
})

describe('sheet playback', () => {
  it('loops the fall clip and holds still when motion is reduced', () => {
    expect(fallFrameIndex(0, 24, 6, false)).toBe(0)
    expect(fallFrameIndex(5 / 24, 24, 6, false)).toBe(5)
    expect(fallFrameIndex(6 / 24, 24, 6, false)).toBe(0)
    expect(fallFrameIndex(3, 24, 6, true)).toBe(0)
  })

  it('plays the two land frames once', () => {
    expect(landFrameIndex(0, 24, false)).toEqual({ frame: 6, done: false })
    expect(landFrameIndex(1 / 24, 24, false)).toEqual({ frame: 7, done: false })
    expect(landFrameIndex(2 / 24, 24, false)).toEqual({ frame: 7, done: true })
    expect(landFrameIndex(0, 24, true)).toEqual({ frame: 7, done: true })
  })
})
