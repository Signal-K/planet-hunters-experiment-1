import { describe, expect, it } from 'vitest'
import { rangeCoversTransit, tessLightcurvePoints } from '@/lib/data'
import { dipInView, gainDomain, gainFromSlider, gainLabel, GAIN_MAX, GAIN_MIN, sliderFromGain, TESS_COACH_STEPS, TESS_TRAINING_CANDIDATE } from '@/lib/tess-coach'

describe('TESS coach marks (SSL-359)', () => {
  it('keeps every hint to eight words or fewer', () => {
    for (const step of TESS_COACH_STEPS) {
      expect(step.hint.split(/\s+/).length).toBeLessThanOrEqual(8)
    }
  })

  it('leaves the default gain showing the full curve range', () => {
    expect(gainDomain(0.99, 1.01, GAIN_MAX)).toEqual([0.99, 1.01])
    const [lo, hi] = gainDomain(0.99, 1.01, GAIN_MIN)
    expect(hi - lo).toBeCloseTo(2)
  })

  it('maps the slider logarithmically between the gain limits', () => {
    expect(gainFromSlider(0)).toBeCloseTo(GAIN_MIN)
    expect(gainFromSlider(1)).toBeCloseTo(GAIN_MAX)
    expect(sliderFromGain(gainFromSlider(0.4))).toBeCloseTo(0.4)
    expect(gainLabel(GAIN_MIN)).toBe('×1')
    expect(gainLabel(GAIN_MAX)).toBe('×100')
  })

  it('hides the training dip at minimum gain and shows it once gain is raised', () => {
    const ys = tessLightcurvePoints(TESS_TRAINING_CANDIDATE).map(p => p.y)
    const yMin = Math.min(...ys), yMax = Math.max(...ys)
    expect(dipInView(TESS_TRAINING_CANDIDATE.depthPpm, yMin, yMax, GAIN_MIN)).toBe(false)
    expect(dipInView(TESS_TRAINING_CANDIDATE.depthPpm, yMin, yMax, GAIN_MAX)).toBe(true)
  })

  it('accepts a mark on a training transit and rejects one between transits', () => {
    const { transitEpoch, periodDays } = TESS_TRAINING_CANDIDATE
    const centre = transitEpoch + periodDays
    expect(rangeCoversTransit(TESS_TRAINING_CANDIDATE, { x1: centre - 0.1, x2: centre + 0.1 })).toBe(true)
    const between = centre + periodDays / 2
    expect(rangeCoversTransit(TESS_TRAINING_CANDIDATE, { x1: between - 0.1, x2: between + 0.1 })).toBe(false)
  })
})
