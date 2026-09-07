import { describe, expect, it } from 'vitest'
import { MISSIONS, TARGETS } from '@/lib/data'
import {
  EARTH_BASE_SCOPE,
  deriveSceneScope,
  filterMissionsForSceneScope,
  missionMatchesSceneScope,
} from './scene-scope'

describe('scene scope', () => {
  it('derives an off-world body from target-surface routes', () => {
    expect(deriveSceneScope({
      screen: 'mining',
      targetId: 'mars',
      target: TARGETS.find(target => target.id === 'mars'),
    })).toEqual({ kind: 'body', id: 'mars', label: 'Mars' })
  })

  it('keeps Earth Base as the scope for menu and mission setup routes', () => {
    expect(deriveSceneScope({ screen: 'missions', targetId: 'mars' })).toEqual(EARTH_BASE_SCOPE)
    expect(deriveSceneScope({ screen: 'hub', targetId: null })).toEqual(EARTH_BASE_SCOPE)
  })

  it('matches a fixed-target mission only at its pickup body', () => {
    const mission = MISSIONS.find(candidate => candidate.targetId === 'bennu')
    expect(mission).toBeDefined()
    expect(missionMatchesSceneScope(mission!, { kind: 'body', id: 'bennu', label: '101955 Bennu' }, TARGETS)).toBe(true)
    expect(missionMatchesSceneScope(mission!, { kind: 'body', id: 'vesta', label: '4 Vesta' }, TARGETS)).toBe(false)
  })

  it('does not narrow onboarding, even when a body scope is present', () => {
    const onboarding = MISSIONS.filter(mission => mission.sequence === 1)
    expect(filterMissionsForSceneScope(onboarding, { kind: 'body', id: 'mars', label: 'Mars' }, TARGETS, true)).toEqual(onboarding)
  })
})
