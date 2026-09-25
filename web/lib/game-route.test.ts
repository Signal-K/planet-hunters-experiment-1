import { describe, expect, it } from 'vitest'
import { canonicalGamePath, canonicalGameRoute, shouldPushGamePath } from './game-route'

describe('canonical mission setup route', () => {
  it.each(['missions', 'targets', 'rocket-buy'] as const)(
    'keeps the %s step on the single missions route',
    screen => {
      expect(canonicalGamePath({ screen, missionId: 'mission-1', targetId: 'eros' }))
        .toBe('/game/missions')
    },
  )

  it('keeps mission preflight on the missions route', () => {
    expect(canonicalGameRoute({ screen: 'fab', missionId: 'mission-1', targetId: 'eros' }))
      .toBe('missions')
  })

  it('preserves the separate bare Free Ops build route', () => {
    expect(canonicalGameRoute({ screen: 'fab', missionId: null, targetId: null }))
      .toBe('fab')
  })

  it('preserves routes outside mission creation', () => {
    expect(canonicalGameRoute({ screen: 'mining', missionId: 'mission-1', targetId: 'eros' }))
      .toBe('mining')
  })
})

describe('state to URL sync', () => {
  it('pushes when the screen moved away from the current URL', () => {
    expect(shouldPushGamePath('/game/hub', '/game/mining', null)).toBe(true)
  })

  it('does not push when the URL already shows the screen', () => {
    expect(shouldPushGamePath('/game/hub', '/game/hub', '/game/hub')).toBe(false)
  })

  it('pushes a newer screen even though an older push has not committed yet', () => {
    // Back pushed /game/hub; before it commits the URL still reads
    // /game/mining, and Resume returns the state to mining.
    expect(shouldPushGamePath('/game/mining', '/game/mining', '/game/hub')).toBe(true)
  })

  it('does not push again once the in-flight push has committed', () => {
    expect(shouldPushGamePath('/game/mining', '/game/mining', '/game/mining')).toBe(false)
  })
})
