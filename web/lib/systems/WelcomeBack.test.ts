import { describe, expect, it } from 'vitest'
import { wasAway, welcomeBackRows, withWelcomeBack, WELCOME_BACK_AWAY_MS } from './WelcomeBack'

describe('welcome back', () => {
  it('needs 4 hours away', () => {
    expect(wasAway(undefined, 1e9)).toBe(false)
    expect(wasAway(1e9 - WELCOME_BACK_AWAY_MS + 1, 1e9)).toBe(false)
    expect(wasAway(1e9 - WELCOME_BACK_AWAY_MS, 1e9)).toBe(true)
  })
  it('lists one row per source', () => {
    const rows = welcomeBackRows(
      { fromDate: '2026-10-24', toDate: '2026-10-27', idempotencyKey: 'k', moves: [{ materialId: 'n', materialName: 'Nickel', changePct: 11 }], levelUps: [] },
      { since: 1, built: ['refinery'], digest: 3, gifts: 1 },
    )
    expect(rows.map(r => r.id)).toEqual(['market', 'instrument', 'construction', 'gift'])
    expect(rows[1].text).toBe('3 new telescope items to review')
  })
  it('is empty when nothing happened', () => {
    expect(welcomeBackRows(undefined, { since: 1 })).toEqual([])
  })
  it('merges sources for the same visit only', () => {
    const a = withWelcomeBack(undefined, 1, { digest: 2 })
    expect(withWelcomeBack(a, 1, { gifts: 1 })).toEqual({ since: 1, digest: 2, gifts: 1 })
    expect(withWelcomeBack(a, 2, { gifts: 1 })).toEqual({ since: 2, gifts: 1 })
  })
})
