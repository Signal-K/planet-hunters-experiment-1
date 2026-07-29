import { describe, it, expect } from 'vitest'
import {
  ACADEMY_XP_CURVE,
  CREW_XP_CURVE,
  RESEARCH_XP_CURVE,
  XP_CURVES,
  grantCrossesLevel,
  grantXP,
  isValidCurve,
  levelForXP,
  xpProgress,
  type XPCurve,
} from './XPSystem'
import { LICENSE_GRADE_ORDER, LICENSE_GRADE_XP_GATES } from './ProgressionSystem'

const CURVE: XPCurve = { id: 'test', thresholds: [0, 100, 300] }

describe('curve invariants', () => {
  it.each(XP_CURVES.map(c => [c.id, c] as const))('%s is a valid curve', (_id, curve) => {
    expect(isValidCurve(curve)).toBe(true)
  })

  it('rejects a curve that does not start at zero', () => {
    expect(isValidCurve({ id: 'bad', thresholds: [10, 20] })).toBe(false)
  })

  it('rejects a curve that is not strictly increasing', () => {
    expect(isValidCurve({ id: 'bad', thresholds: [0, 100, 100] })).toBe(false)
  })
})

describe('levelForXP', () => {
  it('starts at level 1 with no XP', () => {
    expect(levelForXP(0, CURVE)).toBe(1)
  })

  it('levels exactly on the threshold, not one past it', () => {
    expect(levelForXP(99, CURVE)).toBe(1)
    expect(levelForXP(100, CURVE)).toBe(2)
  })

  it('caps at the top of the curve rather than running off the end', () => {
    expect(levelForXP(9_999_999, CURVE)).toBe(3)
  })

  it('treats negative and non-finite XP as zero rather than throwing', () => {
    expect(levelForXP(-50, CURVE)).toBe(1)
    expect(levelForXP(Number.NaN, CURVE)).toBe(1)
  })
})

describe('xpProgress', () => {
  it('reports position within the current level', () => {
    expect(xpProgress(150, CURVE)).toMatchObject({
      level: 2, maxLevel: 3, xp: 150, xpIntoLevel: 50, xpToNextLevel: 150, atMax: false,
    })
    expect(xpProgress(150, CURVE).fraction).toBeCloseTo(0.25)
  })

  it('reports a full bar and no next level at the cap', () => {
    expect(xpProgress(400, CURVE)).toMatchObject({ level: 3, xpToNextLevel: null, fraction: 1, atMax: true })
  })
})

describe('grantXP', () => {
  it('adds XP', () => {
    expect(grantXP({ xp: 10 }, 5).xp).toBe(15)
  })

  it('returns the same reference for a no-op grant, so callers can skip a re-render', () => {
    const bearer = { xp: 10 }
    expect(grantXP(bearer, 0)).toBe(bearer)
    expect(grantXP(bearer, -5)).toBe(bearer)
    expect(grantXP(bearer, Number.NaN)).toBe(bearer)
  })

  it('preserves the rest of the bearer', () => {
    expect(grantXP({ xp: 1, name: 'Vera Novak' }, 9)).toEqual({ xp: 10, name: 'Vera Novak' })
  })

  it('repairs a corrupt stored xp instead of propagating it', () => {
    expect(grantXP({ xp: -100 }, 10).xp).toBe(10)
  })
})

describe('grantCrossesLevel', () => {
  it('is true only when the grant pushes past a threshold', () => {
    expect(grantCrossesLevel(90, 5, CURVE)).toBe(false)
    expect(grantCrossesLevel(90, 10, CURVE)).toBe(true)
  })

  it('is false for a no-op grant', () => {
    expect(grantCrossesLevel(90, 0, CURVE)).toBe(false)
  })
})

// The whole point of the primitive is that the tracks are the same mechanism.
// If someone retunes the licence gates without updating the curve, this fails.
describe('RESEARCH_XP_CURVE matches the shipped licence-grade gates', () => {
  it('has one level per grade, at the same XP', () => {
    expect(RESEARCH_XP_CURVE.thresholds).toEqual(LICENSE_GRADE_ORDER.map(g => LICENSE_GRADE_XP_GATES[g]))
  })

  it('resolves a research XP total to the same grade the gates would', () => {
    for (const xp of [0, 1, 149, 150, 499, 500, 5000]) {
      const expected = [...LICENSE_GRADE_ORDER].reverse().find(g => xp >= LICENSE_GRADE_XP_GATES[g])
      expect(LICENSE_GRADE_ORDER[levelForXP(xp, RESEARCH_XP_CURVE) - 1]).toBe(expected)
    }
  })
})

describe('shipped curves', () => {
  it('puts a hire (level 3) early on the crew ladder, not past most of it', () => {
    const hireXP = CREW_XP_CURVE.thresholds[2]
    const capXP = CREW_XP_CURVE.thresholds[CREW_XP_CURVE.thresholds.length - 1]
    expect(hireXP / capXP).toBeLessThan(0.1)
  })

  it('gives the academy a real but short ladder', () => {
    expect(ACADEMY_XP_CURVE.thresholds).toHaveLength(3)
  })
})
