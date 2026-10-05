import { describe, expect, it } from 'vitest'
import { canonicalGamePath, canonicalGameRoute } from './game-route'

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

describe('trayScreenFromPath', () => {
  it('keeps Market and Subsurface on a cold load, nothing else', async () => {
    const { trayScreenFromPath } = await import('./game-route')
    expect(trayScreenFromPath('/game/market')).toBe('market')
    expect(trayScreenFromPath('/game/hub-subsurface/')).toBe('hub-subsurface')
    expect(trayScreenFromPath('/game/mission-history')).toBe('mission-history')
    expect(trayScreenFromPath('/game/missions')).toBeNull()
    expect(trayScreenFromPath('/game/hub')).toBeNull()
  })
})
