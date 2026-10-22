import { describe, expect, it } from 'vitest'
import { holdSurveys, isSurveyHeld, isSurveySafeScreen, subscribeSurveyHold, SURVEY_SAFE_SCREENS } from '@/lib/survey-gating'

describe('survey gating allowlist', () => {
  it('allows surveys only on resting screens', () => {
    for (const screen of ['hub', 'missions', 'market', 'hangar', 'skills', 'galaxy', 'refinery', 'instrument-hub']) {
      expect(isSurveySafeScreen(screen)).toBe(true)
    }
  })

  it('blocks surveys on every mid-mission/mid-setup screen', () => {
    // KES-146: a survey popped up over the mining laser button because the
    // gate this allowlist replaced had no screen check at all. These are the
    // screens where a full-screen survey sheet would cover live gameplay.
    for (const screen of ['mining', 'transit', 'targets', 'fab', 'debrief', 'intro']) {
      expect(isSurveySafeScreen(screen)).toBe(false)
    }
  })

  it('is the single source both survey call sites import (no duplicated copy to drift)', () => {
    expect(SURVEY_SAFE_SCREENS.length).toBeGreaterThan(0)
  })
})

// SSL-649: an open Base callout sits above the survey card and can hide its Skip, so the card waits for it.
describe('survey hold for open callouts', () => {
  it('holds until every hold is released, and tells subscribers each time it changes', () => {
    const seen: boolean[] = []
    const unsubscribe = subscribeSurveyHold(() => seen.push(isSurveyHeld()))
    expect(isSurveyHeld()).toBe(false)
    const releaseFirst = holdSurveys()
    const releaseSecond = holdSurveys()
    expect(isSurveyHeld()).toBe(true)
    releaseFirst()
    expect(isSurveyHeld()).toBe(true)
    releaseSecond()
    expect(isSurveyHeld()).toBe(false)
    expect(seen).toEqual([true, true, true, false])
    unsubscribe()
  })

  it('ignores a release that is called twice', () => {
    const release = holdSurveys()
    const other = holdSurveys()
    release()
    release()
    expect(isSurveyHeld()).toBe(true)
    other()
    expect(isSurveyHeld()).toBe(false)
  })
})
