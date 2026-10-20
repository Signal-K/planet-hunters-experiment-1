import { describe, expect, it } from 'vitest'
import {
  LOOKED_UP_BADGE_ID,
  LOOKED_UP_RESEARCH_XP,
  grantLookedUp,
  isAtlasLookedUp,
} from './looked-up'

const row = { event_id: 'orionids-2026', subject_id: 'check-in', marker: 'after-moonset', tier: 'gold', earned_at: 10 }

describe('Atlas looked up', () => {
  it('matches only the Atlas check-in row', () => {
    expect(isAtlasLookedUp(row)).toBe(true)
    expect(isAtlasLookedUp({ ...row, subject_id: 'looked-up' })).toBe(false)
    expect(isAtlasLookedUp({ ...row, marker: 'orionids-found' })).toBe(false)
  })

  it('grants research and a badge once', () => {
    const first = grantLookedUp({ researchXP: 0, badges: {} as Record<string, { eventId: string; tier: 'gold' | 'silver'; earnedAt: number }>, orionidsLookedUpAt: null }, 10, 'gold')
    expect(first.badges?.[LOOKED_UP_BADGE_ID]).toMatchObject({ tier: 'gold', earnedAt: 10 })
    expect(first.researchXP).toBe(LOOKED_UP_RESEARCH_XP)
    expect(first.orionidsLookedUpAt).toBe(10)
    expect(grantLookedUp(first, 20, 'silver')).toBe(first)
  })
})
