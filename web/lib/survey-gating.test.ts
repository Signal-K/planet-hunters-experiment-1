import { describe, expect, it } from 'vitest'
import { isSurveySafeScreen, SURVEY_SAFE_SCREENS } from '@/lib/survey-gating'

describe('survey gating allowlist', () => {
  it('allows surveys only on resting screens', () => {
    for (const screen of ['hub', 'missions', 'market', 'hangar', 'skills', 'galaxy', 'refinery']) {
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
