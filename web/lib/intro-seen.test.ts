// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { hasProgress, hasSeenIntro, INTRO_SEEN_STORAGE_KEY, markIntroSeen } from './intro-seen'

describe('intro seen flag', () => {
  beforeEach(() => window.localStorage.clear())

  it('is unseen until the player begins', () => {
    expect(hasSeenIntro()).toBe(false)
    markIntroSeen()
    expect(hasSeenIntro()).toBe(true)
    expect(window.localStorage.getItem(INTRO_SEEN_STORAGE_KEY)).toBe('1')
  })

  it('treats any progress as past the intro', () => {
    expect(hasProgress({ missionsDone: 0, placed: [] })).toBe(false)
    expect(hasProgress({ missionsDone: 1, placed: [] })).toBe(true)
    expect(hasProgress({ missionsDone: 0, placed: ['launchpad'] })).toBe(true)
  })
})
