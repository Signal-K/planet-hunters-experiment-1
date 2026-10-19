import { describe, expect, it } from 'vitest'
import { grantOrionidsPlanetFind, pocketBaseId, reconcileOrionidsFinds, syncSpacetoberSet, type FindPlayer } from './finds'

const none: FindPlayer = {}

const during = new Date(2026, 9, 20, 12).getTime()
const before = new Date(2026, 9, 18, 23).getTime()
const after = new Date(2026, 10, 9, 12).getTime()

describe('Orionids planet finds', () => {
  it('marks a planet found in the window gold and grants mastery 1 once', () => {
    const first = grantOrionidsPlanetFind(none, { subjectId: 'toi-1', targetId: 'toi-1', name: 'TOI 1', at: during })
    expect(first.granted).toMatchObject({ marker: 'orionids-found', voucher: 'owned', tier: 'gold', name: 'TOI 1' })
    expect(first.masteryGranted).toBe(true)
    expect(first.player.meteoriteMastery).toBe(1)
    expect(first.player.badges?.['spacetober-2026-peak']?.tier).toBe('gold')
    const second = grantOrionidsPlanetFind(first.player, { subjectId: 'toi-1', name: 'TOI 1', at: during })
    expect(second.granted).toBeNull()
    expect(second.masteryGranted).toBe(false)
    const other = grantOrionidsPlanetFind(first.player, { subjectId: 'toi-2', name: 'TOI 2', at: during })
    expect(other.granted?.tier).toBe('gold')
    expect(other.masteryGranted).toBe(false)
    expect(other.player.meteoriteMastery).toBe(1)
  })

  it('gives silver after the window and nothing before it', () => {
    expect(grantOrionidsPlanetFind(none, { subjectId: 'toi-1', at: before }).granted).toBeNull()
    const late = grantOrionidsPlanetFind(none, { subjectId: 'toi-1', name: 'TOI 1', at: after })
    expect(late.granted?.tier).toBe('silver')
    expect(late.player.meteoriteMastery).toBe(1)
    const upgraded = grantOrionidsPlanetFind(late.player, { subjectId: 'toi-1', name: 'TOI 1', at: during })
    expect(upgraded.granted?.tier).toBe('gold')
  })

  it('ignores the training candidate and backfills a saved planet classification', () => {
    expect(grantOrionidsPlanetFind(none, { subjectId: 'training-tess-toi-7001', at: during }).granted).toBeNull()
    const player = reconcileOrionidsFinds({
      badges: { 'draconids-2026': { eventId: 'draconids-2026', tier: 'silver', earnedAt: 1 } },
      tessClassifications: {
        'toi-9': { subjectId: 'toi-9', verdict: 'planet', submittedAt: during },
        'toi-8': { subjectId: 'toi-8', verdict: 'unsure', submittedAt: during },
      },
      discoveredExoplanetTargets: { 'toi-9': { id: 'toi-9', name: 'TOI 9' } },
    })
    expect(player.orionidsFinds?.['toi-9']).toMatchObject({ name: 'TOI 9', tier: 'gold', voucher: 'owned' })
    expect(player.orionidsFinds?.['toi-8']).toBeUndefined()
    expect(player.badges?.['spacetober-2026-week']?.tier).toBe('silver')
    expect(player.meteoriteMastery).toBe(1)
  })

  it('keeps a stable PocketBase id', () => {
    expect(pocketBaseId('event_badges:user:orionids-2026:toi-1')).toMatch(/^[a-z0-9]{15}$/)
    expect(pocketBaseId('same')).toBe(pocketBaseId('same'))
  })

  it('does not invent a week badge the player has not earned', () => {
    expect(syncSpacetoberSet(none).badges?.['spacetober-2026-week']).toBeUndefined()
  })
})
