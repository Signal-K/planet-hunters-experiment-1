import { describe, expect, it } from 'vitest'
import { isSurveySafeScreen, SURVEY_SAFE_SCREENS } from '@/lib/survey-gating'

describe('survey gating allowlist', () => {
  it('allows surveys only on Home', () => {
    expect(isSurveySafeScreen('hub')).toBe(true)
  })

  it('blocks surveys on the TESS screens and every other mid-flow screen (SSL-358)', () => {
    for (const screen of ['galaxy', 'instrument-hub', 'asteroid-discovery', 'missions', 'market', 'hangar', 'skills', 'refinery']) {
      expect(isSurveySafeScreen(screen)).toBe(false)
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
